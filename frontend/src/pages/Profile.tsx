import { useState, useEffect } from 'react'

interface UserProfile {
  id: number
  email: string
  full_name: string
  role: string
  company: string | null
  phone: string | null
  telegram_chat_id: string | null
  notifications_enabled: boolean
  created_at: string
  threshold_power_warning: number
  threshold_power_alarm: number
  threshold_temp_warning: number
  threshold_temp_alarm: number
}

const Profile = () => {
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [formData, setFormData] = useState({
    full_name: '',
    company: '',
    phone: '',
    telegram_chat_id: '',
    notifications_enabled: true
  })

  const [thresholds, setThresholds] = useState({
    power_warning: 150,
    power_alarm: 50,
    temp_warning: 60,
    temp_alarm: 75
  })

  const fetchProfile = async () => {
    const token = localStorage.getItem('helios_token')
    if (!token) return

    try {
      const res = await fetch('/api/auth/me', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const data = await res.json()
      setProfile(data)
      setFormData({
        full_name: data.full_name,
        company: data.company || '',
        phone: data.phone || '',
        telegram_chat_id: data.telegram_chat_id || '',
        notifications_enabled: data.notifications_enabled
      })
      setThresholds({
        power_warning: data.threshold_power_warning,
        power_alarm: data.threshold_power_alarm,
        temp_warning: data.threshold_temp_warning,
        temp_alarm: data.threshold_temp_alarm
      })
    } catch (err) {
      setError('Ошибка загрузки профиля')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchProfile()
  }, [])

  const saveProfile = async () => {
    const token = localStorage.getItem('helios_token')
    if (!token) return

    try {
      // Обновление профиля
      await fetch('/api/auth/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      })

      // Обновление порогов
      await fetch('/api/auth/thresholds', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(thresholds)
      })

      await fetchProfile()
      setIsEditing(false)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (err) {
      setError('Ошибка сохранения')
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <div className="w-8 h-8 border-2 border-helios-accent border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!profile) {
    return <div className="text-center text-red-400">{error || 'Профиль не найден'}</div>
  }

  return (
    <div className="space-y-6">
      {/* Профиль пользователя */}
      <div className="bg-helios-card rounded-xl p-6 border border-gray-800">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h3 className="text-lg font-medium">Профиль пользователя</h3>
            <p className="text-sm text-gray-500 mt-1">Управление учётной записью</p>
          </div>
          {!isEditing ? (
            <button
              onClick={() => setIsEditing(true)}
              className="px-4 py-2 bg-gray-800 rounded-lg text-sm hover:bg-gray-700 transition"
            >
              Редактировать
            </button>
          ) : (
            <div className="flex gap-3">
              <button
                onClick={() => setIsEditing(false)}
                className="px-4 py-2 bg-gray-800 rounded-lg text-sm hover:bg-gray-700 transition"
              >
                Отмена
              </button>
              <button
                onClick={saveProfile}
                className="px-4 py-2 bg-helios-accent rounded-lg text-sm font-medium hover:opacity-90 transition"
              >
                Сохранить
              </button>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">Email</label>
            <div className="px-4 py-2 bg-gray-900 rounded-lg border border-gray-800">
              {profile.email}
            </div>
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">ФИО</label>
            {isEditing ? (
              <input
                type="text"
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                className="w-full px-4 py-2 bg-gray-900 rounded-lg border border-gray-700 focus:border-helios-accent focus:outline-none transition"
              />
            ) : (
              <div className="px-4 py-2 bg-gray-900 rounded-lg border border-gray-800">
                {profile.full_name}
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">Компания</label>
            {isEditing ? (
              <input
                type="text"
                value={formData.company}
                onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                placeholder="Не указано"
                className="w-full px-4 py-2 bg-gray-900 rounded-lg border border-gray-700 focus:border-helios-accent focus:outline-none transition"
              />
            ) : (
              <div className="px-4 py-2 bg-gray-900 rounded-lg border border-gray-800">
                {profile.company || 'Не указано'}
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">Телефон</label>
            {isEditing ? (
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="Не указан"
                className="w-full px-4 py-2 bg-gray-900 rounded-lg border border-gray-700 focus:border-helios-accent focus:outline-none transition"
              />
            ) : (
              <div className="px-4 py-2 bg-gray-900 rounded-lg border border-gray-800">
                {profile.phone || 'Не указан'}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Настройки уведомлений */}
      <div className="bg-helios-card rounded-xl p-6 border border-gray-800">
        <h3 className="text-lg font-medium mb-4">Настройки уведомлений</h3>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium">Включить уведомления</div>
              <div className="text-sm text-gray-500">Получать оповещения о проблемах с панелями</div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={formData.notifications_enabled}
                onChange={(e) => setFormData({ ...formData, notifications_enabled: e.target.checked })}
                className="sr-only peer"
                disabled={!isEditing}
              />
              <div className="w-11 h-6 bg-gray-700 rounded-full peer peer-checked:bg-helios-accent peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all"></div>
            </label>
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">Telegram Chat ID</label>
            {isEditing ? (
              <input
                type="text"
                value={formData.telegram_chat_id}
                onChange={(e) => setFormData({ ...formData, telegram_chat_id: e.target.value })}
                placeholder="Введите ваш Telegram chat ID"
                className="w-full px-4 py-2 bg-gray-900 rounded-lg border border-gray-700 focus:border-helios-accent focus:outline-none transition"
              />
            ) : (
              <div className="px-4 py-2 bg-gray-900 rounded-lg border border-gray-800">
                {profile.telegram_chat_id || 'Не настроен'}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Пороги срабатывания */}
      <div className="bg-helios-card rounded-xl p-6 border border-gray-800">
        <h3 className="text-lg font-medium mb-4">Пороги срабатывания</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm text-gray-400 mb-1">Внимание (мощность &lt; Вт)</label>
            <input
              type="number"
              value={thresholds.power_warning}
              onChange={(e) => setThresholds({ ...thresholds, power_warning: parseInt(e.target.value) })}
              disabled={!isEditing}
              className="w-full px-4 py-2 bg-gray-900 rounded-lg border border-gray-700 focus:border-helios-accent focus:outline-none transition disabled:opacity-50"
            />
          </div>
          
          <div>
            <label className="block text-sm text-gray-400 mb-1">Авария (мощность &lt; Вт)</label>
            <input
              type="number"
              value={thresholds.power_alarm}
              onChange={(e) => setThresholds({ ...thresholds, power_alarm: parseInt(e.target.value) })}
              disabled={!isEditing}
              className="w-full px-4 py-2 bg-gray-900 rounded-lg border border-gray-700 focus:border-helios-accent focus:outline-none transition disabled:opacity-50"
            />
          </div>
          
          <div>
            <label className="block text-sm text-gray-400 mb-1">Внимание (температура &gt; °C)</label>
            <input
              type="number"
              value={thresholds.temp_warning}
              onChange={(e) => setThresholds({ ...thresholds, temp_warning: parseInt(e.target.value) })}
              disabled={!isEditing}
              className="w-full px-4 py-2 bg-gray-900 rounded-lg border border-gray-700 focus:border-helios-accent focus:outline-none transition disabled:opacity-50"
            />
          </div>
          
          <div>
            <label className="block text-sm text-gray-400 mb-1">Авария (температура &gt; °C)</label>
            <input
              type="number"
              value={thresholds.temp_alarm}
              onChange={(e) => setThresholds({ ...thresholds, temp_alarm: parseInt(e.target.value) })}
              disabled={!isEditing}
              className="w-full px-4 py-2 bg-gray-900 rounded-lg border border-gray-700 focus:border-helios-accent focus:outline-none transition disabled:opacity-50"
            />
          </div>
        </div>
      </div>

      {/* Информация о системе */}
      <div className="bg-helios-card rounded-xl p-6 border border-gray-800">
        <h3 className="text-lg font-medium mb-4">Информация о системе</h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between py-2 border-b border-gray-800">
            <span className="text-gray-400">Версия</span>
            <span className="font-mono">Helios v2.0.0</span>
          </div>
          <div className="flex justify-between py-2 border-b border-gray-800">
            <span className="text-gray-400">Роль</span>
            <span className="font-mono">{profile.role === 'admin' ? 'Администратор' : 'Пользователь'}</span>
          </div>
          <div className="flex justify-between py-2 border-b border-gray-800">
            <span className="text-gray-400">Дата регистрации</span>
            <span className="font-mono">{new Date(profile.created_at).toLocaleDateString('ru-RU')}</span>
          </div>
          <div className="flex justify-between py-2">
            <span className="text-gray-400">Источник данных</span>
            <span className="font-mono">Open-Meteo API (Греция)</span>
          </div>
        </div>
      </div>

      {/* Уведомление о сохранении */}
      {saved && (
        <div className="fixed bottom-4 right-4 bg-green-600 text-white px-4 py-2 rounded-lg shadow-lg">
          Профиль сохранён
        </div>
      )}
    </div>
  )
}

export default Profile
