import { useEffect, useState } from 'react'
import { websocketService } from '../services/websocketService'

export const useWebSocket = () => {
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)
  const [isConnected, setIsConnected] = useState(false)

  useEffect(() => {
    // Подключаемся один раз при монтировании приложения
    websocketService.connect()
    
    // Проверяем статус
    setIsConnected(websocketService.isConnected)
    
    // Подписываемся на обновления
    const unsubscribe = websocketService.subscribe((data) => {
      console.log('[WS] New data available, refreshing...', data.timestamp)
      setLastUpdate(new Date())
    })
    
    // Интервал для проверки статуса
    const statusInterval = setInterval(() => {
      setIsConnected(websocketService.isConnected)
    }, 5000)
    
    return () => {
      unsubscribe()
      clearInterval(statusInterval)
      // Не отключаем сервис при размонтировании компонента!
      // Только при полной выгрузке приложения
    }
  }, [])

  return { lastUpdate, isConnected }
}