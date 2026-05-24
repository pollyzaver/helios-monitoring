from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, EmailStr
from app.database import Measurement
from typing import Optional, List
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
import jwt
from fastapi import WebSocket, WebSocketDisconnect
import asyncio
import traceback

from app.database import init_db, get_db, User as DBUser
from app.user_service import (
    get_user_by_email, create_user, update_user_profile, update_user_thresholds, simple_hash
)
from app.user_service import (
    get_user_by_email, create_user, update_user_profile, update_user_thresholds, 
    simple_hash, get_all_users
)
from app.simulator import (
    get_temperature, generate_panels_data, set_datalogger_connection, 
    is_datalogger_connected, set_test_mode
)
from app.measurement_service import save_measurement, get_daily_energy, get_latest_measurements, get_park_history

# Фоновый сборщик данных
background_task = None
is_running = False

app = FastAPI(title="Helios API", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

init_db()

SECRET_KEY = "helios-super-secret-key-2024-must-be-at-least-32-bytes-long"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7

security = HTTPBearer()

# ========== WEBSOCKET MANAGER ==========
class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
        print(f"[WS] Client connected. Total: {len(self.active_connections)}")

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
        print(f"[WS] Client disconnected. Total: {len(self.active_connections)}")

    async def broadcast(self, message: dict):
        for connection in self.active_connections:
            try:
                await connection.send_json(message)
            except Exception as e:
                print(f"[WS] Broadcast error: {e}")

manager = ConnectionManager()

# ========== ФОНОВЫЙ СБОРЩИК ДАННЫХ ==========
async def collect_and_save_data():
    """Одноразовый сбор и сохранение данных с уведомлением клиентов"""
    try:
        temp = await get_temperature()
        panels, _ = generate_panels_data(temp)
        
        from app.database import SessionLocal
        from app.measurement_service import save_measurement
        from app.user_service import get_all_users
        
        db = SessionLocal()
        try:
            # Получаем всех пользователей
            users = db.query(DBUser).all()
            
            for user in users:
                for panel in panels:
                    energy = (panel["power"] / 1000) * 0.25
                    save_measurement(db, user.id, panel["id"], panel["power"], 
                                    panel["temperature"], panel["status"], energy)
            
            print(f"[BACKGROUND] Saved {len(panels)} measurements for {len(users)} users at {datetime.now().strftime('%H:%M:%S')}")
            
            # Отправляем уведомление всем клиентам
            await manager.broadcast({
                "type": "new_data",
                "timestamp": datetime.now().isoformat(),
                "panels_count": len(panels)
            })
            
        finally:
            db.close()
    except Exception as e:
        print(f"[BACKGROUND] Error: {e}")
        traceback.print_exc()

async def background_data_collector():
    """Фоновый процесс, который собирает данные независимо от пользователей"""
    global is_running
    is_running = True
    print("[BACKGROUND] Data collector started")
    
    # Сразу собираем данные при запуске
    await collect_and_save_data()
    
    while is_running:
        await asyncio.sleep(900)  # 15 минут
        await collect_and_save_data()

# ========== АВТОРИЗАЦИЯ ==========
def create_access_token(data: dict) -> str:
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    data.update({"exp": expire})
    return jwt.encode(data, SECRET_KEY, algorithm=ALGORITHM)

def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
):
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        email = payload.get("sub")
        user = get_user_by_email(db, email)
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        return user
    except:
        raise HTTPException(status_code=401, detail="Invalid token")
    
def get_current_admin(current_user: DBUser = Depends(get_current_user)):
    """Проверяет, что текущий пользователь - администратор"""
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return current_user

class UserRegister(BaseModel):
    email: EmailStr
    full_name: str
    password: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserProfileUpdate(BaseModel):
    full_name: Optional[str] = None
    company: Optional[str] = None
    phone: Optional[str] = None
    telegram_chat_id: Optional[str] = None
    notifications_enabled: Optional[bool] = None

class ThresholdUpdate(BaseModel):
    power_warning: Optional[int] = None
    power_alarm: Optional[int] = None
    temp_warning: Optional[int] = None
    temp_alarm: Optional[int] = None

