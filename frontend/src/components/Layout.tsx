import * as React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';

// Иконки (простой SVG)
const Icons = {
  dashboard: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
    </svg>
  ),
  analytics: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  ),
  alerts: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    </svg>
  ),
  settings: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
  logout: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
    </svg>
  ),
  bell: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
    </svg>
  ),
  sun: (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
    </svg>
  ),
};

interface LayoutProps {
  children: React.ReactNode;
  connected: boolean;
  onDisconnect?: () => void;
  user?: any;
}

const Layout = ({ children, connected, onDisconnect, user }: LayoutProps) => {
  const navigate = useNavigate();

  // Убираем пункт "Профиль" из навигации, так как он уже в правом углу
  const navItems = [
    { path: '/', label: 'Дашборд', icon: Icons.dashboard },
    { path: '/analytics', label: 'Аналитика', icon: Icons.analytics },
    { path: '/alerts', label: 'Оповещения', icon: Icons.alerts },
    { path: '/settings', label: 'Настройки', icon: Icons.settings },
  ];

  const handleLogout = () => {
    localStorage.removeItem('helios_token');
    localStorage.removeItem('helios_user');
    if (onDisconnect) onDisconnect();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-[#0A0F1A] text-[#E2E8F0] overflow-hidden">
      {/* Background Effects */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/3 w-[600px] h-[600px] bg-yellow-500/10 blur-[140px] rounded-full" />
        <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-emerald-500/10 blur-[120px] rounded-full" />
      </div>

      {/* Header — убрали лишние обводки */}
      <header className="sticky top-0 z-50 bg-[#0A0F1A]/80 backdrop-blur-2xl">
        <div className="max-w-[1600px] mx-auto px-6">
          <div className="h-16 flex items-center justify-between">
            {/* Logo */}
            <div className="flex items-center gap-2">
              <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-yellow-400/20 to-orange-500/20">
                {Icons.sun}
              </div>
              <div>
                <h1 className="text-lg font-bold bg-gradient-to-r from-yellow-300 to-orange-400 bg-clip-text text-transparent">
                  Helios
                </h1>
              </div>
            </div>

            {/* Navigation — убрали обводки */}
            <nav className="hidden md:flex items-center gap-1">
              {navItems.map(item => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={({ isActive }) =>
                    `
                      flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200
                      ${
                        isActive
                          ? 'bg-yellow-500/10 text-yellow-400'
                          : 'text-[#94A3B8] hover:text-[#E2E8F0] hover:bg-white/5'
                      }
                    `
                  }
                >
                  {item.icon}
                  <span>{item.label}</span>
                </NavLink>
              ))}
            </nav>

            {/* Right — упростили */}
            <div className="flex items-center gap-3">
              {/* Лаконичный индикатор онлайна */}
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${connected ? 'bg-emerald-400 animate-pulse' : 'bg-red-500'}`} />
                <span className="text-xs text-[#64748B] font-mono">
                  {connected ? 'LIVE' : 'OFFLINE'}
                </span>
              </div>

              {/* Data Logger статус — маленькая метка */}
              {connected && (
                <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-yellow-500/5">
                  <svg className="w-3 h-3 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 12h14M12 5l7 7-7 7" />
                  </svg>
                  <span className="text-xs text-yellow-400">Data Logger</span>
                </div>
              )}

              {/* Пользователь — компактно */}
              <button
                onClick={() => navigate('/profile')}
                className="flex items-center gap-2 px-2 py-1.5 rounded-xl hover:bg-white/5 transition"
              >
                <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-gradient-to-br from-yellow-400/20 to-orange-500/20 text-yellow-400">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <span className="hidden lg:block text-sm text-[#E2E8F0] max-w-[100px] truncate">
                  {user?.full_name?.split(' ')[0] || 'Профиль'}
                </span>
              </button>

              {/* Выход — иконка без текста */}
              <button
                onClick={handleLogout}
                className="p-2 rounded-xl hover:bg-red-500/10 transition text-[#94A3B8] hover:text-red-400"
                title="Выйти"
              >
                {Icons.logout}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 max-w-[1600px] mx-auto px-6 py-6">
        {children}
      </main>

      {/* Footer — упростили */}
      <footer className="relative z-10 border-t border-white/5 mt-8">
        <div className="max-w-[1600px] mx-auto px-6 py-4 flex flex-col md:flex-row items-center justify-between gap-3">
          <p className="text-xs text-[#64748B]">Helios — Система мониторинга солнечных панелей</p>
          <div className="flex items-center gap-4 text-[10px] text-[#64748B]">
            <span>API v2.0</span>
            <span>Open-Meteo (Греция)</span>
            <span>© 2026</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Layout;