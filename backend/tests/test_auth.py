import requests
import time

BASE_URL = "http://localhost:8000/api"

def test_health_check():
    """Проверка, что сервер запущен"""
    response = requests.get("http://localhost:8000/")
    assert response.status_code == 200
    print("✅ Сервер запущен")

def test_register():
    """Тест регистрации"""
    register_data = {
        "email": f"test_{int(time.time())}@example.com",
        "full_name": "Тестовый Пользователь",
        "password": "test123"
    }
    response = requests.post(f"{BASE_URL}/auth/register", json=register_data)
    
    if response.status_code == 200:
        print(f"✅ Регистрация успешна: {register_data['email']}")
    else:
        print(f"⚠️ Регистрация вернула статус {response.status_code}: {response.text}")
    
    return response

def test_login():
    """Тест входа"""
    # Сначала регистрируем пользователя
    test_register()
    
    login_data = {
        "email": "admin@helios.com",
        "password": "admin123"
    }
    response = requests.post(f"{BASE_URL}/auth/login", json=login_data)
    assert response.status_code == 200
    assert "access_token" in response.json()
    print("✅ Вход выполнен успешно, токен получен")
    return response.json()["access_token"]

if __name__ == "__main__":
    print("\n=== Запуск тестов аутентификации ===\n")
    test_health_check()
    token = test_login()
    print(f"\n✅ Все тесты пройдены!\nТокен: {token[:50]}...")