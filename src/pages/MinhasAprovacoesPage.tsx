import { useState, useEffect } from 'react';
import { CheckCircle, XCircle, Calendar, Clock, User, Tag, Shield } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { showToast } from '../components/ui/Toast';
import { OSDrawer } from '../components/kanban/OSDrawer';

interface OS {
  id: string;
  titulo: string;
  marca: string;
  objetivo: string;
  tipo: string;
  status: string;
  prioridade: string;
  responsavel: {
    id: string;
    nome: string;
    papel: string;
  } | null;
  criado_em: string;
  atualizado_em: string;
}

export function MinhasAprovacoesPage() {
  const [ordens, setOrdens] = useState<OS[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userCanApprove, setUserCanApprove] = useState(false);
  const [selectedOS, setSelectedOS] = useState<OS | null>(null);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleTime, setScheduleTime] = useState('11:00');
  const [actionLoading, setActionLoading] = useState(false);
  const [selectedOSForEdit, setSelectedOSForEdit] = useState<any>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  
  const { user } = useAuth();

  const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`;

  useEffect(() => {
    fetchOrdens();
    checkUserPermissions();
    setDefaultSchedule();
  }, []);

  const setDefaultSchedule = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    setScheduleDate(tomorrow.toISOString().split('T')[0]);
  };

  const fetchOrdens = async () => {
    try {
      setLoading(true);
      
      const { data: { session } } = await (await import('../lib/supabase')).supabase.auth.getSession();
      if (!session) {
        setError('Usuário não autenticado');
        return;
      }

      const headers = {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      };

      // Buscar todas as OS e filtrar no frontend para debug
      const response = await fetch(`${apiUrl}/api/ordens`, { headers });
      
      if (!response.ok) {
        let errorMessage = `HTTP ${response.status}`;
        try {
          const errorData = await response.json();
          if (errorData?.error) {
            errorMessage += ` - ${errorData.error}`;
          }
        } catch {
          // If JSON parsing fails, use status text
          errorMessage += ` - ${response.statusText}`;
        }
        throw new Error(`Erro ao buscar OS para aprovação: ${errorMessage}`);
      }
      
      const data = await response.json();
      console.log('📊 Total OS fetched:', data?.length || 0);
      console.log('📊 All OS statuses:', data?.map((os: any) => ({ id: os.id, titulo: os.titulo, status: os.status })) || []);
      
      // Filter by APROVACAO status on frontend as backup
      const ordensAprovacao = Array.isArray(data) 
        ? data.filter((os: any) => os.status === 'APROVACAO')
        : [];
      
      console.log('📊 OS in APROVACAO status:', ordensAprovacao.length);
      console.log('📊 APROVACAO OS details:', ordensAprovacao.map((os: any) => ({ id: os.id, titulo: os.titulo, status: os.status })));
      
      setOrdens(ordensAprovacao);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar dados');
      console.error('❌ Error in fetchOrdens:', err);
    } finally {
      setLoading(false);
    }
  };

  const checkUserPermissions = async () => {
    try {
      console.log('🔍 Checking user permissions in MinhasAprovacoesPage...');
      const { data: { session } } = await (await import('../lib/supabase')).supabase.auth.getSession();
      if (!session) {
        console.log('❌ No session found');
        setUserCanApprove(false);
        return;
      }

      const headers = {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      };

      const response = await fetch(`${apiUrl}/api`, { headers });
      
      if (response.ok) {
        const userData = await response.json();
        console.log('👤 MinhasAprovacoesPage user data:', userData);
        setUserCanApprove(userData.pode_aprovar || false);
        console.log('✅ MinhasAprovacoesPage userCanApprove set to:', userData.pode_aprovar);
      } else {
        const errorText = await response.text();
        console.error('❌ MinhasAprovacoesPage API Error:', response.status, errorText);
        setUserCanApprove(false);
      }
    } catch (err) {
      console.error('Erro ao verificar permissões:', err);
      setUserCanApprove(false);
    }
  };
  
  const handleApprove = async () => {
    if (!selectedOS) return;
    
    const loadingToast = showToast.loading('Aprovando OS...');
    setActionLoading(true);
    
    try {
      const { data: { session } } = await (await import('../lib/supabase')).supabase.auth.getSession();
      if (!session) {
        throw new Error('Usuário não autenticado');
      }

      const headers = {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      };

      // 1. Aprovar pelo Crispim
      const approveResponse = await fetch(`${apiUrl}/api/ordens/${selectedOS.id}/approve`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          data_publicacao: scheduleDate,
          horario: scheduleTime
        })
      });

      if (!approveResponse.ok) {
        const errorData = await approveResponse.json().catch(() => ({}));
        throw new Error(`Erro ao aprovar OS (${approveResponse.status}): ${errorData.error || 'Erro desconhecido'}`);
      }

      showToast.success('OS aprovada com sucesso!');
      setShowApproveModal(false);
      setSelectedOS(null);
      fetchOrdens();
    } catch (error) {
      showToast.error(error instanceof Error ? error.message : 'Erro desconhecido');
    } finally {
      showToast.dismiss(loadingToast);
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!selectedOS || !rejectReason.trim()) return;
    
    const loadingToast = showToast.loading('Reprovando OS...');
    setActionLoading(true);
    
    try {
      const { data: { session } } = await (await import('../lib/supabase')).supabase.auth.getSession();
      if (!session) {
        throw new Error('Usuário não autenticado');
      }

      const headers = {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      };

      const response = await fetch(`${apiUrl}/api/ordens/${selectedOS.id}/reject`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ motivo: rejectReason })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`Erro ao reprovar OS (${response.status}): ${errorData.error || 'Erro desconhecido'}`);
      }

      showToast.success('OS reprovada com sucesso!');
      setShowRejectModal(false);
      setSelectedOS(null);
      setRejectReason('');
      fetchOrdens();
    } catch (error) {
      showToast.error(error instanceof Error ? error.message : 'Erro desconhecido');
    } finally {
      showToast.dismiss(loadingToast);
      setActionLoading(false);
    }
  };

  const openOSDrawer = async (osId: string) => {
    try {
      console.log('🔍 MinhasAprovacoesPage - Opening drawer for OS:', osId);
      const { data: { session } } = await (await import('../lib/supabase')).supabase.auth.getSession();
      if (!session) return;

      const headers = {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      };

      const response = await fetch(`${apiUrl}/api/ordens/${osId}`, { headers });
      
      if (response.ok) {
        const osData = await response.json();
        console.log('📦 MinhasAprovacoesPage - Raw API response:', osData);
        
        setSelectedOSForEdit(osData);
        setIsDrawerOpen(true);
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error('Erro ao carregar OS:', response.status, errorData);
        showToast.error(`Erro ao carregar OS (${response.status}): ${errorData.error || 'Erro desconhecido'}`);
      }
    } catch (err) {
      console.error('Erro ao carregar OS:', err);
      showToast.error('Erro ao carregar OS');
    }
  };

  const closeDrawer = () => {
    setIsDrawerOpen(false);
    setSelectedOSForEdit(null);
  };

  const handleUpdate = () => {
    fetchOrdens(); // Refresh list after update
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  const getPriorityColor = (prioridade: string) => {
    switch (prioridade) {
      case 'HIGH': return 'bg-red-100 text-red-700 border-red-200';
      case 'MEDIUM': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'LOW': return 'bg-green-100 text-green-700 border-green-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getMarcaColor = (marca: string) => {
    switch (marca) {
      case 'RAYTCHEL': return 'bg-purple-100 text-purple-700';
      case 'ZAFFIRA': return 'bg-blue-100 text-blue-700';
      case 'ZAFF': return 'bg-pink-100 text-pink-700';
      case 'CRISPIM': return 'bg-orange-100 text-orange-700';
      case 'FAZENDA': return 'bg-green-100 text-green-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-700">Erro: {error}</p>
        </div>
      </div>
    );
  }

  if (!userCanApprove) {
    return (
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center space-x-3 mb-2">
            <CheckCircle className="w-8 h-8 text-purple-600" />
            <h1 className="text-3xl font-bold text-gray-900">Minhas Aprovações</h1>
          </div>
        </div>

        <div className="bg-yellow-50 border border-yellow-200 rounded-xl shadow-sm p-12">
          <div className="text-center">
            <Shield className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-yellow-800 mb-2">
              Acesso Restrito
            </h3>
            <p className="text-yellow-700">
              Você não tem permissão para aprovar OS. Entre em contato com o administrador para solicitar acesso.
            </p>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-8">
        <div className="flex items-center space-x-3 mb-2">
          <CheckCircle className="w-8 h-8 text-purple-600" />
          <h1 className="text-3xl font-bold text-gray-900">Minhas Aprovações</h1>
        </div>
        <p className="text-gray-600">
          Aprove ou reprove OS que estão aguardando sua validação final
        </p>
      </div>

      {ordens.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12">
          <div className="text-center">
            <CheckCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              {loading ? 'Carregando...' : 'Nenhuma OS para aprovação'}
            </h3>
            <p className="text-gray-600">
              {error ? `Erro: ${error}` : 'Quando houver OS aguardando sua aprovação, elas aparecerão aqui.'}
            </p>
           
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {ordens.map((ordem) => (
            <div 
              key={ordem.id} 
              className="bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => openOSDrawer(ordem.id)}
            >
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <h3 className="font-semibold text-gray-900 text-lg line-clamp-2">
                    {ordem.titulo}
                  </h3>
                </div>
                
                <div className="aspect-square bg-gradient-to-br from-purple-100 to-blue-100 rounded-lg mb-4 flex items-center justify-center overflow-hidden">
                  <span className="text-4xl">🎬</span>
                </div>
                  
                <div className="space-y-3 mb-4">
                  <div className="flex items-center space-x-2">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getMarcaColor(ordem.marca)}`}>
                      {ordem.marca}
                    </span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getPriorityColor(ordem.prioridade)}`}>
                      {ordem.prioridade}
                    </span>
                  </div>
                  
                  {ordem.responsavel && (
                    <div className="flex items-center text-sm text-gray-600">
                      <User className="w-4 h-4 mr-2" />
                      <span>{ordem.responsavel.nome}</span>
                    </div>
                  )}
                  
                  <div className="flex items-center text-sm text-gray-500">
                    <Clock className="w-4 h-4 mr-2" />
                    <span>Criado em {formatDate(ordem.criado_em)}</span>
                  </div>
                </div>
                </div>
                
                <div className="flex space-x-3">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedOS(ordem);
                      setShowApproveModal(true);
                    }}
                    className="flex-1 bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center text-sm font-medium"
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Aprovar
                  </button>
                  
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedOS(ordem);
                      setShowRejectModal(true);
                    }}
                    className="flex-1 bg-red-600 text-white py-2 px-4 rounded-lg hover:bg-red-700 transition-colors flex items-center justify-center text-sm font-medium"
                  >
                    <XCircle className="w-4 h-4 mr-2" />
                    Reprovar
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal de Aprovação */}
      {showApproveModal && selectedOS && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Aprovar OS: {selectedOS.titulo}
            </h3>
            
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Data de Publicação
                </label>
                <input
                  type="date"
                  value={scheduleDate}
                  onChange={(e) => setScheduleDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-600 focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Horário
                </label>
                <input
                  type="time"
                  value={scheduleTime}
                  onChange={(e) => setScheduleTime(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-600 focus:border-transparent"
                />
              </div>
            </div>
            
            <div className="flex space-x-3">
              <button
                onClick={handleApprove}
                disabled={actionLoading}
                className="flex-1 bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {actionLoading ? 'Aprovando...' : 'Confirmar Aprovação'}
              </button>
              <button
                onClick={() => {
                  setShowApproveModal(false);
                  setSelectedOS(null);
                }}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Reprovação */}
      {showRejectModal && selectedOS && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Reprovar OS: {selectedOS.titulo}
            </h3>
            
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Motivo da reprovação *
              </label>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Descreva o motivo da reprovação..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-600 focus:border-transparent resize-none"
                rows={4}
                required
              />
            </div>
            
            <div className="flex space-x-3">
              <button
                onClick={handleReject}
                disabled={!rejectReason.trim() || actionLoading}
                className="flex-1 bg-red-600 text-white py-2 px-4 rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {actionLoading ? 'Reprovando...' : 'Confirmar Reprovação'}
              </button>
              <button
                onClick={() => {
                  setShowRejectModal(false);
                  setSelectedOS(null);
                  setRejectReason('');
                }}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      <OSDrawer
        isOpen={isDrawerOpen}
        onClose={closeDrawer}
        ordem={selectedOSForEdit}
        onUpdate={handleUpdate}
      />
    </div>
  );
}