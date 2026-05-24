import { useState, useEffect } from 'react'
import LoadingSpinner from '../components/LoadingSpinner'
import { exportChartToCSV, exportChartToPDF } from '../services/exportService'
import * as echarts from 'echarts'

interface Panel {
  id: number
  power: number
  temperature: number
  status: string
}

interface HistoryPoint {
  timestamp: string
  avg_power: number
  total_power: number
  date: string
}

const Analytics = () => {
  const [panels, setPanels] = useState<Panel[]>([])
  const [totalPower, setTotalPower] = useState(0)
  const [temperature, setTemperature] = useState(0)
  const [selectedPeriod, setSelectedPeriod] = useState<'day' | '7days' | '30days'>('day')
  const [selectedPanels, setSelectedPanels] = useState<number[]>([])
  const [historyData, setHistoryData] = useState<HistoryPoint[]>([])
  const [loading, setLoading] = useState(true)
  const [chartInstance, setChartInstance] = useState<echarts.ECharts | null>(null)

  const fetchData = async () => {
    const token = localStorage.getItem('helios_token')
    if (!token) return
    
    try {
      const res = await fetch('/api/data', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const data = await res.json()
      if (data.panels) {
        setPanels(data.panels)
        setTotalPower(data.total_power || 0)
        setTemperature(data.temperature || 0)
      }
    } catch (err) {
      console.error('Fetch error:', err)
    }
  }

  const fetchHistory = async () => {
    const token = localStorage.getItem('helios_token')
    if (!token) return
    
    setLoading(true)
    
    try {
      let url = ''
      switch (selectedPeriod) {
        case 'day':
          // ИСПРАВЛЕНО: последние 24 часа вместо today
          url = '/api/history/park?hours=24'
          break
        case '7days':
          url = '/api/history/park/daily?days=7&exclude_today=true'
          break
        case '30days':
          url = '/api/history/park/daily?days=30&exclude_today=true'
          break
      }
      
      const res = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const data = await res.json()
      
      if (data.history) {
        setHistoryData(data.history)
      }
    } catch (err) {
      console.error('History fetch error:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
    fetchHistory()
  }, [selectedPeriod])

  useEffect(() => {
    if (historyData.length === 0) return

    const chartDom = document.getElementById('trend-chart')
    if (!chartDom) return

    if (chartInstance) {
      chartInstance.dispose()
    }

    const chart = echarts.init(chartDom)
    setChartInstance(chart)

    let timestamps: string[] = []
    let powerData: number[] = []
    
    if (selectedPeriod === 'day') {
      // ИСПРАВЛЕНО: добавляем +3 часа для московского времени
      timestamps = historyData.map(point => {
        const date = new Date(point.timestamp)
        date.setHours(date.getHours() + 3)
        return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
      })
      powerData = historyData.map(point => point.avg_power)
    } else {
      timestamps = historyData.map(point => {
        const date = new Date(point.date)
        return date.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' })
      })
      powerData = historyData.map(point => point.avg_power)
    }

    const option = {
      backgroundColor: 'transparent',
      title: {
        text: selectedPeriod === 'day' ? 'Выработка за последние 24 часа' : 
               selectedPeriod === '7days' ? 'Среднесуточная выработка за 7 дней' : 
               'Среднесуточная выработка за 30 дней',
        textStyle: { color: '#E2E8F0', fontSize: 14 },
        left: 'center',
        top: 0
      },
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        formatter: (params: any) => {
          if (!params || params.length === 0) return ''
          const val = params[0].value
          return `${timestamps[params[0].dataIndex]}<br/>Средняя мощность: ${val} Вт`
        }
      },
      grid: {
        left: '3%',
        right: '4%',
        top: '15%',
        bottom: '3%',
        containLabel: true
      },
      xAxis: {
        type: 'category',
        data: timestamps,
        axisLabel: {
          rotate: timestamps.length > 24 ? 45 : 0,
          interval: selectedPeriod === 'day' ? Math.floor(timestamps.length / 12) : 0,
          color: '#94A3B8',
          fontSize: 10
        },
        axisLine: { lineStyle: { color: '#2D3748' } }
      },
      yAxis: {
        type: 'value',
        name: 'Мощность (Вт)',
        nameTextStyle: { color: '#94A3B8' },
        axisLabel: { color: '#94A3B8' },
        splitLine: { lineStyle: { color: '#2D3748' } }
      },
      series: [
        {
          name: 'Средняя мощность',
          type: 'line',
          data: powerData,
          smooth: true,
          symbol: 'circle',
          symbolSize: 6,
          lineStyle: { width: 2, color: '#F59E0B' },
          areaStyle: {
            opacity: 0.2,
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: '#F59E0B' },
              { offset: 1, color: '#F59E0B00' }
            ])
          },
          itemStyle: { color: '#F59E0B' },
          connectNulls: true
        }
      ]
    }

    chart.setOption(option)
    chart.resize()

    const handleResize = () => chart.resize()
    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
    }
  }, [historyData, selectedPeriod])

  const handleExportCSV = () => {
    if (historyData.length === 0) {
      alert('Нет данных для экспорта')
      return
    }
    
    const periodLabel = selectedPeriod === 'day' ? 'day' : selectedPeriod === '7days' ? '7days' : '30days'
    exportChartToCSV(historyData, periodLabel)
  }

  const handleExportPDF = async () => {
    if (historyData.length === 0) {
      alert('Нет данных для экспорта')
      return
    }
    
    const periodLabel = selectedPeriod === 'day' ? 'day' : selectedPeriod === '7days' ? '7days' : '30days'
    await exportChartToPDF(historyData, periodLabel, 'trend-chart')
  }

  if (loading && historyData.length === 0) {
    return <LoadingSpinner />
  }

  return (
    <div className="space-y-6">
      {/* Управление */}
      <div className="bg-[#141B2B]/60 backdrop-blur-xl border border-white/10 rounded-2xl p-4 flex flex-wrap justify-between items-center gap-4">
        <div className="flex gap-2">
          {(['day', '7days', '30days'] as const).map(period => (
            <button
              key={period}
              onClick={() => setSelectedPeriod(period)}
              className={`px-4 py-2 rounded-xl text-sm transition ${
                selectedPeriod === period
                  ? 'bg-gradient-to-r from-yellow-500 to-orange-500 text-black'
                  : 'bg-white/5 text-[#94A3B8] hover:bg-white/10'
              }`}
            >
              {period === 'day' ? 'День' : period === '7days' ? '7 дней' : '30 дней'}
            </button>
          ))}
        </div>
        
        <div className="flex gap-2">
          <button
            onClick={handleExportCSV}
            className="px-4 py-2 bg-white/5 rounded-xl text-sm hover:bg-white/10 transition"
          >
            Экспорт CSV
          </button>
          <button
            onClick={handleExportPDF}
            className="px-4 py-2 bg-white/5 rounded-xl text-sm hover:bg-white/10 transition"
          >
            Экспорт PDF
          </button>
        </div>
      </div>

      {/* График */}
      <div className="bg-[#141B2B]/60 backdrop-blur-xl border border-white/10 rounded-2xl p-4">
        <h3 className="text-base font-medium text-[#E2E8F0] mb-4">
          {selectedPeriod === 'day' ? 'Динамика выработки за последние 24 часа' : 
            selectedPeriod === '7days' ? 'Среднесуточная выработка за 7 дней' : 
            'Среднесуточная выработка за 30 дней'}
        </h3>
        <div id="trend-chart" style={{ width: '100%', height: '400px' }} />
      </div>

      {/* Сводная таблица */}
      <div className="bg-[#141B2B]/60 backdrop-blur-xl border border-white/10 rounded-2xl p-4">
        <h3 className="text-base font-medium text-[#E2E8F0] mb-4">Текущие показатели панелей</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left py-3 text-[#94A3B8] font-medium">Панель</th>
                <th className="text-left py-3 text-[#94A3B8] font-medium">Мощность (Вт)</th>
                <th className="text-left py-3 text-[#94A3B8] font-medium">Температура (°C)</th>
                <th className="text-left py-3 text-[#94A3B8] font-medium">Статус</th>
                <th className="text-left py-3 text-[#94A3B8] font-medium">Эффективность</th>
              </tr>
            </thead>
            <tbody>
              {panels.map(panel => {
                const efficiency = Math.min(100, Math.round((panel.power / 400) * 100))
                return (
                  <tr key={panel.id} className="border-b border-white/5 hover:bg-white/5 transition">
                    <td className="py-3 font-mono text-[#E2E8F0]">#{panel.id}</td>
                    <td className="py-3 text-[#E2E8F0]">{panel.power}</td>
                    <td className="py-3 text-[#E2E8F0]">{panel.temperature}</td>
                    <td className="py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs ${
                        panel.status === 'normal' ? 'bg-green-900/50 text-green-400' :
                        panel.status === 'warning' ? 'bg-yellow-900/50 text-yellow-400' :
                        'bg-red-900/50 text-red-400'
                      }`}>
                        {panel.status === 'normal' ? 'Норма' : panel.status === 'warning' ? 'Внимание' : 'Авария'}
                      </span>
                    </td>
                    <td className="py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-1.5 bg-white/10 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-gradient-to-r from-yellow-500 to-orange-500 rounded-full"
                            style={{ width: `${efficiency}%` }}
                          />
                        </div>
                        <span className="text-xs text-[#94A3B8]">{efficiency}%</span>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

export default Analytics