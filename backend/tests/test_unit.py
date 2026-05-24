import hashlib

def test_password_hashing():
    """Тест хеширования пароля"""
    password = "test123"
    salt = "helios_salt_"
    hashed = hashlib.sha256(f"{salt}{password}".encode()).hexdigest()
    
    assert len(hashed) == 64  # SHA-256 всегда даёт 64 символа
    assert hashed != password  # Хеш не равен исходному паролю
    print("✅ Тест хеширования пароля пройден")

def test_power_calculation_logic():
    """Тест логики расчёта статуса панели по мощности"""
    def get_status(power):
        if power < 50:
            return "alarm"
        elif power < 150:
            return "warning"
        else:
            return "normal"
    
    assert get_status(30) == "alarm"
    assert get_status(100) == "warning"
    assert get_status(200) == "normal"
    print("✅ Тест расчёта статуса панели пройден")

def test_temperature_calculation():
    """Тест расчёта статуса по температуре"""
    def get_status_by_temp(temp):
        if temp > 75:
            return "alarm"
        elif temp > 65:
            return "warning"
        else:
            return "normal"
    
    assert get_status_by_temp(80) == "alarm"
    assert get_status_by_temp(70) == "warning"
    assert get_status_by_temp(60) == "normal"
    print("✅ Тест расчёта статуса по температуре пройден")

if __name__ == "__main__":
    print("\n=== Модульное тестирование ===\n")
    test_password_hashing()
    test_power_calculation_logic()
    test_temperature_calculation()
    print("\n✅ Все модульные тесты пройдены!")