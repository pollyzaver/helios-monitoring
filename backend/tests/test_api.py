import requests
import time

BASE_URL = "http://localhost:8000/api"

class TestAPI:
    
    def test_root_endpoint(self):
        """Проверка корневого эндпоинта"""
        response = requests.get("http://localhost:8000/")
        assert response.status_code == 200
        assert "name" in response.json()
        print("✅ Корневой эндпоинт работает")
    
    def test_health_check(self):
        """Проверка health check"""
        response = requests.get("http://localhost:8000/api/health")
        assert response.status_code == 200
        assert response.json()["status"] == "healthy"
        print("✅ Health check пройден")
    
    def test_register_user(self):
        """Тест регистрации нового пользователя"""
        email = f"test_{int(time.time())}@example.com"
        data = {
            "email": email,
            "full_name": "Тестовый Пользователь",
            "password": "test123"
        }
        response = requests.post(f"{BASE_URL}/auth/register", json=data)
        assert response.status_code == 200
        assert "access_token" in response.json()
        print(f"✅ Регистрация прошла успешно: {email}")
    
    def test_login_admin(self):
        """Тест входа администратора"""
        data = {"email": "admin@helios.com", "password": "admin123"}
        response = requests.post(f"{BASE_URL}/auth/login", json=data)
        assert response.status_code == 200
        assert "access_token" in response.json()
        print("✅ Вход администратора выполнен")
    
    def test_login_invalid_credentials(self):
        """Тест входа с неверными данными"""
        data = {"email": "wrong@example.com", "password": "wrong"}
        response = requests.post(f"{BASE_URL}/auth/login", json=data)
        assert response.status_code == 401
        print("✅ Неверные учётные данные отклонены")
    
    def test_get_me_without_token(self):
        """Тест доступа без токена"""
        response = requests.get(f"{BASE_URL}/auth/me")
        assert response.status_code == 401
        print("✅ Доступ без токена запрещён")
