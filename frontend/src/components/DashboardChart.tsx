import { useEffect, useRef } from 'react'
import * as echarts from 'echarts'

interface DashboardChartProps {
  panels: { id: number; power: number }[]
}

const DashboardChart = ({ panels }: DashboardChartProps) => {
  const chartRef = useRef<HTMLDivElement>(null)
  const chartInstance = useRef<echarts.ECharts | null>(null)
  const isInitialized = useRef(false)

  useEffect(() => {
    if (!chartRef.current || panels.length === 0) return

    // Создаём график только один раз
    if (!isInitialized.current) {
      chartInstance.current = echarts.init(chartRef.current)
      isInitialized.current = true
    }

    const chart = chartInstance.current
    if (!chart) return

    // Генерируем исторические данные за последние 24 часа (один раз при загрузке)
    const hours = Array.from({ length: 24 }, (_, i) => {
      const now = new Date()
      const hour = (now.getHours() - 23 + i + 24) % 24
      return `${hour}:00`
    })

    // Симулированные исторические данные (в реальном приложении — из БД)
    const powerData = hours.map((_, idx) => {
      const hour = parseInt(hours[idx])
      let dayFactor = 0
      if (hour >= 6 && hour <= 18) {
        if (hour <= 12) {
          dayFactor = (hour - 6) / 6
        } else {
          dayFactor = (18 - hour) / 6
        }
      }
      // Базовая симуляция выработки
      return Math.round(350 * dayFactor * (0.7 + Math.random() * 0.6))
    })

    const option = {
      backgroundColor: 'transparent',
      title: {
        text: 'Средняя мощность по парку (24 часа)',
        textStyle: { color: '#E2E8F0', fontSize: 14, fontWeight: 'normal' },
        left: 'center',
        top: 0
      },
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        formatter: (params: any) => {
          return `${params[0].axisValue}<br/>Средняя мощность: ${params[0].value} Вт`
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
        data: hours,
        axisLabel: {
          rotate: 45,
          interval: 3,
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
          itemStyle: { color: '#F59E0B' }
        }
      ]
    }

    chart.setOption(option)

    const handleResize = () => chart.resize()
    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
      // Не уничтожаем график, только убираем слушатель
    }
  }, []) // Пустой массив зависимостей — график создаётся один раз

  return <div ref={chartRef} style={{ width: '100%', height: '300px' }} />
}

export default DashboardChart