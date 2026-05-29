import requests
import time

BASE_URL = "http://localhost:8000/api"
ADMIN_TOKEN = None

def get_admin_token():
    global ADMIN_TOKEN
    if ADMIN_TOKEN:
        return ADMIN_TOKEN
    data = {"email": "admin@helios.com", "password": "admin123"}
    response = requests.post(f"{BASE_URL}/auth/login", json=data)
    if response.status_code == 200:
        ADMIN_TOKEN = response.json()["access_token"]
    return ADMIN_TOKEN

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
    
    def test_get_profile_with_token(self):
        """Тест получения профиля с токеном"""
        token = get_admin_token()
        assert token is not None
        headers = {"Authorization": f"Bearer {token}"}
        response = requests.get(f"{BASE_URL}/auth/me", headers=headers)
        assert response.status_code == 200
        assert "email" in response.json()
        print("✅ Получение профиля с токеном работает")
    
    def test_update_profile(self):
        """Тест обновления профиля"""
        token = get_admin_token()
        headers = {"Authorization": f"Bearer {token}"}
        update_data = {"full_name": "Обновлённое Имя"}
        response = requests.put(f"{BASE_URL}/auth/profile", json=update_data, headers=headers)
        assert response.status_code == 200
        print("✅ Обновление профиля работает")
    
    def test_disconnect_datalogger(self):
        """Тест отключения Data Logger"""
        token = get_admin_token()
        headers = {"Authorization": f"Bearer {token}"}
        response = requests.post(f"{BASE_URL}/disconnect", headers=headers)
        assert response.status_code == 200
        print("✅ Отключение Data Logger работает")
    
    def test_connect_datalogger(self):
        """Тест подключения Data Logger"""
        token = get_admin_token()
        headers = {"Authorization": f"Bearer {token}"}
        response = requests.post(f"{BASE_URL}/connect", headers=headers)
        assert response.status_code == 200
        print("✅ Подключение Data Logger работает")
