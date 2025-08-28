import { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { 
  Kanban, 
  List, 
  BarChart3,
  Settings, 
  Menu, 
  X,
  LogOut,
  Video,
  CheckCircle,
  Inbox,
  Calendar,
  Archive,
  Lightbulb,
  CalendarDays,
  TrendingUp,
  Upload
} from 'lucide-react';
import { Users } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { showToast } from '../ui/Toast';

const menuItems = [
  { to: '/kanban', icon: Kanban, label: 'Kanban', description: 'Visualização em quadro' },
  { to: '/lista', icon: List, label: 'Lista', description: 'Visualização em lista' },
  { to: '/calendario', icon: Calendar, label: 'Planejamento', description: 'Calendário de publicações' },
  { to: '/biblioteca', icon: Archive, label: 'Biblioteca', description: 'Conteúdos publicados' },
  { to: '/ideias', icon: Lightbulb, label: 'Ideias', description: 'Transformar ideias em pautas' },
  { to: '/importar', icon: Upload, label: 'Importar OS', description: 'Importar de arquivos com IA' },
  { to: '/ideias-pendentes', icon: CheckCircle, label: 'Aprovar Ideias', description: 'Aprovar ideias importadas' },
  { to: '/tendencias', icon: TrendingUp, label: 'Tendências', description: 'Análise de performance e sugestões' },
    // { to: '/auditoria', icon: BarChart3, label: 'Inteligência', description: 'Auditoria estratégica e reaproveitamento' },

  { to: '/relatorios', icon: BarChart3, label: 'Relatórios', description: 'Métricas e análises' },
  { to: '/settings', icon: Settings, label: 'Configurações', description: 'Providers e perfis' },
  { to: '/usuarios', icon: Users, label: 'Usuários', description: 'Gerenciar equipe' },
];

const approvalMenuItems = [
  { to: '/aprovacoes', icon: CheckCircle, label: 'Minhas Aprovações', description: 'OS aguardando aprovação' },
];

export function Sidebar() {
  const [isOpen, setIsOpen] = useState(false);
  const { signOut, user } = useAuth();
  const [userRole, setUserRole] = useState<string | null>(null);
  const [userCanApprove, setUserCanApprove] = useState(false);
  const [logoutLoading, setLogoutLoading] = useState(false);
  const [debugInfo, setDebugInfo] = useState<any>(null);

  // Get user role from database
  useEffect(() => {
    const fetchUserRole = async () => {
      if (user && user.email) {
        try {
          console.log('🔍 Fetching user role for:', user.email);
          
          // Get current session without forcing refresh
          const { data: { session } } = await (await import('../../lib/supabase')).supabase.auth.getSession();
          
          if (session) {
            console.log('🔑 Session found, making API call...');
            const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/api`, {
              headers: {
                'Authorization': `Bearer ${session.access_token}`,
                'Content-Type': 'application/json',
              }
            });
            
            console.log('📡 API Response status:', response.status);
            
            if (response.ok) {
              const userData = await response.json();
              console.log('👤 User data received:', userData);
              setUserRole(userData.papel);
              setUserCanApprove(userData.pode_aprovar);
              setDebugInfo(userData);
              console.log('🔍 APPROVAL DEBUG:', { 
                email: user.email,
                papel: userData.papel, 
                pode_aprovar: userData.pode_aprovar,
                userCanApprove: userData.pode_aprovar,
                shouldShowMenu: userData.pode_aprovar === true,
                menuWillShow: userData.pode_aprovar ? 'YES' : 'NO'
              });
            } else if (response.status === 401) {
              console.log('🔄 Token expired, trying refresh...');
              const { data: refreshData } = await (await import('../../lib/supabase')).supabase.auth.refreshSession();
              
              if (refreshData?.session) {
                // Retry with fresh token
                const retryResponse = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/api`, {
                  headers: {
                    'Authorization': `Bearer ${refreshData.session.access_token}`,
                    'Content-Type': 'application/json',
                  }
                });
                
                if (retryResponse.ok) {
                  const userData = await retryResponse.json();
                  setUserRole(userData.papel);
                  setUserCanApprove(userData.pode_aprovar);
                  setDebugInfo(userData);
                }
              }
            }
          }
        } catch (error) {
          console.error('❌ Error fetching user role:', error);
        }
      }
    };
    fetchUserRole();
  }, [user]);

  const toggleSidebar = () => setIsOpen(!isOpen);

  const handleLogout = async () => {
    setLogoutLoading(true);
    const loadingToast = showToast.loading('Fazendo logout...');
    
    try {
      await signOut();
      showToast.success('Logout realizado com sucesso!');
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
      showToast.error('Erro ao fazer logout');
    } finally {
      showToast.dismiss(loadingToast);
      setLogoutLoading(false);
    }
  };
  
  // Debug: Log current state
  // console.log('🎯 SIDEBAR STATE:', {
  //   userEmail: user?.email,
  //   userCanApprove,
  //   userRole,
  //   debugInfo,
  //   totalMenuItems: menuItems.length,
  //   approvalMenuItems: approvalMenuItems.length,
  //   willShowApprovalMenu: userCanApprove
  // });
  const allMenuItems = [
    ...menuItems,
    ...(userCanApprove ? approvalMenuItems : [])
  ];
  
  // console.log('📋 FINAL MENU ITEMS:', allMenuItems.length, 'items');
  // console.log('✅ Approval menu included:', userCanApprove ? 'YES' : 'NO');
  return (
    <>
      {/* Mobile menu button */}
      <button
        onClick={toggleSidebar}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-white rounded-lg shadow-lg border"
      >
        {isOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* Overlay for mobile */}
      {isOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`
        fixed lg:static inset-y-0 left-0 z-40 lg:z-auto lg:h-auto
        w-72 bg-white border-r border-gray-200 
        transform transition-transform duration-300 ease-in-out
        flex flex-col h-full lg:h-auto
        ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="flex flex-col h-full overflow-hidden">
          {/* Header */}
          <div className="px-6 py-6 border-b border-gray-200">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-600 rounded-lg">
                <Video className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">OS Conteúdo</h1>
                <p className="text-sm text-gray-600">Produção de Vídeos</p>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
            {allMenuItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => setIsOpen(false)}
                className={({ isActive }) => `
                  group flex items-center px-4 py-3 text-sm font-medium rounded-xl transition-all duration-200
                  ${isActive 
                    ? 'bg-blue-50 text-blue-700 border border-blue-200' 
                    : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                  }
                `}
              >
                <item.icon className={`mr-3 h-5 w-5 transition-colors duration-200`} />
                <div className="flex-1">
                  <div className="font-medium">{item.label}</div>
                  <div className="text-xs text-gray-500 group-hover:text-gray-700">
                    {item.description}
                  </div>
                </div>
              </NavLink>
            ))}
          </nav>

          {/* User section */}
          <div className="px-4 py-4 border-t border-gray-200 mt-auto bg-white flex-shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm font-medium">
                    {user?.email?.[0].toUpperCase()}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {user?.email}
                  </p>
                  <p className="text-xs text-gray-500">
                    {userRole || 'Usuário ativo'}
                  </p>
                </div>
              </div>
              <button
                onClick={handleLogout}
                disabled={logoutLoading}
                className="p-2 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                title="Sair"
              >
                {logoutLoading ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600"></div>
                ) : (
                  <LogOut size={16} />
                )}
              </button>
            </div>
          </div>
        </div>

      </div>
    </>
  );
}