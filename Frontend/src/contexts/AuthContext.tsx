import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import {
  clearSession,
  SESSION_EXPIRED_EVENT,
  TOKEN_KEY,
  USERNAME_KEY,
} from '../auth/session';
import { AuthContext, type AuthContextValue } from './authContextValue';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(TOKEN_KEY));
  const [username, setUsername] = useState<string | null>(() => localStorage.getItem(USERNAME_KEY));
  const [isLoading, setIsLoading] = useState<boolean>(!!localStorage.getItem(TOKEN_KEY));
  const navigate = useNavigate();

  useEffect(() => {
    const handleSessionExpired = () => {
      setToken(null);
      setUsername(null);
      setIsLoading(false);
      navigate('/login', { replace: true });
    };

    window.addEventListener(SESSION_EXPIRED_EVENT, handleSessionExpired);
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, handleSessionExpired);
  }, [navigate]);

  useEffect(() => {
    const stored = localStorage.getItem(TOKEN_KEY);
    if (!stored) {
      setIsLoading(false);
      return;
    }
    let cancelled = false;
    const controller = new AbortController();
    (async () => {
      try {
        const res = await api.get('/api/auth/verify', { signal: controller.signal });
        if (cancelled) return;
        if (res.data?.valid) {
          setToken(stored);
          setUsername(res.data.username ?? localStorage.getItem(USERNAME_KEY));
        } else {
          clearSession();
          setToken(null);
          setUsername(null);
        }
      } catch {
        if (cancelled) return;
        clearSession();
        setToken(null);
        setUsername(null);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, []);

  const login = useCallback(async (user: string, password: string) => {
    const res = await api.post('/api/auth/login', { username: user, password });
    const newToken: string = res.data.token;
    localStorage.setItem(TOKEN_KEY, newToken);
    localStorage.setItem(USERNAME_KEY, user);
    setToken(newToken);
    setUsername(user);
  }, []);

  const logout = useCallback(() => {
    clearSession();
    setToken(null);
    setUsername(null);
    navigate('/login');
  }, [navigate]);

  const value: AuthContextValue = {
    token,
    username,
    isAuthenticated: !!token,
    isLoading,
    login,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
