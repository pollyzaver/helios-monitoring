import { useState, useEffect, useRef } from 'react'

interface AlertType {
  id: string
  name: string
  severity: string
  description: string
}

interface ScheduledAlert {
  id: number
  panelId: number
  alertType: string
  delayMinutes: number
  scheduledTime: string
  timeoutId?: number
}

const AlertGenerator = () => {
  const [alertTypes, setAlertTypes] = useState<AlertType[]>([])
  const [selectedPanel, setSelectedPanel] = useState<number>(1)
  const [selectedType, setSelectedType] = useState<string>('power_drop')
  const [customMessage, setCustomMessage] = useState('')
  const [delayMinutes, setDelayMinutes] = useState<number>(0)
  const [loading, setLoading] = useState(false)
  const [scheduledAlerts, setScheduledAlerts] = useState<ScheduledAlert[]>([])
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const timeoutRefs = useRef<Map<number, number>>(new Map())

  useEffect(() => {
    const userStr = localStorage.getItem('helios_user')
    if (userStr) {
      const user = JSON.parse(userStr)
      setIsAdmin(user.role === 'admin')
    }
    
    const fetchAlertTypes = async () => {
      const token = localStorage.getItem('helios_token')
      if (!token) return
      
      try {
        const res = await fetch('/api/admin/alert-types', {
          headers: { 'Authorization': `Bearer ${token}` }
        })
        const data = await res.json()
        if (data.alert_types) {
          setAlertTypes(data.alert_types)
        }
      } catch (err) {
        setAlertTypes([
          { id: 'power_drop', name: 'Падение мощности', severity: 'critical', description: 'Резкое падение мощности панели' },
          { id: 'overheat', name: 'Перегрев', severity: 'warning', description: 'Критический перегрев панели' },
          { id: 'data_loss', name: 'Потеря данных', severity: 'critical', description: 'Потеря связи с панелью' },
          { id: 'night_generation', name: 'Ночная аномалия', severity: 'warning', description: 'Аномальная выработка ночью' },
          { id: 'fluctuation', name: 'Нестабильность', severity: 'warning', description: 'Нестабильная выработка' },
          { id: 'inverter_fault', name: 'Сбой инвертора', severity: 'critical', description: 'Сбой в работе инвертора' }
        ])
      }
    }
    
    fetchAlertTypes()
    
    // Загружаем запланированные алерты из localStorage и восстанавливаем таймеры
    const saved = localStorage.getItem('helios_scheduled_alerts')
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        setScheduledAlerts(parsed)
        // Восстанавливаем таймеры для сохранённых алертов
        parsed.forEach((alert: ScheduledAlert) => {
          const scheduledTime = new Date(alert.scheduledTime).getTime()
          const now = Date.now()
          const remainingMs = scheduledTime - now
          
          if (remainingMs > 0 && remainingMs < 3600000) { // только если осталось меньше часа
            const timeoutId = setTimeout(() => {
              executeScheduledAlert(alert.id, alert.panelId, alert.alertType)
            }, remainingMs)
            timeoutRefs.current.set(alert.id, timeoutId)
          } else if (remainingMs <= 0) {
            // Просроченный алерт — удаляем
            removeScheduledAlert(alert.id)
          }
        })
      } catch (e) {}
    }

    return () => {
      // Очищаем все таймеры при размонтировании
      timeoutRefs.current.forEach(timeout => clearTimeout(timeout))
      timeoutRefs.current.clear()
    }
  }, [])

  const executeScheduledAlert = async (alertId: number, panelId: number, alertType: string) => {
    const token = localStorage.getItem('helios_token')
    if (!token) return
    
    try {
      const res = await fetch('/api/admin/generate-alert', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          panel_id: panelId,
          alert_type: alertType,
          custom_message: undefined
        })
      })
      
      if (res.ok) {
        // Удаляем из списка запланированных
        removeScheduledAlert(alertId)
        setResult({ success: true, message: `Запланированный алерт для панели #${panelId} выполнен` })
        setTimeout(() => setResult(null), 3000)
      }
    } catch (err) {
      console.error('Scheduled alert failed:', err)
    }
  }

  const removeScheduledAlert = (id: number) => {
    // Очищаем таймер
    const timeout = timeoutRefs.current.get(id)
    if (timeout) {
      clearTimeout(timeout)
      timeoutRefs.current.delete(id)
    }
    
    // Удаляем из состояния и localStorage
    setScheduledAlerts(prev => {
      const updated = prev.filter(a => a.id !== id)
      localStorage.setItem('helios_scheduled_alerts', JSON.stringify(updated))
      return updated
    })
  }

  const generateAlert = async (scheduleMinutes: number = 0) => {
    const token = localStorage.getItem('helios_token')
    if (!token) return
    
    setLoading(true)
    setResult(null)
    
    const executeGeneration = async (): Promise<boolean> => {
      try {
        const res = await fetch('/api/admin/generate-alert', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            panel_id: selectedPanel,
            alert_type: selectedType,
            custom_message: customMessage || undefined
          })
        })
        
        const data = await res.json()
        
        if (res.ok) {
          setResult({ success: true, message: `Алерт для панели #${selectedPanel} создан` })
          setCustomMessage('')
          return true
        } else {
          setResult({ success: false, message: data.detail || 'Ошибка генерации' })
          return false
        }
      } catch (err) {
        setResult({ success: false, message: 'Ошибка соединения' })
        return false
      }
    }
    
    if (scheduleMinutes > 0) {
      const scheduledTime = new Date()
      scheduledTime.setMinutes(scheduledTime.getMinutes() + scheduleMinutes)
      
      const newScheduled: ScheduledAlert = {
        id: Date.now(),
        panelId: selectedPanel,
        alertType: selectedType,
        delayMinutes: scheduleMinutes,
        scheduledTime: scheduledTime.toISOString()
      }
      
      // Устанавливаем таймер
      const timeoutId = setTimeout(() => {
        executeScheduledAlert(newScheduled.id, newScheduled.panelId, newScheduled.alertType)
      }, scheduleMinutes * 60 * 1000)
      
      timeoutRefs.current.set(newScheduled.id, timeoutId)
      
      setScheduledAlerts(prev => {
        const updated = [...prev, newScheduled]
        localStorage.setItem('helios_scheduled_alerts', JSON.stringify(updated))
        return updated
      })
      
      setResult({ success: true, message: `Алерт запланирован через ${scheduleMinutes} мин.` })
      setTimeout(() => setResult(null), 3000)
      setLoading(false)
    } else {
      await executeGeneration()
      setLoading(false)
    }
  }

  const cancelScheduledAlert = (id: number) => {
    removeScheduledAlert(id)
    setResult({ success: true, message: 'Запланированный алерт отменён' })
    setTimeout(() => setResult(null), 3000)
  }

  if (!isAdmin) {
    return (
      <div className="bg-[#141B2B]/60 backdrop-blur-xl border border-white/10 rounded-2xl p-6 text-center">
        <div className="w-12 h-12 bg-gray-800 rounded-xl flex items-center justify-center mx-auto mb-3">
          <svg className="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>
        <p className="text-sm text-[#94A3B8]">Доступно только администраторам</p>
      </div>
    )
  }

  const selectedAlertType = alertTypes.find(t => t.id === selectedType)

  return (
    <div className="bg-[#141B2B]/60 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden">
      <div className="px-5 py-4 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-red-500/20 rounded-xl flex items-center justify-center">
            <svg className="w-4 h-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <div>
            <h3 className="text-base font-semibold text-[#E2E8F0]">Генерация алертов</h3>
            <p className="text-xs text-[#64748B]">Тестирование системы оповещений</p>
          </div>
        </div>
      </div>
      
      <div className="p-5 space-y-4">
        <div>
          <label className="block text-sm text-[#94A3B8] mb-1">Панель</label>
          <select
            value={selectedPanel}
            onChange={(e) => setSelectedPanel(parseInt(e.target.value))}
            className="w-full px-4 py-2 bg-[#0A0F1A] rounded-xl border border-white/10 focus:border-yellow-500/50 focus:outline-none text-[#E2E8F0]"
          >
            {Array.from({ length: 50 }, (_, i) => i + 1).map(num => (
              <option key={num} value={num}>Панель #{num}</option>
            ))}
          </select>
        </div>
        
        <div>
          <label className="block text-sm text-[#94A3B8] mb-1">Тип алерта</label>
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="w-full px-4 py-2 bg-[#0A0F1A] rounded-xl border border-white/10 focus:border-yellow-500/50 focus:outline-none text-[#E2E8F0]"
          >
            {alertTypes.map(type => (
              <option key={type.id} value={type.id}>
                {type.name} ({type.severity === 'critical' ? 'КРИТИЧЕСКИЙ' : 'ПРЕДУПРЕЖДЕНИЕ'})
              </option>
            ))}
          </select>
          {selectedAlertType && (
            <p className="text-xs text-[#64748B] mt-1">{selectedAlertType.description}</p>
          )}
        </div>
        
        <div>
          <label className="block text-sm text-[#94A3B8] mb-1">Сообщение (опционально)</label>
          <input
            type="text"
            value={customMessage}
            onChange={(e) => setCustomMessage(e.target.value)}
            placeholder="Своё сообщение для алерта"
            className="w-full px-4 py-2 bg-[#0A0F1A] rounded-xl border border-white/10 focus:border-yellow-500/50 focus:outline-none text-[#E2E8F0] placeholder:text-[#64748B]"
          />
        </div>
        
        <div>
          <label className="block text-sm text-[#94A3B8] mb-1">Отложить на (минут)</label>
          <div className="flex gap-2">
            <select
              value={delayMinutes}
              onChange={(e) => setDelayMinutes(parseInt(e.target.value))}
              className="flex-1 px-4 py-2 bg-[#0A0F1A] rounded-xl border border-white/10 focus:border-yellow-500/50 focus:outline-none text-[#E2E8F0]"
            >
              <option value={0}>Сейчас</option>
              <option value={1}>Через 1 минуту</option>
              <option value={5}>Через 5 минут</option>
              <option value={10}>Через 10 минут</option>
              <option value={15}>Через 15 минут</option>
              <option value={30}>Через 30 минут</option>
              <option value={60}>Через 1 час</option>
            </select>
          </div>
        </div>
        
        <button
          onClick={() => generateAlert(delayMinutes)}
          disabled={loading}
          className="w-full py-2 bg-gradient-to-r from-red-500 to-orange-500 rounded-xl font-medium hover:opacity-90 transition disabled:opacity-50 text-white"
        >
          {loading ? 'Генерация...' : delayMinutes > 0 ? `Запланировать (через ${delayMinutes} мин)` : 'Сгенерировать сейчас'}
        </button>
        
        {result && (
          <div className={`p-3 rounded-xl text-sm ${result.success ? 'bg-emerald-900/30 text-emerald-400' : 'bg-red-900/30 text-red-400'}`}>
            {result.message}
          </div>
        )}
        
        {scheduledAlerts.length > 0 && (
          <div className="mt-2 pt-3 border-t border-white/10">
            <p className="text-xs text-[#64748B] mb-2">Запланированные:</p>
            <div className="space-y-2">
              {scheduledAlerts.map(alert => (
                <div key={alert.id} className="flex items-center justify-between p-2 bg-white/5 rounded-xl">
                  <div>
                    <span className="text-xs font-mono text-[#E2E8F0]">Панель #{alert.panelId}</span>
                    <span className="text-xs text-[#64748B] ml-2">
                      {new Date(alert.scheduledTime).toLocaleTimeString()}
                    </span>
                  </div>
                  <button
                    onClick={() => cancelScheduledAlert(alert.id)}
                    className="text-xs text-red-400 hover:text-red-300 transition"
                  >
                    Отменить
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default AlertGenerator