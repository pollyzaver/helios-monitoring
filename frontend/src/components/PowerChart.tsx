import React, { useEffect, useRef } from 'react'
import * as echarts from 'echarts'

interface PowerChartProps {
  panels: { id: number; power: number }[]
}

const PowerChart: React.FC<PowerChartProps> = ({ panels }) => {
  const chartRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!chartRef.current || panels.length === 0) return

    const chart = echarts.init(chartRef.current)
    
    // Сортируем панели по ID и берём мощность
    const sortedPanels = [...panels].sort((a, b) => a.id - b.id)
    const powers = sortedPanels.map(p => p.power)
    
    const option = {
      backgroundColor: 'transparent',
      title: {
        text: 'Current Power Distribution',
        textStyle: { color: '#E2E8F0', fontSize: 14 },
        left: 'center'
      },
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        formatter: (params: any) => {
          return `Panel #${params[0].name}<br/>Power: ${params[0].value} W`
        }
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '3%',
        containLabel: true
      },
      xAxis: {
        type: 'category',
        data: sortedPanels.map(p => p.id),
        axisLabel: {
          rotate: 45,
          interval: 9,
          color: '#94A3B8'
        }
      },
      yAxis: {
        type: 'value',
        name: 'Power (W)',
        nameTextStyle: { color: '#94A3B8' },
        axisLabel: { color: '#94A3B8' }
      },
      series: [
        {
          name: 'Power',
          type: 'bar',
          data: powers,
          itemStyle: {
            borderRadius: [4, 4, 0, 0],
            color: (params: any) => {
              const value = params.value
              if (value < 50) return '#EF4444'      // red - alarm
              if (value < 150) return '#F59E0B'     // yellow - warning
              return '#10B981'                       // green - normal
            }
          },
          label: {
            show: false
          }
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
  }, [panels])

  return <div ref={chartRef} style={{ width: '100%', height: '300px' }} />
}

export default PowerChart