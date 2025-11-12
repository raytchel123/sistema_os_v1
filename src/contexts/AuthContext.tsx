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
      const passwordHash = await crypto.subtle.digest(
        'SHA-256',
        new TextEncoder().encode(password)
      );
      const hashedPassword = Array.from(new Uint8Array(passwordHash))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');

      console.log('Tentando login:', { email, hashPrefix: hashedPassword.substring(0, 20) });

      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .eq('senha_hash', hashedPassword)
        .maybeSingle();

      if (error) {
        console.error('Erro ao buscar usuário:', error);
        return { error: 'Erro ao fazer login. Tente novamente.' };
      }

      if (!data) {
        console.log('Usuário não encontrado com esse email/senha');
        const { data: userCheck } = await supabase
          .from('users')
          .select('email')
          .eq('email', email)
          .maybeSingle();

        if (userCheck) {
          return { error: 'Senha incorreta.' };
        }
        return { error: 'Email não encontrado.' };
      }

      console.log('Login bem-sucedido:', data.nome, 'org_id:', data.org_id);

      const userData = {
        id: data.id,
        email: data.email,
        nome: data.nome,
        papel: data.papel,
        org_id: data.org_id,
        pode_ver_todas_os: data.pode_ver_todas_os,
        pode_aprovar: data.pode_aprovar,
        menu_permissions: data.menu_permissions,
        created_at: data.criado_em
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

      const passwordHash = await crypto.subtle.digest(
        'SHA-256',
        new TextEncoder().encode(password)
      );
      const hashedPassword = Array.from(new Uint8Array(passwordHash))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');

      const { data: newUser, error } = await supabase
        .from('users')
        .insert({
          email,
          senha_hash: hashedPassword,
          nome: metadata?.nome || email.split('@')[0],
          papel: 'EDITOR'
        })
        .select('id, email, nome, papel')
        .single();

      if (error) {
        console.error('Erro ao criar usuário:', error);
        return { error: 'Erro ao criar conta.' };
      }

      const userData = {
        id: newUser.id,
        email: newUser.email,
        nome: newUser.nome,
        papel: newUser.papel
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
