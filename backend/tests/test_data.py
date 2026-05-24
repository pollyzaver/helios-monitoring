import requests

BASE_URL = "http://localhost:8000/api"

def get_token():
    """Получаем токен администратора"""
    login_data = {"email": "admin@helios.com", "password": "admin123"}
    response = requests.post(f"{BASE_URL}/auth/login", json=login_data)
    if response.status_code == 200:
        return response.json()["access_token"]
    return None

def test_get_status():
    """Тест получения статуса Data Logger"""
    token = get_token()
    if not token:
        print("❌ Не удалось получить токен")
        return
    
    headers = {"Authorization": f"Bearer {token}"}
    response = requests.get(f"{BASE_URL}/status", headers=headers)
    assert response.status_code == 200
    print(f"✅ Статус Data Logger: {response.json()}")

def test_connect_datalogger():
    """Тест подключения Data Logger"""
    token = get_token()
    if not token:
        print("❌ Не удалось получить токен")
        return
    
    headers = {"Authorization": f"Bearer {token}"}
    response = requests.post(f"{BASE_URL}/connect", headers=headers)
    assert response.status_code == 200
    print("✅ Data Logger подключён")

def test_get_panels_data():
    """Тест получения данных панелей"""
    token = get_token()
    if not token:
        print("❌ Не удалось получить токен")
        return
    
    headers = {"Authorization": f"Bearer {token}"}
    
    # Сначала подключаем Data Logger
    requests.post(f"{BASE_URL}/connect", headers=headers)
    
    # Получаем данные
    response = requests.get(f"{BASE_URL}/data", headers=headers)
    assert response.status_code == 200
    
    data = response.json()
    assert "panels" in data
    assert "total_power" in data
    assert "temperature" in data
    
    print(f"✅ Получены данные: {len(data['panels'])} панелей")
    print(f"   Общая мощность: {data['total_power']} кВт")
    print(f"   Температура воздуха: {data['temperature']}°C")

def test_get_history():
    """Тест получения истории"""
    token = get_token()
    if not token:
        print("❌ Не удалось получить токен")
        return
    
    headers = {"Authorization": f"Bearer {token}"}
    response = requests.get(f"{BASE_URL}/history/park?hours=24", headers=headers)
    assert response.status_code == 200
    
    data = response.json()
    print(f"✅ Получена история: {len(data['history'])} точек данных")

if __name__ == "__main__":
    print("\n=== Запуск тестов данных ===\n")
    test_get_status()
    test_connect_datalogger()
    test_get_panels_data()
    test_get_history()
    print("\n✅ Все тесты пройдены!")