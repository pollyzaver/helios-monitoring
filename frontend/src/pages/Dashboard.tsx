import { useState, useEffect } from 'react';
import LoadingSpinner from '../components/LoadingSpinner';
import PanelDetail from '../components/PanelDetail';
import RealTimeChart from '../components/RealTimeChart';
import { useWebSocket } from '../hooks/useWebSocket';

interface Panel {
  id: number;
  power: number;
  temperature: number;
  status: 'normal' | 'warning' | 'alarm';
}

interface ActiveAlert {
  panelId: number;
  type: string;
  severity: string;
  message: string;
}

const Dashboard = () => {
  const [connected, setConnected] = useState(false);
  const [panels, setPanels] = useState<Panel[]>([]);
  const [totalPower, setTotalPower] = useState(0);
  const [alerts, setAlerts] = useState(0);
  const [temperature, setTemperature] = useState(0);
  const [loading, setLoading] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [dailyEnergy, setDailyEnergy] = useState(0);
  const [selectedPanel, setSelectedPanel] = useState<number | null>(null);
  const [activeAlerts, setActiveAlerts] = useState<ActiveAlert[]>([]);
  const { lastUpdate } = useWebSocket();

  const fetchData = async () => {
    console.log('[Dashboard] fetchData started');
    const token = localStorage.getItem('helios_token');
    
    if (!token) {
      console.log('[Dashboard] No token, skipping');
      setIsInitialLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/data', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (res.status === 401) {
        console.log('[Dashboard] Token invalid');
        localStorage.removeItem('helios_token');
        localStorage.removeItem('helios_user');
        window.location.href = '/login';
        return;
      }
      
      const data = await res.json();
      console.log('[Dashboard] Data received:', { 
        connected: data.connected, 
        panelsCount: data.panels?.length,
        totalPower: data.total_power 
      });
      
      setConnected(data.connected);
      setPanels(data.panels || []);
      setTotalPower(data.total_power || 0);
      setAlerts(data.alerts || 0);
      setTemperature(data.temperature || 0);
      setDailyEnergy(data.daily_energy || 0);
      
    } catch (err) {
      console.error('[Dashboard] Fetch error:', err);
    } finally {
      console.log('[Dashboard] Setting isInitialLoading to false');
      setIsInitialLoading(false);
    }
  };

  const fetchActiveAlerts = async () => {
    const token = localStorage.getItem('helios_token');
    if (!token) return;
    
    try {
      const res = await fetch('/api/alerts/history?limit=100', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      
      if (data.alerts) {
        const active = data.alerts
          .filter((a: any) => !a.is_acknowledged)
          .map((a: any) => ({
            panelId: a.panel_id,
            type: a.type,
            severity: a.severity,
            message: a.message
          }));
        setActiveAlerts(active);
      }
    } catch (err) {
      console.error('Fetch active alerts error:', err);
    }
  };

  // Загрузка сохранённой выработки при монтировании
  useEffect(() => {
    const savedEnergy = localStorage.getItem('helios_daily_energy');
    const lastDate = localStorage.getItem('helios_daily_date');
    const today = new Date().toDateString();
    
    if (lastDate === today && savedEnergy) {
      setDailyEnergy(parseFloat(savedEnergy));
    }
  }, []);

  // Основной useEffect для загрузки данных
  useEffect(() => {
    console.log('[Dashboard] Component mounted, fetching data...');
    fetchData();
    fetchActiveAlerts();
    
    // Интервал обновления каждые 15 секунд
    const interval = setInterval(() => {
      console.log('[Dashboard] Interval refresh');
      fetchData();
      fetchActiveAlerts();
    }, 15000);
    
    return () => {
      console.log('[Dashboard] Component unmounting, clearing interval');
      clearInterval(interval);
    };
  }, []);

  // Обновление при WebSocket уведомлении
  useEffect(() => {
    if (lastUpdate) {
      console.log('[Dashboard] WebSocket triggered refresh');
      fetchData();
      fetchActiveAlerts();
    }
  }, [lastUpdate]);

  const handleConnect = async () => {
    const token = localStorage.getItem('helios_token');
    if (!token) return;
    
    setLoading(true);
    try {
      await fetch('/api/connect', { 
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      await fetchData();
    } catch (err) {
      console.error('Connect error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = async () => {
    const token = localStorage.getItem('helios_token');
    if (!token) return;
    
    setLoading(true);
    try {
      await fetch('/api/disconnect', { 
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      await fetchData();
    } catch (err) {
      console.error('Disconnect error:', err);
    } finally {
      setLoading(false);
    }
  };

  const avgPower = panels.length > 0 
    ? Math.round(panels.reduce((sum, p) => sum + p.power, 0) / panels.length) 
    : 0;

  const normalCount = panels.filter(p => p.status === 'normal').length;
  const warningCount = panels.filter(p => p.status === 'warning').length;
  const alarmCount = panels.filter(p => p.status === 'alarm').length;

  // Получение цвета панели с учётом активных алертов
  const getPanelColor = (panel: Panel) => {
    // Сначала проверяем активные алерты
    const hasActiveAlert = activeAlerts.some(a => a.panelId === panel.id);
    
    if (hasActiveAlert) {
      // Если есть активный алерт, проверяем его критичность
      const alert = activeAlerts.find(a => a.panelId === panel.id);
      if (alert?.severity === 'critical') return 'bg-red-500';
      return 'bg-yellow-500';
    }
    
    // Если нет активных алертов — используем статус из данных
    if (panel.status === 'alarm') return 'bg-red-500';
    if (panel.status === 'warning') return 'bg-yellow-500';
    return 'bg-green-500';
  };

  // Получение стиля пульсации для панелей с критическими алертами
  const getPanelAnimation = (panel: Panel) => {
    const hasCriticalAlert = activeAlerts.some(
      a => a.panelId === panel.id && a.severity === 'critical'
    );
    
    if (hasCriticalAlert) {
      return 'animate-pulse';
    }
    return '';
  };

  const formattedDailyEnergy = dailyEnergy > 1000 
    ? `${(dailyEnergy / 1000).toFixed(1)} МВт·ч`
    : `${Math.round(dailyEnergy)} кВт·ч`;

  // Показываем загрузку только при первом входе
  if (isInitialLoading) {
    return <LoadingSpinner />;
  }

  // Форма подключения Data Logger
  if (!connected) {
    return (
      <div className="max-w-md mx-auto">
        <div className="bg-[#141B2B]/60 backdrop-blur-xl border border-white/10 rounded-3xl p-8 text-center">
          <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold mb-2">Подключение Data Logger</h2>
          <p className="text-[#94A3B8] mb-6">Настройте устройство сбора данных</p>
          
          <div className="space-y-4">
            <input
              type="text"
              placeholder="IP-адрес"
              defaultValue="192.168.1.100"
              className="w-full px-4 py-2.5 bg-[#0A0F1A] rounded-xl border border-white/10 focus:border-yellow-500/50 focus:outline-none transition"
            />
            <input
              type="text"
              placeholder="Порт"
              defaultValue="8080"
              className="w-full px-4 py-2.5 bg-[#0A0F1A] rounded-xl border border-white/10 focus:border-yellow-500/50 focus:outline-none transition"
            />
            <button
              onClick={handleConnect}
              disabled={loading}
              className="w-full py-2.5 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-xl font-medium hover:opacity-90 transition disabled:opacity-50"
            >
              {loading ? 'Подключение...' : 'Подключить Data Logger'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Основной дашборд
  return (
    <div className="space-y-8">
      {/* Header Section */}
      <section className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold text-[#E2E8F0]">Дашборд</h1>
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs font-medium text-emerald-400">LIVE</span>
            </div>
          </div>
          <p className="mt-2 text-[#94A3B8]">Мониторинг солнечных панелей в реальном времени</p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-[#141B2B]/60 border border-white/10 rounded-2xl px-4 py-3 backdrop-blur-xl">
            <p className="text-xs text-[#94A3B8]">Панели</p>
            <p className="text-lg font-semibold text-[#E2E8F0]">{panels.length}</p>
          </div>
          <div className="bg-[#141B2B]/60 border border-white/10 rounded-2xl px-4 py-3 backdrop-blur-xl">
            <p className="text-xs text-[#94A3B8]">Онлайн</p>
            <p className="text-lg font-semibold text-emerald-400">{connected ? panels.length : 0}</p>
          </div>
          <div className="bg-[#141B2B]/60 border border-white/10 rounded-2xl px-4 py-3 backdrop-blur-xl">
            <p className="text-xs text-[#94A3B8]">Эффективность</p>
            <p className="text-lg font-semibold text-yellow-400">
              {avgPower ? Math.round((avgPower / 400) * 100) : 0}%
            </p>
          </div>
          <div className="bg-[#141B2B]/60 border border-white/10 rounded-2xl px-4 py-3 backdrop-blur-xl">
            <p className="text-xs text-[#94A3B8]">Погода</p>
            <p className="text-lg font-semibold text-[#E2E8F0]">{temperature}°C</p>
          </div>
        </div>
      </section>

      {/* KPI Cards */}
      <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
        <div className="bg-[#141B2B]/60 backdrop-blur-xl border border-white/10 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-[#94A3B8]">Общая мощность</span>
            <svg className="w-5 h-5 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <p className="text-3xl font-bold text-white">{totalPower} <span className="text-lg text-[#94A3B8]">кВт</span></p>
          <p className="text-xs text-emerald-400 mt-2">текущая</p>
        </div>

        <div className="bg-[#141B2B]/60 backdrop-blur-xl border border-white/10 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-[#94A3B8]">Выработка за день</span>
            <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          </div>
          <p className="text-3xl font-bold text-white">{formattedDailyEnergy}</p>
          <p className="text-xs text-emerald-400 mt-2">накоплено с 00:00</p>
        </div>

        <div className="bg-[#141B2B]/60 backdrop-blur-xl border border-white/10 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-[#94A3B8]">Средняя температура</span>
            <svg className="w-5 h-5 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          </div>
          <p className="text-3xl font-bold text-white">{panels.length ? Math.round(panels.reduce((sum, p) => sum + p.temperature, 0) / panels.length) : 0} <span className="text-lg text-[#94A3B8]">°C</span></p>
          <p className={`text-xs mt-2 ${temperature > 60 ? 'text-red-400' : 'text-emerald-400'}`}>
            {temperature > 60 ? 'выше нормы' : 'в пределах нормы'}
          </p>
        </div>

        <div className="bg-[#141B2B]/60 backdrop-blur-xl border border-white/10 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-[#94A3B8]">Активные алерты</span>
            <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <p className="text-3xl font-bold text-white">{activeAlerts.length}</p>
          <p className="text-xs text-gray-500 mt-2">
            {activeAlerts.filter(a => a.severity === 'critical').length} критических,{' '}
            {activeAlerts.filter(a => a.severity === 'warning').length} предупреждений
          </p>
        </div>
      </section>

      {/* Status Summary */}
      <div className="flex gap-4">
        <div className="flex items-center gap-2 px-3 py-1.5 bg-green-900/20 rounded-full">
          <div className="w-2 h-2 rounded-full bg-green-500" />
          <span className="text-sm">Норма: {normalCount}</span>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-yellow-900/20 rounded-full">
          <div className="w-2 h-2 rounded-full bg-yellow-500" />
          <span className="text-sm">Внимание: {warningCount}</span>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-red-900/20 rounded-full">
          <div className="w-2 h-2 rounded-full bg-red-500" />
          <span className="text-sm">Авария: {alarmCount}</span>
        </div>
      </div>

      {/* Chart */}
      <div className="bg-[#141B2B]/60 backdrop-blur-xl border border-white/10 rounded-3xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-[#E2E8F0]">Динамика выработки</h3>
            <p className="text-xs text-[#64748B] mt-0.5">Данные обновляются каждые 15 минут</p>
          </div>
        </div>
        <RealTimeChart />
      </div>

      {/* Panel Grid */}
      <div className="bg-[#141B2B]/60 backdrop-blur-xl border border-white/10 rounded-3xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-[#E2E8F0]">Солнечный парк</h3>
            <p className="text-xs text-[#64748B] mt-0.5">Всего панелей: {panels.length}</p>
          </div>
          <div className="flex gap-3 text-xs">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-green-500" />
              <span className="text-[#64748B]">Норма</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-yellow-500" />
              <span className="text-[#64748B]">Внимание</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-red-500" />
              <span className="text-[#64748B]">Авария</span>
            </div>
          </div>
        </div>
        
        <div className="grid grid-cols-10 gap-1.5">
          {panels.map(panel => {
            const hasActiveAlert = activeAlerts.some(a => a.panelId === panel.id);
            const hasCriticalAlert = activeAlerts.some(a => a.panelId === panel.id && a.severity === 'critical');
            
            return (
              <div
                key={panel.id}
                onClick={() => setSelectedPanel(panel.id)}
                className={`
                  w-8 h-8 rounded-md ${getPanelColor(panel)} 
                  transition-all duration-200 hover:scale-110 cursor-pointer
                  flex items-center justify-center text-[10px] font-bold text-white
                  relative
                  ${hasCriticalAlert ? 'ring-2 ring-red-400 ring-offset-2 ring-offset-[#141B2B]' : ''}
                  ${hasActiveAlert && !hasCriticalAlert ? 'ring-1 ring-yellow-400 ring-offset-1 ring-offset-[#141B2B]' : ''}
                `}
                title={
                  hasActiveAlert 
                    ? `Панель #${panel.id}: ${activeAlerts.find(a => a.panelId === panel.id)?.message}\nМощность: ${panel.power} Вт, Температура: ${panel.temperature}°C`
                    : `Панель #${panel.id}: ${panel.power} Вт, ${panel.temperature}°C`
                }
              >
                {panel.id}
              </div>
            );
          })}
        </div>
      </div>

      {/* Panel Detail Modal */}
      {selectedPanel && (
        <PanelDetail panelId={selectedPanel} onClose={() => setSelectedPanel(null)} />
      )}
    </div>
  );
};

export default Dashboard;