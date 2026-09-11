import { createContext, useContext, useState } from 'react';
import type { ReactNode } from 'react';
import apiClient from '../lib/apiClient';

interface Admin {
  admin_id: number;
  username: string;
  email?: string | null;
  role: string;
  is_active?: boolean;
}

interface AuthContextType {
  admin: Admin | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  refreshAdmin: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [admin, setAdmin] = useState<Admin | null>(() => {
    const stored = localStorage.getItem('admin');
    return stored ? JSON.parse(stored) : null;
  });

  async function login(username: string, password: string) {
    const res = await apiClient.post('/auth/login', { username, password });
    localStorage.setItem('token', res.data.token);
    localStorage.setItem('admin', JSON.stringify(res.data.admin));
    setAdmin(res.data.admin);
  }

  function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('admin');
    setAdmin(null);
  }

  async function refreshAdmin() {
    const res = await apiClient.get('/profile');
    localStorage.setItem('admin', JSON.stringify(res.data));
    setAdmin(res.data);
  }

  return (
    <AuthContext.Provider value={{ admin, login, logout, refreshAdmin }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
