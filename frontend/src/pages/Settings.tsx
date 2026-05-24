import { useState, useEffect } from 'react'
import AlertGenerator from '../components/AlertGenerator'

const Settings = () => {
  const [connected, setConnected] = useState(false)
  const [userInfo, setUserInfo] = useState<any>(null)

  useEffect(() => {
    const fetchStatus = async () => {
      const token = localStorage.getItem('helios_token')
      if (!token) return
      
      try {
        const res = await fetch('/api/status', {
          headers: { 'Authorization': `Bearer ${token}` }
        })
        const data = await res.json()
        setConnected(data.connected)
      } catch (err) {
        console.error('Status fetch error:', err)
      }
    }
    
    const fetchUserInfo = async () => {
      const token = localStorage.getItem('helios_token')
      if (!token) return
      
      try {
        const res = await fetch('/api/auth/me', {
          headers: { 'Authorization': `Bearer ${token}` }
        })
        const data = await res.json()
        setUserInfo(data)
      } catch (err) {
        console.error('User info error:', err)
      }
    }
    
    fetchStatus()
    fetchUserInfo()
  }, [])

  const handleConnect = async () => {
    const token = localStorage.getItem('helios_token')
    if (!token) return
    
    try {
      await fetch('/api/connect', { 
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const res = await fetch('/api/status', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const data = await res.json()
      setConnected(data.connected)
    } catch (err) {
      console.error('Connect error:', err)
    }
  }

  const handleDisconnect = async () => {
    const token = localStorage.getItem('helios_token')
    if (!token) return
    
    try {
      await fetch('/api/disconnect', { 
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const res = await fetch('/api/status', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const data = await res.json()
      setConnected(data.connected)
    } catch (err) {
      console.error('Disconnect error:', err)
    }
  }

  return (
    <div className="space-y-6">
      {/* Data Logger Connection */}
      <div className="bg-[#141B2B]/60 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-yellow-500/20 rounded-xl flex items-center justify-center">
              <svg className="w-4 h-4 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </div>
            <div>
              <h3 className="text-base font-semibold text-[#E2E8F0]">Data Logger</h3>
              <p className="text-xs text-[#64748B]">Устройство сбора данных с панелей</p>
            </div>
          </div>
        </div>
        
        <div className="p-5">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <div className={`w-2 h-2 rounded-full ${connected ? 'bg-emerald-400 animate-pulse' : 'bg-red-500'}`} />
              <span className="text-sm font-mono text-[#E2E8F0]">
                {connected ? 'ПОДКЛЮЧЕНО' : 'ОТКЛЮЧЕНО'}
              </span>
              {connected && (
                <span className="text-xs text-[#64748B]">
                  Данные поступают в реальном времени
                </span>
              )}
            </div>
            
            <button
              onClick={connected ? handleDisconnect : handleConnect}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition ${
                connected 
                  ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30 border border-red-500/30'
                  : 'bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30 border border-yellow-500/30'
              }`}
            >
              {connected ? 'Отключить' : 'Подключить'}
            </button>
          </div>
          
          {connected && (
            <div className="mt-4 pt-4 border-t border-white/10">
              <div className="flex items-center gap-2 text-xs text-[#64748B]">
                <svg className="w-3 h-3 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span>Интервал сбора данных: 15 минут</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-[#64748B] mt-1">
                <svg className="w-3 h-3 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span>Источник данных: Open-Meteo API (Греция)</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* System Info */}
      <div className="bg-[#141B2B]/60 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-500/20 rounded-xl flex items-center justify-center">
              <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h3 className="text-base font-semibold text-[#E2E8F0]">Информация о системе</h3>
              <p className="text-xs text-[#64748B]">Параметры и источники данных</p>
            </div>
          </div>
        </div>
        
        <div className="p-5 space-y-3">
          <div className="flex justify-between items-center py-2 border-b border-white/5">
            <span className="text-sm text-[#94A3B8]">Версия</span>
            <span className="text-sm font-mono text-[#E2E8F0]">Helios v2.0.0</span>
          </div>
          <div className="flex justify-between items-center py-2 border-b border-white/5">
            <span className="text-sm text-[#94A3B8]">Панелей в парке</span>
            <span className="text-sm font-mono text-[#E2E8F0]">50</span>
          </div>
          <div className="flex justify-between items-center py-2 border-b border-white/5">
            <span className="text-sm text-[#94A3B8]">Интервал опроса</span>
            <span className="text-sm font-mono text-[#E2E8F0]">15 минут</span>
          </div>
          <div className="flex justify-between items-center py-2">
            <span className="text-sm text-[#94A3B8]">Источник погоды</span>
            <span className="text-sm font-mono text-[#E2E8F0]">Open-Meteo API</span>
          </div>
        </div>
      </div>

      {/* Alert Generator (только для админа) */}
      {userInfo?.role === 'admin' && <AlertGenerator />}
    </div>
  )
}

export default Settings