import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { AppUser, api } from './api';

interface AuthContextType {
  user: AppUser | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  can: (...roles: string[]) => boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem('ib_user');
    const token = localStorage.getItem('ib_token');
    if (stored && token) {
      setUser(JSON.parse(stored) as AppUser);
    }
    setLoading(false);
  }, []);

  const login = async (username: string, password: string) => {
    const res = await api.login(username, password);
    localStorage.setItem('ib_token', res.token);
    localStorage.setItem('ib_user', JSON.stringify(res.user));
    setUser(res.user);
  };

  const logout = () => {
    localStorage.removeItem('ib_token');
    localStorage.removeItem('ib_user');
    setUser(null);
  };

  const can = (...roles: string[]) => !!user && roles.includes(user.roleName);

  return <AuthContext.Provider value={{ user, loading, login, logout, can }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
