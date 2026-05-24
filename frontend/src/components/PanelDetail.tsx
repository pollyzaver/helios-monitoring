import { useState, useEffect } from 'react'
import LoadingSpinner from './LoadingSpinner'
import * as echarts from 'echarts'

interface PanelDetailProps {
  panelId: number
  onClose: () => void
}

interface PanelData {
  id: number
  power: number
  temperature: number
  status: 'normal' | 'warning' | 'alarm'
}

interface HistoryPoint {
  timestamp: string
  power: number
  temperature: number
  status: string
}

const PanelDetail = ({ panelId, onClose }: PanelDetailProps) => {
  const [panel, setPanel] = useState<PanelData | null>(null)
  const [history, setHistory] = useState<HistoryPoint[]>([])
  const [loading, setLoading] = useState(true)
  const [chartRef, setChartRef] = useState<HTMLDivElement | null>(null)

  useEffect(() => {
    const fetchPanelData = async () => {
      const token = localStorage.getItem('helios_token')
      if (!token) return
      
      try {
        // Получаем текущие данные панели
        const resData = await fetch('/api/data', {
          headers: { 'Authorization': `Bearer ${token}` }
        })
        const data = await resData.json()
        const found = data.panels?.find((p: PanelData) => p.id === panelId)
        setPanel(found || null)
        
        // Получаем историю измерений панели за последние 6 часов
        const resHistory = await fetch(`/api/panel/${panelId}/history?hours=6`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
        const historyData = await resHistory.json()
        
        if (historyData.measurements && historyData.measurements.length > 0) {
          setHistory(historyData.measurements)
        } else {
          // Если нет данных — генерируем демо
          generateDemoHistory()
        }
      } catch (err) {
        console.error('Error fetching panel data:', err)
        generateDemoHistory()
      } finally {
        setLoading(false)
      }
    }
    
    const generateDemoHistory = () => {
      const now = new Date()
      const demoHistory: HistoryPoint[] = []
      for (let i = 24; i >= 0; i--) {
        const time = new Date(now.getTime() - i * 15 * 60 * 1000)
        const hour = time.getHours()
        let dayFactor = 0
        if (hour >= 6 && hour <= 18) {
          if (hour <= 12) {
            dayFactor = (hour - 6) / 6
          } else {
            dayFactor = (18 - hour) / 6
          }
        }
        const power = Math.round(300 * dayFactor * (0.7 + Math.random() * 0.6))
        demoHistory.push({
          timestamp: time.toISOString(),
          power: power,
          temperature: 20 + power / 30,
          status: 'normal'
        })
      }
      setHistory(demoHistory)
    }
    
    fetchPanelData()
  }, [panelId])

  // Рендерим график после загрузки данных
  useEffect(() => {
    if (!chartRef || history.length === 0) return
    
    const chart = echarts.init(chartRef)
    
    const timestamps = history.map(point => {
      const date = new Date(point.timestamp)
      return `${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`
    })
    
    const powerData = history.map(point => point.power)
    const tempData = history.map(point => point.temperature)
    
    const option = {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        formatter: (params: any) => {
          const idx = params[0].dataIndex
          return `${timestamps[idx]}<br/>
                  Мощность: ${powerData[idx]} Вт<br/>
                  Температура: ${tempData[idx]}°C`
        }
      },
      legend: {
        data: ['Мощность (Вт)', 'Температура (°C)'],
        textStyle: { color: '#94A3B8' },
        bottom: 0
      },
      grid: {
        left: '3%',
        right: '4%',
        top: '10%',
        bottom: '15%',
        containLabel: true
      },
      xAxis: {
        type: 'category',
        data: timestamps,
        axisLabel: {
          rotate: 45,
          interval: Math.floor(timestamps.length / 6),
          color: '#94A3B8',
          fontSize: 10
        },
        axisLine: { lineStyle: { color: '#2D3748' } }
      },
      yAxis: [
        {
          type: 'value',
          name: 'Мощность (Вт)',
          nameTextStyle: { color: '#94A3B8' },
          axisLabel: { color: '#94A3B8' },
          splitLine: { lineStyle: { color: '#2D3748' } }
        },
        {
          type: 'value',
          name: 'Температура (°C)',
          nameTextStyle: { color: '#94A3B8' },
          axisLabel: { color: '#94A3B8' },
          splitLine: { show: false }
        }
      ],
      series: [
        {
          name: 'Мощность (Вт)',
          type: 'line',
          data: powerData,
          smooth: true,
          symbol: 'circle',
          symbolSize: 4,
          lineStyle: { width: 2, color: '#F59E0B' },
          areaStyle: { opacity: 0.1, color: '#F59E0B' }
        },
        {
          name: 'Температура (°C)',
          type: 'line',
          data: tempData,
          smooth: true,
          symbol: 'circle',
          symbolSize: 4,
          lineStyle: { width: 2, color: '#3B82F6' },
          yAxisIndex: 1
        }
      ]
    }
    
    chart.setOption(option)
    
    const handleResize = () => chart.resize()
    window.addEventListener('resize', handleResize)
    
    return () => {
      window.removeEventListener('resize', handleResize)
      chart.dispose()
    }
  }, [chartRef, history])

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
        <div className="bg-[#141B2B]/80 backdrop-blur-xl rounded-2xl p-8">
          <LoadingSpinner />
        </div>
      </div>
    )
  }

  if (!panel) {
    return (
      <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
        <div className="bg-[#141B2B]/80 backdrop-blur-xl rounded-2xl p-6 text-center">
          <p className="text-red-400">Панель #{panelId} не найдена</p>
          <button
            onClick={onClose}
            className="mt-4 px-4 py-2 bg-white/10 rounded-xl hover:bg-white/20 transition"
          >
            Закрыть
          </button>
        </div>
      </div>
    )
  }

  const efficiency = Math.min(100, Math.round((panel.power / 400) * 100))
  
  const getStatusLabel = (status: string) => {
    if (status === 'alarm') return 'Авария'
    if (status === 'warning') return 'Внимание'
    return 'Норма'
  }
  
  const getStatusColor = (status: string) => {
    if (status === 'alarm') return 'text-red-400 bg-red-900/30'
    if (status === 'warning') return 'text-yellow-400 bg-yellow-900/30'
    return 'text-green-400 bg-green-900/30'
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-[#141B2B]/95 backdrop-blur-xl rounded-2xl w-full max-w-2xl border border-white/10" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center p-4 border-b border-white/10">
          <h3 className="text-lg font-medium text-[#E2E8F0]">Панель #{panelId}</h3>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl hover:bg-white/10 transition flex items-center justify-center text-[#94A3B8] hover:text-[#E2E8F0]"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <div className="p-5 space-y-5">
          {/* Текущие значения */}
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-3 bg-white/5 rounded-xl">
              <div className="text-2xl font-bold text-yellow-400">{panel.power}</div>
              <div className="text-xs text-[#64748B] mt-1">Мощность (Вт)</div>
            </div>
            <div className="text-center p-3 bg-white/5 rounded-xl">
              <div className="text-2xl font-bold text-blue-400">{panel.temperature}</div>
              <div className="text-xs text-[#64748B] mt-1">Температура (°C)</div>
            </div>
            <div className="text-center p-3 bg-white/5 rounded-xl">
              <div className="text-2xl font-bold text-emerald-400">{efficiency}%</div>
              <div className="text-xs text-[#64748B] mt-1">Эффективность</div>
            </div>
          </div>
          
          {/* Статус */}
          <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl">
            <span className="text-sm text-[#94A3B8]">Статус</span>
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(panel.status)}`}>
              {getStatusLabel(panel.status)}
            </span>
          </div>
          
          {/* График за последние 6 часов */}
          <div>
            <div className="text-sm text-[#94A3B8] mb-3">Динамика за последние 6 часов</div>
            <div className="h-64 w-full">
              <div ref={(ref) => setChartRef(ref)} style={{ width: '100%', height: '100%' }} />
            </div>
            <div className="flex justify-between text-[10px] text-[#64748B] mt-2">
              <span>6ч назад</span>
              <span>3ч</span>
              <span>Сейчас</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default PanelDetail