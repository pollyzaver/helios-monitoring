"""
Тесты базы данных (реальные вызовы)
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import hashlib
from app.database import SessionLocal, init_db
from app.user_service import create_user, get_user_by_email, simple_hash, update_user_profile
from app.measurement_service import save_measurement, get_daily_energy

class TestDatabase:
    
    def setup_method(self):
        """Подготовка перед каждым тестом"""
        init_db()
        self.db = SessionLocal()
    
    def teardown_method(self):
        """Очистка после каждого теста"""
        self.db.close()
    
    def test_create_user(self):
        """Проверка создания пользователя в БД"""
        email = "dbtest@example.com"
        user = create_user(self.db, email, "DB Test User", "test123")
        assert user.id is not None
        assert user.email == email
        assert user.role == "user"
        print(f"✅ Пользователь создан: ID={user.id}")
    
    def test_get_user_by_email(self):
        """Проверка поиска пользователя по email"""
        email = "findme@example.com"
        create_user(self.db, email, "Find Me", "pass123")
        user = get_user_by_email(self.db, email)
        assert user is not None
        assert user.email == email
        print("✅ Поиск пользователя по email работает")
    
    def test_save_and_get_measurement(self):
        """Проверка сохранения и получения измерения"""
        user = create_user(self.db, "measure@example.com", "Measure User", "pass123")
        
        from datetime import datetime
        from app.measurement_service import save_measurement
        measurement = save_measurement(
            self.db, user.id, 1, 250.5, 35.2, "normal", 0.0625
        )
        
        assert measurement.id is not None
        assert measurement.power_watts == 250.5
        assert measurement.temperature_celsius == 35.2
        print("✅ Сохранение измерения в БД корректно")
    
    def test_daily_energy_calculation(self):
        """Проверка расчёта дневной выработки"""
        user = create_user(self.db, "energy@example.com", "Energy User", "pass123")
        
        from datetime import datetime, timedelta
        from app.measurement_service import save_measurement
        
        # Сохраняем несколько измерений
        save_measurement(self.db, user.id, 1, 400, 35, "normal", 0.1)
        save_measurement(self.db, user.id, 1, 380, 35, "normal", 0.095)
        save_measurement(self.db, user.id, 1, 350, 35, "normal", 0.0875)
        
        daily_energy = get_daily_energy(self.db, user.id)
        assert daily_energy > 0
        print(f"✅ Дневная выработка: {daily_energy} кВт·ч")
    
    def test_update_user_profile(self):
        """Проверка обновления профиля пользователя"""
        user = create_user(self.db, "update@example.com", "Original Name", "pass123")
        
        updated = update_user_profile(self.db, user.id, full_name="Updated Name")
        assert updated is not None
        assert updated.full_name == "Updated Name"
        print("✅ Обновление профиля работает")
    
    def test_password_hashing(self):
        """Проверка хеширования пароля"""
        password = "secret123"
        hashed = simple_hash(password)
        assert hashed != password
        assert len(hashed) == 64
        print("✅ Хеширование пароля корректно")
