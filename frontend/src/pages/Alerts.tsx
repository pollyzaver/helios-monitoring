import { useState, useEffect } from 'react'
import LoadingSpinner from '../components/LoadingSpinner'
import { requestNotificationPermission, sendNotification } from '../services/notificationService'

interface Alert {
  id: number
  panel_id: number
  type: string
  severity: string
  message: string
  power: number | null
  temperature: number | null
  timestamp: string
  is_acknowledged: boolean
}

const Alerts = () => {
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [filterType, setFilterType] = useState<'all' | 'critical' | 'warning'>('all')
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'acknowledged'>('all')
  const [loading, setLoading] = useState(true)
  const [shownAlerts, setShownAlerts] = useState<Set<number>>(new Set())  // ← добавить эту строку

  const fetchAlerts = async () => {
    const token = localStorage.getItem('helios_token')
    if (!token) return
    
    try {
      const res = await fetch('/api/alerts/history?limit=100', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const data = await res.json()
      
      if (data.alerts) {
        // ← НОВЫЙ КОД ДЛЯ УВЕДОМЛЕНИЙ
        const newCriticalAlerts = data.alerts.filter(
          (alert: Alert) => alert.severity === 'critical' && !alert.is_acknowledged && !shownAlerts.has(alert.id)
        )
        
        for (const alert of newCriticalAlerts) {
          sendNotification(
            'Критический алерт Helios',
            `Панель #${alert.panel_id}: ${alert.message}`,
            'critical'
          )
          setShownAlerts(prev => new Set(prev).add(alert.id))
        }
        // ← КОНЕЦ НОВОГО КОДА
        
        setAlerts(data.alerts)
      }
    } catch (err) {
      console.error('Fetch alerts error:', err)
    } finally {
      setLoading(false)
    }
  }

  const acknowledgeAlert = async (alertId: number) => {
    const token = localStorage.getItem('helios_token')
    if (!token) return
    
    try {
      const res = await fetch(`/api/alerts/${alertId}/acknowledge`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      })
      
      if (res.ok) {
        // Обновляем локальное состояние
        setAlerts(prev =>
          prev.map(alert =>
            alert.id === alertId ? { ...alert, is_acknowledged: true } : alert
          )
        )
      }
    } catch (err) {
      console.error('Acknowledge error:', err)
    }
  }

  useEffect(() => {
    fetchAlerts()
    const interval = setInterval(fetchAlerts, 15000) // Обновляем каждые 15 секунд
    return () => clearInterval(interval)
  }, [])

  const filteredAlerts = alerts.filter(alert => {
    if (filterType !== 'all' && alert.severity !== filterType) return false
    if (filterStatus !== 'all') {
      if (filterStatus === 'active' && alert.is_acknowledged) return false
      if (filterStatus === 'acknowledged' && !alert.is_acknowledged) return false
    }
    return true
  })

  const getSeverityStyles = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-900/50 text-red-300 border-red-800'
      case 'warning': return 'bg-yellow-900/50 text-yellow-300 border-yellow-800'
      default: return 'bg-blue-900/50 text-blue-300 border-blue-800'
    }
  }

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      'power_drop': 'Падение мощности',
      'power_failure': 'Отказ панели',
      'low_power': 'Низкая мощность',
      'overheat': 'Перегрев',
      'overheat_critical': 'Критический перегрев',
      'fluctuation': 'Нестабильность',
      'data_loss': 'Потеря связи',
      'night_generation': 'Ночная аномалия',
      'inverter_fault': 'Сбой инвертора',
      'low_efficiency': 'Низкая эффективность'
    }
    return labels[type] || type
  }

  if (loading) {
    return <LoadingSpinner />
  }

  const activeCount = alerts.filter(a => !a.is_acknowledged).length
  const criticalCount = alerts.filter(a => a.severity === 'critical' && !a.is_acknowledged).length
  const warningCount = alerts.filter(a => a.severity === 'warning' && !a.is_acknowledged).length

  return (
    <div className="space-y-6">
      {/* Заголовок и фильтры */}
      <div className="bg-[#141B2B]/60 backdrop-blur-xl border border-white/10 rounded-2xl p-4 flex flex-wrap justify-between items-center gap-4">
        <div>
          <h2 className="text-xl font-semibold text-[#E2E8F0]">Оповещения системы</h2>
          <p className="text-sm text-[#94A3B8] mt-1">События и предупреждения</p>
        </div>
        <div className="flex gap-3">
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as any)}
            className="px-3 py-1.5 bg-[#0A0F1A] rounded-xl text-sm border border-white/10 focus:border-yellow-500/50 focus:outline-none"
          >
            <option value="all">Все типы</option>
            <option value="critical">Критические</option>
            <option value="warning">Предупреждения</option>
          </select>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as any)}
            className="px-3 py-1.5 bg-[#0A0F1A] rounded-xl text-sm border border-white/10 focus:border-yellow-500/50 focus:outline-none"
          >
            <option value="all">Все статусы</option>
            <option value="active">Активные</option>
            <option value="acknowledged">Подтверждённые</option>
          </select>
        </div>
      </div>

      {/* Активные оповещения (сводка) */}
      {activeCount > 0 && (
        <div className="bg-red-900/20 border border-red-800 rounded-2xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-500/20 rounded-xl flex items-center justify-center">
              <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div>
              <div className="text-lg font-semibold text-red-400">
                {activeCount} активных оповещений
              </div>
              <div className="text-sm text-red-300/70">
                {criticalCount} критических, {warningCount} предупреждений
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Список оповещений */}
      <div className="bg-[#141B2B]/60 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden">
        {filteredAlerts.length === 0 ? (
          <div className="p-8 text-center text-[#94A3B8]">
            <svg className="w-12 h-12 mx-auto mb-3 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p>Нет оповещений</p>
            <p className="text-xs mt-1">Система работает в штатном режиме</p>
          </div>
        ) : (
          <div className="divide-y divide-white/10">
            {filteredAlerts.map(alert => (
              <div key={alert.id} className={`p-4 transition ${!alert.is_acknowledged ? 'bg-red-500/5' : 'opacity-70'}`}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2 flex-wrap">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${getSeverityStyles(alert.severity)}`}>
                        {alert.severity === 'critical' ? 'КРИТИЧЕСКИЙ' : 'ПРЕДУПРЕЖДЕНИЕ'}
                      </span>
                      <span className="text-xs text-[#94A3B8]">
                        Панель #{alert.panel_id}
                      </span>
                      <span className="text-xs text-[#94A3B8]">
                        {new Date(alert.timestamp).toLocaleString('ru-RU')}
                      </span>
                      {alert.is_acknowledged && (
                        <span className="text-xs text-green-500">Подтверждено</span>
                      )}
                    </div>
                    <p className="text-[#E2E8F0]">{alert.message}</p>
                    {(alert.power || alert.temperature) && (
                      <div className="mt-2 flex gap-4 text-xs text-[#94A3B8]">
                        {alert.power !== null && alert.power > 0 && <span>Мощность: {alert.power} Вт</span>}
                        {alert.temperature !== null && alert.temperature > 0 && <span>Температура: {alert.temperature}°C</span>}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      alert.severity === 'critical' ? 'bg-red-500/20 text-red-400' : 'bg-yellow-500/20 text-yellow-400'
                    }`}>
                      {getTypeLabel(alert.type)}
                    </span>
                    {!alert.is_acknowledged && (
                      <button
                        onClick={() => acknowledgeAlert(alert.id)}
                        className="ml-2 px-3 py-1 text-xs bg-white/10 hover:bg-white/20 rounded-lg transition"
                      >
                        Подтвердить
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Статистика */}
      <div className="bg-[#141B2B]/60 backdrop-blur-xl border border-white/10 rounded-2xl p-4">
        <h3 className="text-sm font-medium text-[#94A3B8] mb-3">Сводка</h3>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <div className="text-2xl font-bold text-red-400">
              {alerts.filter(a => a.severity === 'critical' && !a.is_acknowledged).length}
            </div>
            <div className="text-xs text-[#94A3B8]">Критических</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-yellow-400">
              {alerts.filter(a => a.severity === 'warning' && !a.is_acknowledged).length}
            </div>
            <div className="text-xs text-[#94A3B8]">Предупреждений</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-green-400">
              {alerts.filter(a => a.is_acknowledged).length}
            </div>
            <div className="text-xs text-[#94A3B8]">Подтверждено</div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Alerts