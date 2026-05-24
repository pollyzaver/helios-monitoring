import httpx
import math
import random
from datetime import datetime
from typing import Tuple, Dict, List

# Константы
GREECE_LAT = 37.9838
GREECE_LON = 23.7275
NUM_PANELS = 50
MAX_POWER_W = 400

# Состояние Data Logger
datalogger_connected = False
test_mode_enabled = False
test_hour = 12

async def get_temperature() -> float:
    """Получение реальной температуры воздуха в Греции"""
    try:
        async with httpx.AsyncClient() as client:
            url = "https://api.open-meteo.com/v1/forecast"
            params = {
                "latitude": GREECE_LAT,
                "longitude": GREECE_LON,
                "current": "temperature_2m",
                "timezone": "Europe/Athens"
            }
            response = await client.get(url, params=params, timeout=10.0)
            response.raise_for_status()
            data = response.json()
            temp = data["current"]["temperature_2m"]
            print(f"[SIMULATOR] Real temperature: {temp}°C")
            return float(temp)
    except Exception as e:
        print(f"[SIMULATOR] API error: {e}, using fallback")
        hour = datetime.now().hour
        if 6 <= hour <= 18:
            temp = 25 + 10 * math.sin(math.pi * (hour - 6) / 12)
        else:
            temp = 18
        return temp

def calculate_power(panel_id: int, hour: float, temp: float) -> Tuple[float, float, str, Dict]:
    """Расчёт мощности панели"""
    # Дневной фактор
    if 6 <= hour <= 18:
        if hour <= 12:
            day_factor = (hour - 6) / 6
        else:
            day_factor = (18 - hour) / 6
        day_factor = max(0, min(1, day_factor))
        is_daytime = True
    else:
        day_factor = 0
        is_daytime = False
    
    # Температурные потери
    temp_loss = 1 - max(0, (temp - 25) * 0.004)
    temp_loss = max(0.7, temp_loss)
    
    # Индивидуальный разброс
    panel_bias = 0.85 + (panel_id % 30) / 100.0
    clouds = random.uniform(0.7, 1.0)
    noise = random.uniform(0.95, 1.05)
    
    power = MAX_POWER_W * day_factor * temp_loss * panel_bias * clouds * noise
    power = max(0, round(power, 1))
    
    # Температура панели
    panel_temp = round(temp + (power / MAX_POWER_W) * 15, 1)
    
    # Статус и алерты
    status = "normal"
    alert_info = None
    
    if is_daytime and day_factor > 0.2:
        if power < 30:
            status = "alarm"
            alert_info = {"type": "power_failure", "severity": "critical", "message": f"Критическое падение мощности: {power} Вт"}
        elif power < 100:
            status = "warning"
            alert_info = {"type": "low_power", "severity": "warning", "message": f"Низкая мощность: {power} Вт"}
        elif panel_temp > 75:
            status = "alarm"
            alert_info = {"type": "overheat", "severity": "critical", "message": f"Перегрев: {panel_temp}°C"}
        elif panel_temp > 65:
            status = "warning"
            alert_info = {"type": "overheat", "severity": "warning", "message": f"Высокая температура: {panel_temp}°C"}
        
        # Случайные события (2% шанс)
        if random.random() < 0.02 and alert_info is None:
            alert_info = {"type": "fluctuation", "severity": "warning", "message": "Нестабильная выработка"}
    
    return power, panel_temp, status, alert_info

def generate_panels_data(temperature: float) -> tuple:
    """Генерирует данные для всех панелей"""
    now = datetime.now()
    hour = now.hour + now.minute / 60.0
    
    if test_mode_enabled:
        hour = test_hour
    
    panels = []
    alerts = []
    
    for panel_id in range(1, NUM_PANELS + 1):
        power, panel_temp, status, alert_info = calculate_power(panel_id, hour, temperature)
        
        panels.append({
            "id": panel_id,
            "power": power,
            "temperature": panel_temp,
            "status": status
        })
        
        if alert_info:
            alerts.append({
                "panel_id": panel_id,
                "type": alert_info["type"],
                "severity": alert_info["severity"],
                "message": alert_info["message"],
                "power": power,
                "temperature": panel_temp
            })
    
    return panels, alerts

def set_test_mode(enabled: bool):
    global test_mode_enabled
    test_mode_enabled = enabled

def set_datalogger_connection(connected: bool):
    global datalogger_connected
    datalogger_connected = connected

def is_datalogger_connected() -> bool:
    return datalogger_connected
