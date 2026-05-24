import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'

interface RegisterProps {
  onLogin: (token: string, user: any) => void
}

const Register = ({ onLogin }: RegisterProps) => {
  const navigate = useNavigate()
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    if (password !== confirmPassword) {
      setError('Пароли не совпадают')
      setLoading(false)
      return
    }

    if (password.length < 6) {
      setError('Пароль должен содержать минимум 6 символов')
      setLoading(false)
      return
    }

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, full_name: fullName, password })
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.detail || 'Ошибка регистрации')
      }

      const data = await res.json()
      console.log('Register response:', data)
      
      localStorage.setItem('helios_token', data.access_token)
      localStorage.setItem('helios_user', JSON.stringify(data.user))
      
      if (onLogin) {
        onLogin(data.access_token, data.user)
      }
      
      navigate('/')
    } catch (err: any) {
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
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-[#E2E8F0]">Регистрация</h1>
          <p className="text-[#94A3B8] text-sm mt-1">Создайте новый аккаунт</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-[#94A3B8] mb-1">ФИО</label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full px-4 py-2.5 bg-[#0A0F1A] rounded-xl border border-white/10 focus:border-yellow-500/50 focus:outline-none transition text-[#E2E8F0]"
              placeholder="Иван Иванов"
              required
            />
          </div>

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
              placeholder="минимум 6 символов"
              required
            />
          </div>

          <div>
            <label className="block text-sm text-[#94A3B8] mb-1">Подтверждение пароля</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
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
            {loading ? 'Регистрация...' : 'Зарегистрироваться'}
          </button>
        </form>

        <p className="text-center text-sm text-[#64748B] mt-6">
          Уже есть аккаунт?{' '}
          <Link to="/login" className="text-yellow-400 hover:underline">
            Войти
          </Link>
        </p>
      </div>
    </div>
  )
}

export default Register