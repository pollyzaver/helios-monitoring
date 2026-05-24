type Listener = (data: any) => void

class WebSocketService {
  private ws: WebSocket | null = null
  private listeners: Listener[] = []
  private reconnectTimer: number | null = null
  private pingInterval: number | null = null
  private isConnecting = false

  connect() {
    if (this.ws?.readyState === WebSocket.OPEN) return
    if (this.isConnecting) return
    
    this.isConnecting = true
    console.log('[WS] Connecting...')
    
    try {
      this.ws = new WebSocket('ws://localhost:8000/ws/live')
      
      this.ws.onopen = () => {
        console.log('[WS] Connected')
        this.isConnecting = false
        
        // Пинг каждые 30 секунд
        if (this.pingInterval) clearInterval(this.pingInterval)
        this.pingInterval = window.setInterval(() => {
          if (this.ws?.readyState === WebSocket.OPEN) {
            this.ws.send('ping')
          }
        }, 30000)
      }
      
      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          if (data.type === 'new_data') {
            this.listeners.forEach(listener => listener(data))
          }
        } catch (e) {
          if (event.data !== 'pong') {
            console.error('[WS] Parse error:', e)
          }
        }
      }
      
      this.ws.onerror = (error) => {
        console.error('[WS] Error:', error)
      }
      
      this.ws.onclose = () => {
        console.log('[WS] Disconnected, reconnecting...')
        this.isConnecting = false
        
        if (this.pingInterval) {
          clearInterval(this.pingInterval)
          this.pingInterval = null
        }
        
        if (this.reconnectTimer) clearTimeout(this.reconnectTimer)
        this.reconnectTimer = window.setTimeout(() => {
          this.connect()
        }, 5000)
      }
    } catch (error) {
      console.error('[WS] Connection error:', error)
      this.isConnecting = false
      this.reconnectTimer = window.setTimeout(() => {
        this.connect()
      }, 5000)
    }
  }
  
  disconnect() {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer)
    if (this.pingInterval) clearInterval(this.pingInterval)
    if (this.ws) {
      this.ws.close()
      this.ws = null
    }
  }
  
  subscribe(listener: Listener) {
    this.listeners.push(listener)
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener)
    }
  }
  
  get isConnected() {
    return this.ws?.readyState === WebSocket.OPEN
  }
}

export const websocketService = new WebSocketService()