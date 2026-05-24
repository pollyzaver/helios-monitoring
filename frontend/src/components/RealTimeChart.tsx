import { useEffect, useRef, useState } from 'react'
import * as echarts from 'echarts'
import { useWebSocket } from '../hooks/useWebSocket'

interface HistoryPoint {
  timestamp: string
  avg_power: number
  total_power: number
}

const RealTimeChart = () => {
  const chartRef = useRef<HTMLDivElement>(null)
  const chartInstance = useRef<echarts.ECharts | null>(null)
  const [historyData, setHistoryData] = useState<HistoryPoint[]>([])
  const [loading, setLoading] = useState(true)
  const { lastUpdate } = useWebSocket()

  const fetchHistory = async () => {
    const token = localStorage.getItem('helios_token')
    if (!token) return

    try {
      const res = await fetch('/api/history/park/today', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const data = await res.json()
      console.log('[Chart] Fetched today history:', data)
      
      if (data.history && data.history.length > 0) {
        setHistoryData(data.history)
      } else {
        console.log('[Chart] No history data, generating demo')
        generateDemoData()
      }
    } catch (err) {
      console.error('Failed to fetch history:', err)
      generateDemoData()
    } finally {
      setLoading(false)
    }
  }

  const generateDemoData = () => {
    const demoData: HistoryPoint[] = []
    const now = new Date()
    const currentHour = now.getHours()
    const currentMinute = now.getMinutes()
    
    // Генерируем точки каждые 15 минут
    for (let hour = 0; hour <= currentHour; hour++) {
      const minuteSteps = hour === currentHour ? Math.floor(currentMinute / 15) + 1 : 4
      for (let step = 0; step < minuteSteps; step++) {
        const minute = step * 15
        const hourValue = hour + minute / 60
        
        let dayFactor = 0
        if (hour >= 6 && hour <= 18) {
          if (hour <= 12) {
            dayFactor = (hourValue - 6) / 6
          } else {
            dayFactor = (18 - hourValue) / 6
          }
          dayFactor = Math.max(0, Math.min(1, dayFactor))
        }
        
        const avgPower = Math.round(350 * dayFactor * (0.7 + Math.random() * 0.6))
        const totalPower = Math.round(avgPower * 50 / 1000 * 10) / 10
        
        const timestamp = new Date()
        timestamp.setHours(hour, minute, 0, 0)
        
        demoData.push({
          timestamp: timestamp.toISOString(),
          avg_power: avgPower,
          total_power: totalPower
        })
      }
    }
    
    setHistoryData(demoData)
  }

  useEffect(() => {
    fetchHistory()
  }, [])

  useEffect(() => {
    if (lastUpdate) {
      console.log('[Chart] Refreshing due to new data')
      fetchHistory()
    }
  }, [lastUpdate])

  useEffect(() => {
    if (!chartRef.current) return
    if (historyData.length === 0) return

    if (!chartInstance.current) {
      chartInstance.current = echarts.init(chartRef.current)
    }

    const chart = chartInstance.current
    if (!chart) return

    // Подготовка данных для графика — показываем локальное время
    const timestamps = historyData.map(point => {
      const date = new Date(point.timestamp)
      // Добавляем 3 часа для московского времени
      date.setHours(date.getHours() + 3)
      return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
    })
    
    const powerData = historyData.map(point => point.avg_power)

    const option = {
      backgroundColor: 'transparent',
      title: {
        text: `Выработка за сегодня, ${new Date().toLocaleDateString('ru-RU')}`,
        textStyle: { color: '#E2E8F0', fontSize: 14, fontWeight: 'normal' },
        left: 'center',
        top: 0
      },
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        formatter: (params: any) => {
          if (!params || params.length === 0) return ''
          const point = historyData[params[0].dataIndex]
          return `${timestamps[params[0].dataIndex]}<br/>
                  Средняя мощность: ${params[0].value} Вт<br/>
                  Общая мощность: ${point.total_power} кВт`
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
          interval: Math.floor(timestamps.length / 12),
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

    chart.setOption(option, { notMerge: false })
    chart.resize()

    const handleResize = () => chart.resize()
    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
    }
  }, [historyData])

  if (loading) {
    return (
      <div className="h-[300px] flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-yellow-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (historyData.length === 0) {
    return (
      <div className="h-[300px] flex items-center justify-center text-[#94A3B8]">
        Нет данных за сегодня
      </div>
    )
  }

  return <div ref={chartRef} style={{ width: '100%', height: '300px' }} />
}

export default RealTimeChart