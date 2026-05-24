from sqlalchemy import create_engine, Column, Integer, String, Float, Boolean, DateTime
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from datetime import datetime

# URL подключения (SQLite)
DATABASE_URL = "sqlite:///./helios.db"

engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# Модель пользователя
class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    full_name = Column(String, nullable=False)
    hashed_password = Column(String, nullable=False)
    role = Column(String, default="user")
    company = Column(String, nullable=True)
    phone = Column(String, nullable=True)
    telegram_chat_id = Column(String, nullable=True)
    notifications_enabled = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Настройки порогов
    threshold_power_warning = Column(Integer, default=150)
    threshold_power_alarm = Column(Integer, default=50)
    threshold_temp_warning = Column(Integer, default=60)
    threshold_temp_alarm = Column(Integer, default=75)


# Модель для хранения измерений
class Measurement(Base):
    __tablename__ = "measurements"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, index=True, nullable=False)
    panel_id = Column(Integer, nullable=False)
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)
    power_watts = Column(Float, nullable=False)
    temperature_celsius = Column(Float, nullable=False)
    status = Column(String, default="normal")
    energy_kwh_15min = Column(Float, default=0)


# Модель для хранения алертов
class Alert(Base):
    __tablename__ = "alerts"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, index=True, nullable=False)
    panel_id = Column(Integer, nullable=False)
    type = Column(String, nullable=False)
    severity = Column(String, nullable=False)
    message = Column(String, nullable=False)
    power = Column(Float, nullable=True)
    temperature = Column(Float, nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow)
    is_acknowledged = Column(Boolean, default=False)
    acknowledged_at = Column(DateTime, nullable=True)


def init_db():
    """Создаёт все таблицы"""
    Base.metadata.create_all(bind=engine)


def get_db():
    """Получение сессии БД"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
