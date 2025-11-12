import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { AuthContextType, User } from '../types/auth';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const SESSION_KEY = 'os_conteudo_user_session';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    const savedSession = localStorage.getItem(SESSION_KEY);
    if (savedSession) {
      try {
        const userData = JSON.parse(savedSession);
        setUser(userData);
      } catch (e) {
        localStorage.removeItem(SESSION_KEY);
      }
    }
    setLoading(false);
  }, []);

  const refreshSession = async () => {
    return null;
  };

  const signIn = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .maybeSingle();

      if (error) {
        console.error('Erro ao buscar usuário:', error);
        return { error: 'Erro ao fazer login. Tente novamente.' };
      }

      if (!data) {
        return { error: 'Email ou senha incorretos.' };
      }

      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/api`;
      const response = await fetch(`${apiUrl}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify({ email, password })
      });

      const result = await response.json();

      if (!response.ok) {
        return { error: result.error || 'Email ou senha incorretos.' };
      }

      const userData = {
        id: data.id,
        email: data.email,
        nome: data.nome,
        papel: data.papel
      } as User;

      setUser(userData);
      localStorage.setItem(SESSION_KEY, JSON.stringify(userData));

      return {};
    } catch (err: any) {
      console.error('Erro no login:', err);
      return { error: 'Erro de conexão. Tente novamente.' };
    }
  };

  const signUp = async (email: string, password: string, metadata?: { nome?: string }) => {
    try {
      const { data: existingUser } = await supabase
        .from('users')
        .select('id')
        .eq('email', email)
        .maybeSingle();

      if (existingUser) {
        return { error: 'Este email já está cadastrado.' };
      }

      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/api`;
      const response = await fetch(`${apiUrl}/auth/signup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify({
          email,
          password,
          nome: metadata?.nome || email.split('@')[0]
        })
      });

      const result = await response.json();

      if (!response.ok) {
        return { error: result.error || 'Erro ao criar conta.' };
      }

      const userData = {
        id: result.user.id,
        email: result.user.email,
        nome: result.user.nome,
        papel: result.user.papel
      } as User;

      setUser(userData);
      localStorage.setItem(SESSION_KEY, JSON.stringify(userData));

      return {};
    } catch (err: any) {
      console.error('Erro no cadastro:', err);
      return { error: 'Erro de conexão. Tente novamente.' };
    }
  };

  const signOut = async () => {
    setUser(null);
    localStorage.removeItem(SESSION_KEY);
  };

  const value = {
    user,
    loading,
    refreshSession,
    signIn,
    signUp,
    signOut,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}