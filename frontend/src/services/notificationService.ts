export const requestNotificationPermission = async () => {
  if (!('Notification' in window)) {
    console.log('Браузер не поддерживает уведомления')
    return false
  }
  
  if (Notification.permission === 'granted') {
    return true
  }
  
  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission()
    return permission === 'granted'
  }
  
  return false
}

export const sendNotification = (title: string, body: string, severity: 'critical' | 'warning' = 'critical') => {
  if (!('Notification' in window)) return
  if (Notification.permission !== 'granted') return
  
  const icon = severity === 'critical' 
    ? '/alert-critical.png' 
    : '/alert-warning.png'
  
  const notification = new Notification(title, {
    body: body,
    icon: icon,
    badge: '/badge.png',
    silent: severity !== 'critical',
    requireInteraction: severity === 'critical'
  })
  
  notification.onclick = () => {
    window.focus()
    notification.close()
  }
  
  setTimeout(() => notification.close(), 10000)
}