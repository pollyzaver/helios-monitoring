from sqlalchemy.orm import Session
from app.database import User
import hashlib
from typing import List

def simple_hash(password: str) -> str:
    """Простое хеширование пароля"""
    return hashlib.sha256(f"helios_salt_{password}".encode()).hexdigest()

def get_user_by_email(db: Session, email: str):
    return db.query(User).filter(User.email == email).first()

def get_user_by_id(db: Session, user_id: int):
    return db.query(User).filter(User.id == user_id).first()

def get_all_users(db: Session) -> List[User]:
    """Получает всех пользователей"""
    return db.query(User).all()

def create_user(db: Session, email: str, full_name: str, password: str):
    hashed = simple_hash(password)
    db_user = User(
        email=email,
        full_name=full_name,
        hashed_password=hashed,
        role="user"
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

def update_user_profile(db: Session, user_id: int, **kwargs):
    user = get_user_by_id(db, user_id)
    if not user:
        return None
    
    allowed_fields = ["full_name", "company", "phone", "telegram_chat_id", "notifications_enabled"]
    for field, value in kwargs.items():
        if field in allowed_fields and value is not None:
            setattr(user, field, value)
    
    db.commit()
    db.refresh(user)
    return user

def update_user_thresholds(db: Session, user_id: int, thresholds: dict):
    user = get_user_by_id(db, user_id)
    if not user:
        return None
    
    if "power_warning" in thresholds:
        user.threshold_power_warning = thresholds["power_warning"]
    if "power_alarm" in thresholds:
        user.threshold_power_alarm = thresholds["power_alarm"]
    if "temp_warning" in thresholds:
        user.threshold_temp_warning = thresholds["temp_warning"]
    if "temp_alarm" in thresholds:
        user.threshold_temp_alarm = thresholds["temp_alarm"]
    
    db.commit()
    db.refresh(user)
    return user