@app.post("/api/auth/register")
async def register(user_data: UserRegister, db: Session = Depends(get_db)):
    if get_user_by_email(db, user_data.email):
        raise HTTPException(status_code=400, detail="Email already registered")
    
    user = create_user(db, user_data.email, user_data.full_name, user_data.password)
    token = create_access_token({"sub": user.email, "role": user.role})
    
    return {"access_token": token, "token_type": "bearer", "user": {"id": user.id, "email": user.email, "full_name": user.full_name, "role": user.role}}

@app.post("/api/auth/login")
async def login(user_data: UserLogin, db: Session = Depends(get_db)):
    user = get_user_by_email(db, user_data.email)
    if not user or user.hashed_password != simple_hash(user_data.password):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    token = create_access_token({"sub": user.email, "role": user.role})
    return {"access_token": token, "token_type": "bearer", "user": {"id": user.id, "email": user.email, "full_name": user.full_name, "role": user.role}}

@app.get("/api/auth/me")
async def get_me(current_user: DBUser = Depends(get_current_user)):
    return {"id": current_user.id, "email": current_user.email, "full_name": current_user.full_name, "role": current_user.role}

@app.put("/api/auth/profile")
async def update_profile(profile_data: UserProfileUpdate, current_user: DBUser = Depends(get_current_user), db: Session = Depends(get_db)):
    update_user_profile(db, current_user.id, **profile_data.dict(exclude_unset=True))
    return {"message": "Profile updated"}

# ========== DATA LOGGER ==========
@app.get("/api/status")
async def get_status(current_user: DBUser = Depends(get_current_user)):
    return {"connected": is_datalogger_connected()}

@app.post("/api/connect")
async def connect(current_user: DBUser = Depends(get_current_user)):
    set_datalogger_connection(True)
    return {"connected": True}

@app.post("/api/disconnect")
async def disconnect(current_user: DBUser = Depends(get_current_user)):
    set_datalogger_connection(False)
    return {"connected": False}

