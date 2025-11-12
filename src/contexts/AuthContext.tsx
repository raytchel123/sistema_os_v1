import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { AuthContextType, User } from '../types/auth';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user as User | null);
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setUser(session?.user as User | null);
        setLoading(false);
        setRefreshing(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const refreshSession = async () => {
    if (refreshing) {
      console.log('Already refreshing session, skipping...');
      return null;
    }

    try {
      setRefreshing(true);
      const { data: { session }, error } = await supabase.auth.refreshSession();
      
      if (error) {
        console.log('Session refresh failed:', error.message);
        
        // Check for invalid refresh token errors
        if (error.message.includes('refresh_token_not_found') || 
            error.message.includes('Invalid Refresh Token')) {
          console.log('Invalid refresh token detected, signing out...');
          await supabase.auth.signOut();
          setUser(null);
        }
        
        return null;
      }
      
      return session;
    } catch (error: any) {
      console.log('Session refresh error:', error.message);
      
      // Check for invalid refresh token errors in catch block too
      if (error.message?.includes('refresh_token_not_found') || 
          error.message?.includes('Invalid Refresh Token')) {
        console.log('Invalid refresh token detected in catch, signing out...');
        await supabase.auth.signOut();
        setUser(null);
      }
      
      return null;
    } finally {
      setRefreshing(false);
    }
  };
  const signIn = async (email: string, password: string) => {
    try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
        if (error.message.includes('rate_limit') || error.message.includes('Request rate limit')) {
          return { error: 'Muitas tentativas de login. Aguarde alguns minutos e tente novamente.' };
        }
        if (error.message.includes('Invalid login credentials')) {
          return { error: 'Email ou senha incorretos. Verifique suas credenciais.' };
        }
      return { error: error.message };
    }

    // Set user immediately after successful login
    if (data.user) {
      setUser(data.user as User);
    }
    } catch (err: any) {
      if (err.message?.includes('rate_limit')) {
        return { error: 'Muitas tentativas de login. Aguarde alguns minutos e tente novamente.' };
      }
      return { error: 'Erro de conexão. Tente novamente.' };
    }
    return {};
  };

  const signUp = async (email: string, password: string) => {
    try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          nome: email.split('@')[0] // Nome padrão baseado no email
        }
      }
    });

    if (error) {
      if (error.message.includes('rate_limit') || error.message.includes('Request rate limit')) {
        return { error: 'Muitas tentativas de cadastro. Aguarde alguns minutos e tente novamente.' };
      }
      return { error: error.message };
    }

    // Create user in our custom users table with organization
    if (data.user) {
      try {
        const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/api`;
        const response = await fetch(`${apiUrl}/users/provision`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
          },
          body: JSON.stringify({
            user_id: data.user.id,
            email: data.user.email,
            nome: email.split('@')[0]
          })
        });
        
        if (!response.ok) {
          console.error('Erro ao provisionar usuário:', response.status);
        }
      } catch (provisionError) {
        console.error('Erro ao provisionar usuário:', provisionError);
      }
    }

    return {};
    } catch (err: any) {
      return { error: 'Erro de conexão. Tente novamente.' };
    }
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
    } catch (error: any) {
      // If session doesn't exist on server, clear local state anyway
      if (error?.message?.includes('session_not_found') || 
          error?.message?.includes('Session from session_id claim in JWT does not exist')) {
        console.log('Session already invalid on server, clearing local state');
        setUser(null);
        return;
      }
      // Re-throw other errors
      throw error;
    }
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