import { createContext, useContext, useState, useEffect } from 'react';
import { authAPI } from '../api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('pp_access_token');
    if (token) {
      authAPI.me().then(({ data }) => {
        setUser(data.user);
      }).catch(() => {
        localStorage.removeItem('pp_access_token');
        localStorage.removeItem('pp_refresh_token');
      }).finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (email, password) => {
    const { data } = await authAPI.login({ email, password });
    localStorage.setItem('pp_access_token', data.tokens.access);
    localStorage.setItem('pp_refresh_token', data.tokens.refresh);
    setUser(data.user);
    return data;
  };

  const register = async (formData) => {
    const { data } = await authAPI.register(formData);
    localStorage.setItem('pp_access_token', data.tokens.access);
    localStorage.setItem('pp_refresh_token', data.tokens.refresh);
    setUser(data.user);
    return data;
  };

  const logout = async () => {
    try { await authAPI.logout(); } catch {}
    localStorage.removeItem('pp_access_token');
    localStorage.removeItem('pp_refresh_token');
    setUser(null);
  };

  const refreshUser = async () => {
    const { data } = await authAPI.me();
    setUser(data.user);
    return data.user;
  };

  return (
    <AuthContext.Provider value={{ user, setUser, login, register, logout, refreshUser, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
