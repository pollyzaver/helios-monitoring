from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import httpx
import math
import random
from datetime import datetime
from typing import List, Dict

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Состояние Data Logger
datalogger_connected = False

# Координаты Афин
GREECE_LAT = 37.9838
GREECE_LON = 23.7275

async def get_temperature() -> float:
    """Получает реальную температуру в Греции"""
    try:
        async with httpx.AsyncClient() as client:
            url = "https://api.open-meteo.com/v1/forecast"
            params = {
                "latitude": GREECE_LAT,
                "longitude": GREECE_LON,
                "current": "temperature_2m"
            }
            response = await client.get(url, params=params, timeout=10)
            data = response.json()
            return data["current"]["temperature_2m"]
    except:
        # Запасной вариант
        hour = datetime.now().hour
        if 6 <= hour <= 18:
            return 20 + 10 * math.sin(math.pi * (hour - 6) / 12)
        return 15

def calculate_power(panel_id: int, hour: float, temp: float) -> float:
    """Расчёт мощности панели"""
    # Дневной фактор
    if 6 <= hour <= 18:
        day_factor = math.sin(math.pi * (hour - 6) / 12)
    else:
        day_factor = 0
    
    # Температурные потери (0.4% на градус выше 25)
    temp_loss = max(0, 1 - (temp - 25) * 0.004)
    
    # Индивидуальный разброс панели
    panel_bias = 0.85 + (panel_id % 30) / 100.0
    
    # Случайная облачность
    clouds = random.uniform(0.6, 1.0)
    
    power = 400 * day_factor * temp_loss * panel_bias * clouds
    return max(0, round(power, 1))

@app.get("/api/status")
async def get_status():
    return {"connected": datalogger_connected}

@app.post("/api/connect")
async def connect():
    global datalogger_connected
    datalogger_connected = True
    return {"connected": True}

@app.post("/api/disconnect")
async def disconnect():
    global datalogger_connected
    datalogger_connected = False
    return {"connected": False}

@app.get("/api/data")
async def get_data():
    if not datalogger_connected:
        return {"connected": False, "panels": []}
    
    temp = await get_temperature()
    now = datetime.now()
    hour = now.hour + now.minute / 60.0
    
    panels = []
    for panel_id in range(1, 51):
        power = calculate_power(panel_id, hour, temp)
        panels.append({
            "id": panel_id,
            "power": power,
            "temperature": round(temp + (power / 400) * 15, 1),
            "status": "alarm" if power < 50 else "warning" if power < 150 else "normal"
        })
    
    total_power = sum(p["power"] for p in panels)
    
    return {
        "connected": True,
        "panels": panels,
        "total_power": round(total_power / 1000, 2),
        "temperature": temp,
        "alerts": len([p for p in panels if p["status"] == "alarm"])
    }
