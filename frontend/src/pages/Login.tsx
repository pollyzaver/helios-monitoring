import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'

interface LoginProps {
  onLogin: (token: string, user: any) => void
}

const Login = ({ onLogin }: LoginProps) => {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.detail || 'Ошибка входа')
      }

      const data = await res.json()
      console.log('Login response:', data)
      
      // Сохраняем в localStorage
      localStorage.setItem('helios_token', data.access_token)
      localStorage.setItem('helios_user', JSON.stringify(data.user))
      
      // Вызываем onLogin если передан
      if (onLogin && typeof onLogin === 'function') {
        onLogin(data.access_token, data.user)
      }
      
      // Перенаправляем на главную
      console.log('Navigating to /')
      navigate('/')
      
    } catch (err: any) {
      console.error('Login error:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0A0F1A] flex items-center justify-center p-6">
      <div className="bg-[#141B2B]/60 backdrop-blur-xl border border-white/10 rounded-2xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-xl flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-[#E2E8F0]">Helios</h1>
          <p className="text-[#94A3B8] text-sm mt-1">Вход в систему мониторинга</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-[#94A3B8] mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2.5 bg-[#0A0F1A] rounded-xl border border-white/10 focus:border-yellow-500/50 focus:outline-none transition text-[#E2E8F0]"
              placeholder="user@example.com"
              required
            />
          </div>

          <div>
            <label className="block text-sm text-[#94A3B8] mb-1">Пароль</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2.5 bg-[#0A0F1A] rounded-xl border border-white/10 focus:border-yellow-500/50 focus:outline-none transition text-[#E2E8F0]"
              placeholder="••••••••"
              required
            />
          </div>

          {error && (
            <div className="p-3 bg-red-900/30 border border-red-800 rounded-xl text-red-400 text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-xl font-medium hover:opacity-90 transition disabled:opacity-50"
          >
            {loading ? 'Вход...' : 'Войти'}
          </button>
        </form>

        <p className="text-center text-sm text-[#64748B] mt-6">
          Нет аккаунта?{' '}
          <Link to="/register" className="text-yellow-400 hover:underline">
            Зарегистрироваться
          </Link>
        </p>

        <div className="mt-4 p-3 bg-white/5 rounded-xl text-xs text-[#64748B] text-center">
          <p>Тестовый аккаунт:</p>
          <p className="font-mono">admin@helios.com / admin123</p>
        </div>
      </div>
    </div>
  )
}

export default Login