from sqlalchemy.orm import Session
from sqlalchemy import func, and_
from datetime import datetime, timedelta
from typing import List, Dict, Optional
from app.database import Measurement, Alert

def save_measurement(db: Session, user_id: int, panel_id: int, power: float, 
                     temperature: float, status: str, energy_kwh: float = 0,
                     custom_timestamp: Optional[datetime] = None):
    """Сохраняет одно измерение в БД"""
    measurement = Measurement(
        user_id=user_id,
        panel_id=panel_id,
        timestamp=custom_timestamp or datetime.utcnow(),
        power_watts=power,
        temperature_celsius=temperature,
        status=status,
        energy_kwh_15min=energy_kwh
    )
    db.add(measurement)
    db.commit()
    return measurement

def save_alert(db: Session, user_id: int, panel_id: int, alert_type: str, 
               severity: str, message: str, power: float = None, temperature: float = None):
    """Сохраняет алерт в БД"""
    alert = Alert(
        user_id=user_id,
        panel_id=panel_id,
        type=alert_type,
        severity=severity,
        message=message,
        power=power,
        temperature=temperature,
        timestamp=datetime.utcnow()
    )
    db.add(alert)
    db.commit()
    return alert

def get_park_history_today(db: Session, user_id: int) -> List[Dict]:
    """Получает историю мощности парка за сегодня (в московском времени)"""
    from datetime import datetime, timedelta
    
    # Текущее московское время (UTC+3)
    now_msk = datetime.utcnow() + timedelta(hours=3)
    start_of_day_msk = datetime(now_msk.year, now_msk.month, now_msk.day, 0, 0, 0)
    
    # Переводим начало дня в UTC (вычитаем 3 часа)
    start_of_day_utc = start_of_day_msk - timedelta(hours=3)
    
    measurements = db.query(
        Measurement.timestamp,
        Measurement.power_watts
    ).filter(
        Measurement.user_id == user_id,
        Measurement.timestamp >= start_of_day_utc
    ).order_by(Measurement.timestamp).all()
    
    if not measurements:
        return []
    
    # Группируем по 15-минутным интервалам в МСК
    intervals = {}
    for m in measurements:
        # Переводим UTC в МСК
        ts_msk = m.timestamp + timedelta(hours=3)
        rounded_minute = (ts_msk.minute // 15) * 15
        interval_key = ts_msk.replace(minute=rounded_minute, second=0, microsecond=0)
        
        if interval_key not in intervals:
            intervals[interval_key] = []
        intervals[interval_key].append(m.power_watts)
    
    history = []
    for interval_time in sorted(intervals.keys()):
        powers = intervals[interval_time]
        avg_power = sum(powers) / len(powers)
        # Возвращаем timestamp в UTC для единообразия, но с меткой времени МСК
        utc_time = interval_time - timedelta(hours=3)
        history.append({
            "timestamp": utc_time.isoformat(),
            "avg_power": round(avg_power, 1),
            "total_power": round(avg_power * 50 / 1000, 2)
        })
    
    return history

def get_daily_energy(db: Session, user_id: int, date: datetime = None) -> float:
    """Получает суммарную выработку за день (кВт·ч)"""
    if date is None:
        date = datetime.utcnow()
    
    start_of_day = datetime(date.year, date.month, date.day, 0, 0, 0)
    end_of_day = start_of_day + timedelta(days=1)
    
    result = db.query(func.sum(Measurement.energy_kwh_15min)).filter(
        Measurement.user_id == user_id,
        Measurement.timestamp >= start_of_day,
        Measurement.timestamp < end_of_day
    ).scalar()
    
    return result or 0

def get_park_history(db: Session, user_id: int, hours: int = 24) -> List[Dict]:
    """Получает историю мощности парка (усреднённую по 15-минутным интервалам)"""
    start_date = datetime.utcnow() - timedelta(hours=hours)
    
    # Получаем все измерения за период
    measurements = db.query(
        Measurement.timestamp,
        Measurement.power_watts
    ).filter(
        Measurement.user_id == user_id,
        Measurement.timestamp >= start_date
    ).order_by(Measurement.timestamp).all()
    
    if not measurements:
        return []
    
    # Группируем в Python (15-минутные интервалы)
    intervals = {}
    for m in measurements:
        ts = m.timestamp
        rounded_minute = (ts.minute // 15) * 15
        interval_key = ts.replace(minute=rounded_minute, second=0, microsecond=0)
        
        if interval_key not in intervals:
            intervals[interval_key] = []
        intervals[interval_key].append(m.power_watts)
    
    # Формируем результат
    history = []
    for interval_time in sorted(intervals.keys()):
        powers = intervals[interval_time]
        avg_power = sum(powers) / len(powers)
        history.append({
            "timestamp": interval_time.isoformat(),
            "avg_power": round(avg_power, 1),
            "total_power": round(avg_power * 50 / 1000, 2)
        })
    
    return history

def generate_demo_history(days: int = 1) -> List[Dict]:
    """Генерирует демо-историю для тестирования (если в БД нет данных)"""
    history = []
    now = datetime.utcnow()
    hours_count = days * 24
    
    for i in range(hours_count):
        hour_time = now - timedelta(hours=hours_count - i)
        hour = hour_time.hour
        
        if 6 <= hour <= 18:
            if hour <= 12:
                day_factor = (hour - 6) / 6
            else:
                day_factor = (18 - hour) / 6
        else:
            day_factor = 0
        
        avg_power = round(350 * day_factor * (0.7 + (hour_time.minute / 60) * 0.3), 1)
        
        history.append({
            "timestamp": hour_time.isoformat(),
            "avg_power": avg_power,
            "total_power": round(avg_power * 50 / 1000, 2)
        })
    
    return history

def get_panel_history(db: Session, user_id: int, panel_id: int, days: int = 7) -> List[Dict]:
    """Получает историю мощности панели за N дней"""
    start_date = datetime.utcnow() - timedelta(days=days)
    
    measurements = db.query(
        Measurement.timestamp,
        Measurement.power_watts,
        Measurement.temperature_celsius,
        Measurement.status
    ).filter(
        Measurement.user_id == user_id,
        Measurement.panel_id == panel_id,
        Measurement.timestamp >= start_date
    ).order_by(Measurement.timestamp).all()
    
    return [{
        "timestamp": m.timestamp.isoformat(),
        "power": m.power_watts,
        "temperature": m.temperature_celsius,
        "status": m.status
    } for m in measurements]

def get_alerts_history(db: Session, user_id: int, limit: int = 100) -> List[Dict]:
    """Получает историю алертов"""
    results = db.query(Alert).filter(
        Alert.user_id == user_id
    ).order_by(Alert.timestamp.desc()).limit(limit).all()
    
    return [
        {
            "id": r.id,
            "panel_id": r.panel_id,
            "type": r.type,
            "severity": r.severity,
            "message": r.message,
            "power": r.power,
            "temperature": r.temperature,
            "timestamp": r.timestamp.isoformat(),
            "is_acknowledged": r.is_acknowledged
        }
        for r in results
    ]

def acknowledge_alert(db: Session, alert_id: int, user_id: int):
    """Подтверждает алерт"""
    alert = db.query(Alert).filter(
        Alert.id == alert_id, 
        Alert.user_id == user_id
    ).first()
    if alert:
        alert.is_acknowledged = True
        alert.acknowledged_at = datetime.utcnow()
        db.commit()
    return alert

def get_park_history_daily(db: Session, user_id: int, days: int = 7, exclude_today: bool = True) -> List[Dict]:
    """Получает среднесуточную историю мощности парка"""
    from datetime import datetime, timedelta
    
    end_date = datetime.utcnow()
    if exclude_today:
        # Исключаем сегодняшний день, берём данные до вчера
        end_date = datetime(end_date.year, end_date.month, end_date.day, 0, 0, 0)
    
    start_date = end_date - timedelta(days=days)
    
    results = db.query(
        func.date(Measurement.timestamp).label('day'),
        func.avg(Measurement.power_watts).label('avg_power'),
        func.sum(Measurement.energy_kwh_15min).label('total_energy')
    ).filter(
        Measurement.user_id == user_id,
        Measurement.timestamp >= start_date,
        Measurement.timestamp < end_date
    ).group_by('day').order_by('day').all()
    
    history = []
    for r in results:
        if r.day:
            history.append({
                "date": r.day,
                "avg_power": round(r.avg_power, 1) if r.avg_power else 0,
                "total_energy": round(r.total_energy or 0, 1)
            })
    
    return history

def get_panel_measurements(db: Session, user_id: int, panel_id: int, hours: int = 6) -> List[Dict]:
    """Получает измерения конкретной панели за последние N часов"""
    from datetime import datetime, timedelta
    
    start_date = datetime.utcnow() - timedelta(hours=hours)
    
    results = db.query(
        Measurement.timestamp,
        Measurement.power_watts,
        Measurement.temperature_celsius,
        Measurement.status
    ).filter(
        Measurement.user_id == user_id,
        Measurement.panel_id == panel_id,
        Measurement.timestamp >= start_date
    ).order_by(Measurement.timestamp).all()
    
    return [
        {
            "timestamp": r.timestamp.isoformat(),
            "power": r.power_watts,
            "temperature": r.temperature_celsius,
            "status": r.status
        }
        for r in results
    ]

def get_latest_measurements(db: Session, user_id: int):
    """Получает последние измерения для всех панелей пользователя"""
    from sqlalchemy import distinct
    
    panel_ids = db.query(distinct(Measurement.panel_id)).filter(
        Measurement.user_id == user_id
    ).all()
    
    latest = []
    for (panel_id,) in panel_ids:
        measurement = db.query(Measurement).filter(
            Measurement.user_id == user_id,
            Measurement.panel_id == panel_id
        ).order_by(Measurement.timestamp.desc()).first()
        
        if measurement:
            latest.append(measurement)
    
    return latest
