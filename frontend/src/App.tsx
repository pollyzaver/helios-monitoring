import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import Register from './pages/Register';
import Analytics from './pages/Analytics';
import Alerts from './pages/Alerts';
import Settings from './pages/Settings';
import Profile from './pages/Profile';
import Dashboard from './pages/Dashboard';
import { requestNotificationPermission } from './services/notificationService'

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(true);

  const checkAuth = async () => {
    const token = localStorage.getItem('helios_token');
    const userData = localStorage.getItem('helios_user');
    
    if (token && userData) {
      try {
        const res = await fetch('/api/auth/me', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (res.ok) {
          const user = await res.json();
          setIsAuthenticated(true);
          setUser(user);
          localStorage.setItem('helios_user', JSON.stringify(user));
        } else {
          localStorage.removeItem('helios_token');
          localStorage.removeItem('helios_user');
          setIsAuthenticated(false);
          setUser(null);
        }
      } catch (err) {
        console.error('Auth check error:', err);
        setIsAuthenticated(false);
        setUser(null);
      }
    } else {
      setIsAuthenticated(false);
      setUser(null);
    }
    setLoading(false);
  };

  const fetchStatus = async () => {
    const token = localStorage.getItem('helios_token');
    if (!token) return;
    
    try {
      const res = await fetch('/api/status', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      setConnected(data.connected);
    } catch (err) {
      console.error('Status fetch error:', err);
    }
  };

  // Функция для логина
  const handleLogin = (token: string, userData: any) => {
    console.log('handleLogin called', { token: token?.slice(0, 50), userData });
    setIsAuthenticated(true);
    setUser(userData);
  };

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      fetchStatus();
      requestNotificationPermission()
      const interval = setInterval(fetchStatus, 30000);
      return () => clearInterval(interval);
    }
  }, [isAuthenticated]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0F1A] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-yellow-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        {/* ПЕРЕДАЁМ onLogin В КОМПОНЕНТЫ */}
        <Route path="/login" element={<Login onLogin={handleLogin} />} />
        <Route path="/register" element={<Register onLogin={handleLogin} />} />
        
        <Route path="/" element={
          <ProtectedRoute isAuthenticated={isAuthenticated}>
            <Layout connected={connected} user={user}>
              <Dashboard />
            </Layout>
          </ProtectedRoute>
        } />
        
        <Route path="/analytics" element={
          <ProtectedRoute isAuthenticated={isAuthenticated}>
            <Layout connected={connected} user={user}>
              <Analytics />
            </Layout>
          </ProtectedRoute>
        } />
        
        <Route path="/alerts" element={
          <ProtectedRoute isAuthenticated={isAuthenticated}>
            <Layout connected={connected} user={user}>
              <Alerts />
            </Layout>
          </ProtectedRoute>
        } />
        
        <Route path="/settings" element={
          <ProtectedRoute isAuthenticated={isAuthenticated}>
            <Layout connected={connected} user={user}>
              <Settings />
            </Layout>
          </ProtectedRoute>
        } />
        
        <Route path="/profile" element={
          <ProtectedRoute isAuthenticated={isAuthenticated}>
            <Layout connected={connected} user={user}>
              <Profile />
            </Layout>
          </ProtectedRoute>
        } />
        
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;