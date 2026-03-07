import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

export function useAuth() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // axios 기본 헤더에 토큰 설정
  const setToken = useCallback((token) => {
    if (token) {
      localStorage.setItem('token', token);
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } else {
      localStorage.removeItem('token');
      delete axios.defaults.headers.common['Authorization'];
    }
  }, []);

  // 앱 시작 시 저장된 토큰으로 사용자 확인
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      setLoading(false);
      return;
    }
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    axios.get('/api/auth/me')
      .then(res => setUser(res.data.user))
      .catch(() => setToken(null))
      .finally(() => setLoading(false));
  }, [setToken]);

  const login = async (email, password) => {
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const res = await axios.post('/api/auth/login', { email, password, timezone });
    setToken(res.data.token);
    setUser(res.data.user);
  };

  const register = async (email, password, name) => {
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const res = await axios.post('/api/auth/register', { email, password, name, timezone });
    setToken(res.data.token);
    setUser(res.data.user);
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('notifyEnabled');
  };

  return { user, loading, login, register, logout };
}
