import { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api, send, TOKEN_KEY } from '../lib/api';
import { queryClient } from '../lib/query';
import { User } from '../lib/types';

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  error: Error | null;
  retry: () => void;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}
const AuthContext = createContext<AuthContextValue | null>(null);
export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState(() => sessionStorage.getItem(TOKEN_KEY));
  const profile = useQuery({
    queryKey: ['session', token],
    queryFn: () => api<User>('/auth/me'),
    enabled: !!token,
    retry: false,
  });
  const logout = () => {
    sessionStorage.removeItem(TOKEN_KEY);
    setToken(null);
    queryClient.clear();
  };
  useEffect(() => {
    const expire = () => {
      sessionStorage.removeItem(TOKEN_KEY);
      setToken(null);
      queryClient.clear();
      toast.error('Sua sessão expirou. Entre novamente.');
    };
    window.addEventListener('session-expired', expire);
    return () => window.removeEventListener('session-expired', expire);
  }, []);
  const login = async (email: string, password: string) => {
    const result = await api<{ accessToken: string; user: User }>(
      '/auth/login',
      send('POST', { email, password }),
    );
    sessionStorage.setItem(TOKEN_KEY, result.accessToken);
    queryClient.setQueryData(['session', result.accessToken], result.user);
    setToken(result.accessToken);
  };
  return (
    <AuthContext.Provider
      value={{
        user: token ? (profile.data ?? null) : null,
        loading: !!token && profile.isPending,
        error: profile.error,
        retry: () => {
          void profile.refetch();
        },
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('AuthProvider ausente');
  return context;
}
