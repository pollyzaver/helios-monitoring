import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

interface ChartDataPoint {
  timestamp: string
  avg_power: number
  total_power: number
}

interface Statistics {
  totalEnergy: number
  peakPower: number
  avgPower: number
  dataPoints: number
}

/**
 * Форматирует дату для отображения в московском времени
 */
const formatDateTime = (timestamp: string, format: 'time' | 'date' | 'datetime' = 'datetime') => {
  const date = new Date(timestamp)
  date.setHours(date.getHours() + 3)
  
  switch (format) {
    case 'time':
      return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
    case 'date':
      return `${String(date.getDate()).padStart(2, '0')}.${String(date.getMonth() + 1).padStart(2, '0')}.${date.getFullYear()}`
    default:
      return `${String(date.getDate()).padStart(2, '0')}.${String(date.getMonth() + 1).padStart(2, '0')}.${date.getFullYear()} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
  }
}

/**
 * Рассчитывает статистику по данным графика
 */
const calculateStatistics = (data: ChartDataPoint[]): Statistics => {
  if (data.length === 0) {
    return { totalEnergy: 0, peakPower: 0, avgPower: 0, dataPoints: 0 }
  }
  
  const totalEnergy = data.reduce((sum, point) => sum + point.total_power, 0)
  const peakPower = Math.max(...data.map(point => point.avg_power))
  const avgPower = data.reduce((sum, point) => sum + point.avg_power, 0) / data.length
  
  return {
    totalEnergy: Math.round(totalEnergy * 10) / 10,
    peakPower: Math.round(peakPower),
    avgPower: Math.round(avgPower),
    dataPoints: data.length
  }
}

/**
 * Получает изображение графика с DOM-элемента
 */
const getChartImage = async (chartId: string): Promise<string | null> => {
  const chartDom = document.getElementById(chartId)
  if (!chartDom) return null
  
  const canvas = chartDom.querySelector('canvas')
  if (!canvas) return null
  
  try {
    return canvas.toDataURL('image/png')
  } catch (err) {
    console.error('Ошибка получения изображения графика:', err)
    return null
  }
}

/**
 * Экспорт данных графика в CSV
 */
export const exportChartToCSV = (chartData: ChartDataPoint[], periodLabel: string) => {
  if (!chartData || chartData.length === 0) {
    console.warn('Нет данных для экспорта')
    return
  }
  
  const headers = ['Время (МСК)', 'Средняя мощность (Вт)', 'Общая мощность парка (кВт)']
  
  const rows = chartData.map(point => [
    formatDateTime(point.timestamp, 'datetime'),
    point.avg_power,
    point.total_power
  ])
  
  const stats = calculateStatistics(chartData)
  
  const summary = [
    ['', '', ''],
    ['СТАТИСТИКА ЗА ПЕРИОД:', '', ''],
    [`Всего точек измерения: ${stats.dataPoints}`, '', ''],
    [`Общая выработка: ${stats.totalEnergy} кВт·ч`, '', ''],
    [`Пиковая мощность: ${stats.peakPower} Вт`, '', ''],
    [`Средняя мощность: ${stats.avgPower} Вт`, '', '']
  ]
  
  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.join(',')),
    ...summary.map(row => row.join(','))
  ].join('\n')
  
  // Для CSV кириллица работает через BOM
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)
  link.href = url
  link.setAttribute('download', `helios_chart_${periodLabel}_${new Date().toISOString().slice(0, 19)}.csv`)
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

/**
 * Экспорт данных графика в PDF с изображением графика
 */
export const exportChartToPDF = async (
  chartData: ChartDataPoint[],
  periodLabel: string,
  chartId: string = 'trend-chart'
) => {
  if (!chartData || chartData.length === 0) {
    console.warn('Нет данных для экспорта')
    return
  }
  
  // Для PDF используем стандартные шрифты + график (изображение)
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const stats = calculateStatistics(chartData)
  const currentDate = new Date().toLocaleString('ru-RU', { timeZone: 'Europe/Moscow' })
  
  const chartImage = await getChartImage(chartId)
  
  // Получаем период для отображения
  let periodText = ''
  switch (periodLabel) {
    case 'day': periodText = 'За последние 24 часа'; break
    case '7days': periodText = 'За 7 дней'; break
    case '30days': periodText = 'За 30 дней'; break
    default: periodText = periodLabel
  }
  
  // ========== ЗАГОЛОВОК ==========
  doc.setFontSize(22)
  doc.setTextColor(245, 158, 11)
  // Используем латиницу для заголовка, кириллицу через стандартные методы
  doc.text('Helios Solar Report', 20, 25)
  
  doc.setFontSize(12)
  doc.setTextColor(100, 100, 100)
  doc.text(`Period: ${periodText}`, 20, 38)
  
  doc.setFontSize(10)
  doc.setTextColor(150, 150, 150)
  doc.text(`Generated: ${currentDate}`, 20, 48)
  
  doc.setDrawColor(245, 158, 11)
  doc.line(20, 55, 190, 55)
  
  // ========== СТАТИСТИКА ==========
  doc.setFontSize(14)
  doc.setTextColor(0, 0, 0)
  doc.text('Summary Statistics', 20, 68)
  
  doc.setFontSize(10)
  doc.setTextColor(80, 80, 80)
  doc.text(`• Data points: ${stats.dataPoints}`, 20, 80)
  doc.text(`• Total energy: ${stats.totalEnergy} kWh`, 20, 88)
  doc.text(`• Peak power: ${stats.peakPower} W`, 20, 96)
  doc.text(`• Average power: ${stats.avgPower} W`, 20, 104)
  
  // ========== ГРАФИК ==========
  let currentY = 115
  
  if (chartImage) {
    doc.setFontSize(14)
    doc.setTextColor(0, 0, 0)
    doc.text('Power Generation Chart', 20, currentY)
    currentY += 8
    
    try {
      doc.addImage(chartImage, 'PNG', 20, currentY, 170, 70)
      currentY += 80
    } catch (e) {
      console.error('Failed to add chart image:', e)
      currentY += 20
    }
  } else {
    currentY += 20
  }
  
  // ========== ТАБЛИЦА С ДАННЫМИ ==========
  if (currentY > 240) {
    doc.addPage()
    currentY = 20
  }
  
  doc.setFontSize(14)
  doc.setTextColor(0, 0, 0)
  doc.text('Detailed Measurement Data', 20, currentY)
  
  let displayData = chartData
  const maxRows = 40
  if (chartData.length > maxRows) {
    const step = Math.ceil(chartData.length / maxRows)
    displayData = chartData.filter((_, index) => index % step === 0)
  }
  
  const tableData = displayData.map(point => [
    formatDateTime(point.timestamp, 'datetime'),
    `${point.avg_power}`,
    `${point.total_power}`
  ])
  
  autoTable(doc, {
    startY: currentY + 8,
    head: [['Time (MSK)', 'Avg Power (W)', 'Total Power (kW)']],
    body: tableData,
    theme: 'striped',
    headStyles: { 
      fillColor: [245, 158, 11], 
      textColor: [0, 0, 0],
      fontStyle: 'bold',
      halign: 'center'
    },
    bodyStyles: { fontSize: 8 },
    columnStyles: {
      0: { cellWidth: 50, halign: 'center' },
      1: { cellWidth: 40, halign: 'right' },
      2: { cellWidth: 40, halign: 'right' }
    },
    margin: { left: 20, right: 20 }
  })
  
  // ========== ПОДВАЛ ==========
  const finalY = (doc as any).lastAutoTable?.finalY || 250
  
  doc.setFontSize(8)
  doc.setTextColor(150, 150, 150)
  doc.text('Generated automatically by Helios Monitoring System', 20, finalY + 10)
  doc.text('Data source: Open-Meteo API (Greece)', 20, finalY + 16)
  doc.text('© 2026 Helios Solar Monitoring System', 20, finalY + 22)
  
  doc.save(`helios_report_${periodLabel}_${new Date().toISOString().slice(0, 19)}.pdf`)
}

/**
 * Экспорт данных панелей в CSV
 */
export const exportPanelsToCSV = (panels: any[], totalPower: number, temperature: number) => {
  const headers = ['Panel ID', 'Power (W)', 'Temperature (°C)', 'Status', 'Efficiency (%)']
  
  const rows = panels.map(panel => [
    panel.id,
    panel.power,
    panel.temperature,
    panel.status === 'normal' ? 'Normal' : panel.status === 'warning' ? 'Warning' : 'Alarm',
    panel.efficiency
  ])
  
  const summary = [
    ['', '', '', '', ''],
    ['TOTAL', totalPower, '', '', ''],
    ['AVG TEMP', '', temperature.toFixed(1), '', '']
  ]
  
  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.join(',')),
    ...summary.map(row => row.join(','))
  ].join('\n')
  
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)
  link.href = url
  link.setAttribute('download', `helios_panels_${new Date().toISOString().slice(0, 19)}.csv`)
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}