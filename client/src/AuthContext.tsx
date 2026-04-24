import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { AppUser, api } from './api';
import { storage } from './services/storage';

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
    const stored = storage.get('ib_user');
    const token = storage.get('ib_token');
    if (stored && token) {
      setUser(JSON.parse(stored) as AppUser);
    }
    setLoading(false);

    const handleExpired = () => setUser(null);
    window.addEventListener('auth:expired', handleExpired);
    return () => window.removeEventListener('auth:expired', handleExpired);
  }, []);

  const login = async (username: string, password: string) => {
    const res = await api.login(username, password);
    storage.set('ib_token', res.token);
    storage.set('ib_user', JSON.stringify(res.user));
    setUser(res.user);
  };

  const logout = () => {
    storage.remove('ib_token');
    storage.remove('ib_user');
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
