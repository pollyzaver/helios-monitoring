import { NavLink } from 'react-router-dom'

const Navigation = () => {
  const navItems = [
    { path: '/', label: 'Дашборд' },
    { path: '/analytics', label: 'Аналитика' },
    { path: '/alerts', label: 'Оповещения' },
    { path: '/settings', label: 'Настройки' },
    { path: '/profile', label: 'Профиль' },
  ]

  return (
    <nav className="bg-helios-card/50 backdrop-blur-sm rounded-xl p-1 border border-gray-800">
      <div className="flex gap-1">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                isActive
                  ? 'bg-helios-accent text-black shadow-lg'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800'
              }`
            }
          >
            {item.label}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}

export default Navigation