@app.get("/api/data")
async def get_panels_data(
    current_user: DBUser = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Получение последних данных для отображения"""
    latest_measurements = get_latest_measurements(db, current_user.id)
    is_connected = is_datalogger_connected()
    
    if not is_connected:
        return {
            "connected": False,
            "panels": [],
            "total_power": 0,
            "temperature": 0,
            "alerts": 0,
            "daily_energy": get_daily_energy(db, current_user.id),
            "timestamp": datetime.now().isoformat()
        }
    
    panels = []
    for m in latest_measurements:
        panels.append({
            "id": m.panel_id,
            "power": m.power_watts,
            "temperature": m.temperature_celsius,
            "status": m.status
        })
    
    total_power = sum(p["power"] for p in panels)
    alerts_count = len([p for p in panels if p["status"] == "alarm"])
    daily_energy = get_daily_energy(db, current_user.id)
    
    return {
        "connected": True,
        "panels": panels,
        "total_power": round(total_power / 1000, 2),
        "temperature": await get_temperature(),
        "alerts": alerts_count,
        "daily_energy": round(daily_energy, 1),
        "timestamp": datetime.now().isoformat()
    }

@app.get("/api/history/park")
async def get_park_history_endpoint(
    hours: int = 24,  # вместо days используем hours
    current_user: DBUser = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Получить историю мощности парка за последние N часов"""
    history = get_park_history(db, current_user.id, hours)
    return {"hours": hours, "history": history}

@app.post("/api/test/day")
async def test_day(current_user: DBUser = Depends(get_current_user)):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    set_test_mode(True)
    return {"message": "Test mode enabled"}

@app.post("/api/test/night")
async def test_night(current_user: DBUser = Depends(get_current_user)):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    set_test_mode(False)
    return {"message": "Test mode disabled"}

@app.get("/api/debug/measurements")
async def debug_measurements(
    current_user: DBUser = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Отладочный эндпоинт для проверки данных в БД"""
    from app.database import Measurement
    
    total = db.query(Measurement).count()
    last_measurements = db.query(Measurement).filter(
        Measurement.user_id == current_user.id
    ).order_by(Measurement.timestamp.desc()).limit(10).all()
    
    return {
        "total_measurements": total,
        "last_10": [
            {
                "id": m.id,
                "panel_id": m.panel_id,
                "timestamp": m.timestamp.isoformat(),
                "power_watts": m.power_watts,
                "temperature": m.temperature_celsius,
                "status": m.status
            }
            for m in last_measurements
        ]
    }

# ========== АДМИН-ПАНЕЛЬ ДЛЯ ГЕНЕРАЦИИ АЛЕРТОВ ==========

# ========== АЛЕРТЫ ==========
@app.get("/api/alerts/history")
async def get_alerts_history(
    limit: int = 100,
    current_user: DBUser = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Получить историю алертов пользователя"""
    from app.measurement_service import get_alerts_history
    alerts = get_alerts_history(db, current_user.id, limit)
    return {"alerts": alerts, "count": len(alerts)}

@app.get("/api/history/park")
async def get_park_history_endpoint(
    hours: int = 24,
    current_user: DBUser = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Получить историю мощности парка за последние N часов"""
    history = get_park_history(db, current_user.id, hours)
    return {"hours": hours, "history": history}

@app.get("/api/history/park/today")
async def get_park_history_today(
    current_user: DBUser = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Получить историю мощности парка за сегодня (с 00:00)"""
    from app.measurement_service import get_park_history_today
    
    history = get_park_history_today(db, current_user.id)
    return {"history": history}

@app.get("/api/history/park/daily")
async def get_park_history_daily(
    days: int = 7,
    exclude_today: bool = True,
    current_user: DBUser = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Получить среднесуточную историю мощности парка"""
    from app.measurement_service import get_park_history_daily
    
    history = get_park_history_daily(db, current_user.id, days, exclude_today)
    return {"days": days, "history": history}

@app.post("/api/alerts/{alert_id}/acknowledge")
async def acknowledge_alert_endpoint(
    alert_id: int,
    current_user: DBUser = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Подтвердить алерт"""
    from app.measurement_service import acknowledge_alert
    alert = acknowledge_alert(db, alert_id, current_user.id)
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    return {"message": "Alert acknowledged", "alert_id": alert_id}

class GenerateAlertRequest(BaseModel):
    panel_id: int
    alert_type: str  # power_drop, overheat, data_loss, night_generation, fluctuation
    custom_message: Optional[str] = None

@app.post("/api/admin/generate-alert")
async def generate_alert(
    request: GenerateAlertRequest,
    current_user: DBUser = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Генерирует искусственный алерт для указанной панели"""
    
    if request.panel_id < 1 or request.panel_id > 50:
        raise HTTPException(status_code=400, detail="Panel ID must be between 1 and 50")
    
    alert_messages = {
        "power_drop": {
            "severity": "critical",
            "message": f"Панель #{request.panel_id}: резкое падение мощности"
        },
        "overheat": {
            "severity": "warning",
            "message": f"Панель #{request.panel_id}: критический перегрев"
        },
        "data_loss": {
            "severity": "critical",
            "message": f"Панель #{request.panel_id}: потеря связи с Data Logger"
        },
        "night_generation": {
            "severity": "warning",
            "message": f"Панель #{request.panel_id}: аномальная выработка в ночное время"
        },
        "fluctuation": {
            "severity": "warning",
            "message": f"Панель #{request.panel_id}: нестабильная выработка"
        },
        "inverter_fault": {
            "severity": "critical",
            "message": f"Панель #{request.panel_id}: сбой инвертора"
        },
        "low_efficiency": {
            "severity": "warning",
            "message": f"Панель #{request.panel_id}: низкая эффективность работы"
        }
    }
    
    if request.alert_type not in alert_messages:
        raise HTTPException(status_code=400, detail=f"Unknown alert type. Available: {list(alert_messages.keys())}")
    
    # Сохраняем алерт в БД
    from app.measurement_service import save_alert
    alert = save_alert(
        db=db,
        user_id=current_user.id,
        panel_id=request.panel_id,
        alert_type=request.alert_type,
        severity=alert_messages[request.alert_type]["severity"],
        message=request.custom_message or alert_messages[request.alert_type]["message"],
        power=None,
        temperature=None
    )
    
    # Также модифицируем последнее измерение панели (для имитации проблемы)
    from app.measurement_service import get_latest_measurements
    from app.database import Measurement
    
    if request.alert_type == "power_drop":
        # Уменьшаем мощность последнего измерения
        last_measurement = db.query(Measurement).filter(
            Measurement.user_id == current_user.id,
            Measurement.panel_id == request.panel_id
        ).order_by(Measurement.timestamp.desc()).first()
        
        if last_measurement:
            last_measurement.power_watts = max(0, last_measurement.power_watts * 0.1)
            last_measurement.status = "alarm"
            db.commit()
    
    elif request.alert_type == "overheat":
        # Увеличиваем температуру
        last_measurement = db.query(Measurement).filter(
            Measurement.user_id == current_user.id,
            Measurement.panel_id == request.panel_id
        ).order_by(Measurement.timestamp.desc()).first()
        
        if last_measurement:
            last_measurement.temperature_celsius = 85
            last_measurement.status = "alarm"
            db.commit()
    
    elif request.alert_type == "data_loss":
        # Удаляем последнее измерение (имитация потери данных)
        last_measurement = db.query(Measurement).filter(
            Measurement.user_id == current_user.id,
            Measurement.panel_id == request.panel_id
        ).order_by(Measurement.timestamp.desc()).first()
        
        if last_measurement:
            db.delete(last_measurement)
            db.commit()
    
    # Отправляем WebSocket уведомление
    await manager.broadcast({
        "type": "new_alert",
        "timestamp": datetime.now().isoformat(),
        "alert": {
            "panel_id": request.panel_id,
            "type": request.alert_type,
            "severity": alert_messages[request.alert_type]["severity"],
            "message": request.custom_message or alert_messages[request.alert_type]["message"]
        }
    })
    
    return {
        "success": True,
        "alert_id": alert.id,
        "message": f"Alert generated for panel #{request.panel_id}",
        "alert_type": request.alert_type
    }

@app.get("/api/panel/{panel_id}/history")
async def get_panel_history_endpoint(
    panel_id: int,
    hours: int = 6,
    current_user: DBUser = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Получить историю измерений конкретной панели за последние N часов"""
    from app.measurement_service import get_panel_measurements
    
    if panel_id < 1 or panel_id > 50:
        raise HTTPException(status_code=400, detail="Panel ID must be between 1 and 50")
    
    measurements = get_panel_measurements(db, current_user.id, panel_id, hours)
    
    return {
        "panel_id": panel_id,
        "hours": hours,
        "measurements": measurements
    }

@app.get("/api/admin/alert-types")
async def get_alert_types(current_user: DBUser = Depends(get_current_admin)):
    """Получить список доступных типов алертов"""
    return {
        "alert_types": [
            {"id": "power_drop", "name": "Падение мощности", "severity": "critical", "description": "Резкое падение мощности панели"},
            {"id": "overheat", "name": "Перегрев", "severity": "warning", "description": "Критический перегрев панели"},
            {"id": "data_loss", "name": "Потеря данных", "severity": "critical", "description": "Потеря связи с панелью"},
            {"id": "night_generation", "name": "Ночная аномалия", "severity": "warning", "description": "Аномальная выработка ночью"},
            {"id": "fluctuation", "name": "Нестабильность", "severity": "warning", "description": "Нестабильная выработка"},
            {"id": "inverter_fault", "name": "Сбой инвертора", "severity": "critical", "description": "Сбой в работе инвертора"},
            {"id": "low_efficiency", "name": "Низкая эффективность", "severity": "warning", "description": "Эффективность ниже нормы"}
        ]
    }

# ========== WEBSOCKET ==========
@app.websocket("/ws/live")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            # Ждём сообщения от клиента
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_text("pong")
    except WebSocketDisconnect:
        manager.disconnect(websocket)

# ========== LIFECYCLE ==========
@app.on_event("startup")
async def startup_event():
    global background_task
    background_task = asyncio.create_task(background_data_collector())
    print("[INIT] Background data collector started")

@app.on_event("shutdown")
async def shutdown_event():
    global is_running
    is_running = False
    if background_task:
        background_task.cancel()
    print("[INIT] Background data collector stopped")

@app.get("/")
async def root():
    return {"name": "Helios API", "status": "running"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)