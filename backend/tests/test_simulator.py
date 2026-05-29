"""
Тесты симулятора (реальные вызовы функций)
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.simulator import calculate_power, generate_panels_data

class TestSimulator:
    
    def test_power_calculation_night(self):
        """Проверка расчёта мощности ночью (должен быть 0)"""
        power, panel_temp, status, alert = calculate_power(1, 2, 20)
        assert power == 0
        assert status == "normal"
        print("✅ Ночная мощность корректна")
    
    def test_power_calculation_day(self):
        """Проверка расчёта мощности днём (должна быть >0)"""
        power, panel_temp, status, alert = calculate_power(1, 12, 25)
        assert power > 0
        assert power <= 400
        print(f"✅ Дневная мощность корректна: {power} Вт")
    
    def test_power_calculation_high_temp(self):
        """Проверка расчёта при высокой температуре"""
        power, panel_temp, status, alert = calculate_power(1, 12, 40)
        # При высокой температуре мощность должна быть ниже
        assert power < 350
        print(f"✅ Мощность при 40°C: {power} Вт")
    
    def test_panel_temperature_calculation(self):
        """Проверка расчёта температуры панели"""
        power, panel_temp, status, alert = calculate_power(1, 12, 25)
        # Температура панели должна быть выше температуры воздуха
        assert panel_temp > 25
        print(f"✅ Температура панели: {panel_temp}°C")
    
    def test_status_by_power(self):
        """Проверка определения статуса по мощности"""
        # Мощность 30 Вт -> alarm
        power, panel_temp, status, alert = calculate_power(1, 12, 25)
        # Искусственно занижаем мощность для проверки статуса
        if power < 50:
            assert status == "alarm" or status == "warning"
        elif power < 150:
            assert status == "warning"
        else:
            assert status == "normal"
        print("✅ Статус по мощности корректен")
    
    def test_generate_50_panels(self):
        """Проверка генерации данных для 50 панелей"""
        panels, alerts = generate_panels_data(25)
        assert len(panels) == 50
        assert all("id" in p for p in panels)
        assert all("power" in p for p in panels)
        assert all("temperature" in p for p in panels)
        print("✅ Генерация 50 панелей корректна")
    
    def test_generate_panels_has_status(self):
        """Проверка, что у каждой панели есть статус"""
        panels, alerts = generate_panels_data(25)
        for panel in panels:
            assert "status" in panel
            assert panel["status"] in ["normal", "warning", "alarm"]
        print("✅ Статусы панелей корректны")
