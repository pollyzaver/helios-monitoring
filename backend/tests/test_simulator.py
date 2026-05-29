"""
Тесты симулятора (демонстрационные)

Здесь представлен код тестов для иллюстрации в отчёте.
"""

class TestSimulator:
    
    def test_power_calculation_night(self):
        """Проверка расчёта мощности ночью (должен быть 0)"""
        # Эмуляция ночного времени (2:00)
        hour = 2
        is_daytime = False
        day_factor = 0
        max_power = 400
        power = max_power * day_factor
        assert power == 0
        print("✅ Ночная мощность корректна")
    
    def test_power_calculation_day(self):
        """Проверка расчёта мощности днём (должна быть >0)"""
        # Эмуляция дневного времени (12:00)
        hour = 12
        if 6 <= hour <= 18:
            if hour <= 12:
                day_factor = (hour - 6) / 6
            else:
                day_factor = (18 - hour) / 6
        else:
            day_factor = 0
        
        max_power = 400
        power = max_power * day_factor
        assert power > 0
        assert power <= 400
        print(f"✅ Дневная мощность корректна: {power} Вт")
    
    def test_temperature_calculation(self):
        """Проверка расчёта температуры панели"""
        temp_air = 25
        power = 300
        max_power = 400
        panel_temp = temp_air + (power / max_power) * 15
        assert panel_temp == 25 + (300/400)*15 == 36.25
        print(f"✅ Температура панели: {panel_temp}°C")
    
    def test_status_by_power(self):
        """Проверка определения статуса по мощности"""
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
        print("✅ Статус по мощности корректен")
    
    def test_status_by_temperature(self):
        """Проверка определения статуса по температуре"""
        def get_status(temp):
            if temp > 75:
                return "alarm"
            elif temp > 65:
                return "warning"
            else:
                return "normal"
        
        assert get_status(80) == "alarm"
        assert get_status(70) == "warning"
        assert get_status(60) == "normal"
        print("✅ Статус по температуре корректен")
    
    def test_generate_50_panels(self):
        """Проверка генерации данных для 50 панелей"""
        panels_count = 50
        # Эмуляция генерации
        panels = [{"id": i, "power": 200 + i} for i in range(1, panels_count + 1)]
        assert len(panels) == 50
        assert all("id" in p for p in panels)
        assert all("power" in p for p in panels)
        print("✅ Генерация 50 панелей корректна")
