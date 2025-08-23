export interface User {
  id: string;
  email: string;
  created_at: string;
  pode_ver_todas_os?: boolean;
}

export interface AuthContextType {
  user: User | null;
  loading: boolean;
  refreshSession?: () => Promise<any>;
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signUp: (email: string, password: string) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
}