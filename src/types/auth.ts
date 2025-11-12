export interface User {
  id: string;
  email: string;
  created_at: string;
  org_id?: string;
  pode_ver_todas_os?: boolean;
  pode_aprovar?: boolean;
  nome?: string;
  papel?: string;
  menu_permissions?: MenuPermissions;
}

export interface MenuPermissions {
  kanban?: boolean;
  lista?: boolean;
  calendario?: boolean;
  biblioteca?: boolean;
  ideias?: boolean;
  importar?: boolean;
  ideias_pendentes?: boolean;
  relatorios?: boolean;
  settings?: boolean;
  usuarios?: boolean;
}

export interface AuthContextType {
  user: User | null;
  loading: boolean;
  refreshSession?: () => Promise<any>;
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signUp: (email: string, password: string) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
}