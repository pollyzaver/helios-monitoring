const API_BASE = '/api'

async function request(endpoint: string, options: RequestInit = {}) {
  const token = localStorage.getItem('helios_token')
  
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers
  }
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }
  
  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers
  })
  
  if (response.status === 401) {
    // Токен истёк — очищаем и перенаправляем на логин
    localStorage.removeItem('helios_token')
    localStorage.removeItem('helios_user')
    window.location.href = '/login'
    throw new Error('Session expired')
  }
  
  return response
}

export const api = {
  get: (endpoint: string) => request(endpoint),
  post: (endpoint: string, data?: any) => request(endpoint, {
    method: 'POST',
    body: data ? JSON.stringify(data) : undefined
  }),
  put: (endpoint: string, data?: any) => request(endpoint, {
    method: 'PUT',
    body: data ? JSON.stringify(data) : undefined
  }),
  delete: (endpoint: string) => request(endpoint, { method: 'DELETE' })
}
