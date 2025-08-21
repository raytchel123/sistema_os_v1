import { useState, useEffect } from 'react';
import { CheckCircle, XCircle, Eye, Clock, Tag, User, AlertTriangle, FileText, Calendar, Lightbulb, Edit, Save, X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { showToast } from '../components/ui/Toast';

interface Ideia {
  id: string;
  titulo: string;
  descricao: string;
  marca: string;
  objetivo: string;
  tipo: string;
  prioridade: string;
  gancho: string;
  cta: string;
  script_text: string;
  legenda: string;
  canais: string[];
  categorias_criativos: string[];
  raw_media_links: string[];
  prazo: string;
  data_publicacao_prevista: string;
  status: 'PENDENTE' | 'APROVADA' | 'REJEITADA';
  aprovada_por_user: { id: string; nome: string; papel: string } | null;
  rejeitada_por_user: { id: string; nome: string; papel: string } | null;
  created_by_user: { id: string; nome: string; papel: string } | null;
  os_criada: { id: string; titulo: string; status: string } | null;
  motivo_rejeicao: string | null;
  criado_em: string;
  atualizado_em: string;
}

export function IdeasPendentesPage() {
  const [ideias, setIdeias] = useState<Ideia[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userCanApprove, setUserCanApprove] = useState(false);
  const [selectedIdeia, setSelectedIdeia] = useState<Ideia | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'pendentes' | 'aprovadas' | 'rejeitadas'>('pendentes');
  const [editingIdeia, setEditingIdeia] = useState<Ideia | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState<Partial<Ideia>>({});
  const [editLoading, setEditLoading] = useState(false);
  
  const { user } = useAuth();
  const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`;

  useEffect(() => {
    fetchIdeias();
    checkUserPermissions();
  }, [activeTab]);

  const checkUserPermissions = async () => {
    try {
      const { data: { session } } = await (await import('../lib/supabase')).supabase.auth.getSession();
      if (!session) return;

      const headers = {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      };

      const response = await fetch(`${apiUrl}/api`, { headers });
      
      if (response.ok) {
        const userData = await response.json();
        setUserCanApprove(userData.pode_aprovar || false);
      }
    } catch (err) {
      console.error('Erro ao verificar permissões:', err);
    }
  };

  const fetchIdeias = async () => {
    try {
      setLoading(true);
      const { data: { session } } = await (await import('../lib/supabase')).supabase.auth.getSession();
      if (!session) return;

      const headers = {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      };

      const params = new URLSearchParams();
      if (activeTab !== 'pendentes') {
        params.append('status', activeTab === 'aprovadas' ? 'APROVADA' : 'REJEITADA');
      } else {
        params.append('status', 'PENDENTE');
      }

      const response = await fetch(`${apiUrl}/api/ideias?${params}`, { headers });
      
      if (response.ok) {
        const data = await response.json();
        setIdeias(data);
      } else {
        const errorData = await response.json().catch(() => ({}));
        setError(`Erro ao carregar ideias: ${errorData.error || 'Erro desconhecido'}`);
      }
    } catch (err) {
      setError('Erro ao carregar ideias');
      console.error('Erro ao carregar ideias:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (ideiaId: string) => {
    setActionLoading(ideiaId);
    const loadingToast = showToast.loading('Aprovando ideia...');
    
    try {
      const { data: { session } } = await (await import('../lib/supabase')).supabase.auth.getSession();
      if (!session) return;

      const headers = {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      };

      const response = await fetch(`${apiUrl}/api/ideias/${ideiaId}/approve`, {
        method: 'POST',
        headers
      });

      if (response.ok) {
        const result = await response.json();
        showToast.success(`Ideia aprovada! OS "${result.os_criada.titulo}" criada com sucesso.`);
        fetchIdeias(); // Refresh list
      } else {
        const errorData = await response.json().catch(() => ({}));
        showToast.error(`Erro ao aprovar ideia: ${errorData.error || 'Erro desconhecido'}`);
      }
    } catch (err) {
      showToast.error('Erro ao aprovar ideia');
    } finally {
      showToast.dismiss(loadingToast);
      setActionLoading(null);
    }
  };

  const handleReject = async () => {
    if (!selectedIdeia || !rejectReason.trim()) return;

    setActionLoading(selectedIdeia.id);
    const loadingToast = showToast.loading('Rejeitando ideia...');
    
    try {
      const { data: { session } } = await (await import('../lib/supabase')).supabase.auth.getSession();
      if (!session) return;

      const headers = {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      };

      const response = await fetch(`${apiUrl}/api/ideias/${selectedIdeia.id}/reject`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ motivo: rejectReason })
      });

      if (response.ok) {
        showToast.success('Ideia rejeitada com sucesso!');
        setShowRejectModal(false);
        setSelectedIdeia(null);
        setRejectReason('');
        fetchIdeias(); // Refresh list
      } else {
        const errorData = await response.json().catch(() => ({}));
        showToast.error(`Erro ao rejeitar ideia: ${errorData.error || 'Erro desconhecido'}`);
      }
    } catch (err) {
      showToast.error('Erro ao rejeitar ideia');
    } finally {
      showToast.dismiss(loadingToast);
      setActionLoading(null);
    }
  };

  const openEditModal = (ideia: Ideia) => {
    setEditingIdeia(ideia);
    setEditForm({
      titulo: ideia.titulo,
      descricao: ideia.descricao,
      marca: ideia.marca,
      objetivo: ideia.objetivo,
      tipo: ideia.tipo,
      prioridade: ideia.prioridade,
      gancho: ideia.gancho,
      cta: ideia.cta,
      script_text: ideia.script_text,
      legenda: ideia.legenda,
      canais: ideia.canais,
      categorias_criativos: ideia.categorias_criativos,
      raw_media_links: ideia.raw_media_links,
      prazo: ideia.prazo,
      data_publicacao_prevista: ideia.data_publicacao_prevista ? 
        new Date(ideia.data_publicacao_prevista).toISOString().slice(0, 16) : ''
    });
    setShowEditModal(true);
  };

  const handleSaveEdit = async () => {
    if (!editingIdeia) return;

    setEditLoading(true);
    const loadingToast = showToast.loading('Salvando alterações...');
    
    try {
      const { data: { session } } = await (await import('../lib/supabase')).supabase.auth.getSession();
      if (!session) return;

      const headers = {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      };

      const response = await fetch(`${apiUrl}/api/ideias/${editingIdeia.id}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(editForm)
      });

      if (response.ok) {
        showToast.success('Ideia atualizada com sucesso!');
        setShowEditModal(false);
        setEditingIdeia(null);
        setEditForm({});
        fetchIdeias(); // Refresh list
      } else {
        const errorData = await response.json().catch(() => ({}));
        showToast.error(`Erro ao salvar ideia: ${errorData.error || 'Erro desconhecido'}`);
      }
    } catch (err) {
      showToast.error('Erro ao salvar ideia');
    } finally {
      showToast.dismiss(loadingToast);
      setEditLoading(false);
    }
  };

  const closeEditModal = () => {
    setShowEditModal(false);
    setEditingIdeia(null);
    setEditForm({});
  };

  const handleCanaisChange = (canal: string, checked: boolean) => {
    if (checked) {
      setEditForm(prev => ({
        ...prev,
        canais: [...(prev.canais || []), canal]
      }));
    } else {
      setEditForm(prev => ({
        ...prev,
        canais: (prev.canais || []).filter(c => c !== canal)
      }));
    }
  };

  const openDetailsModal = (ideia: Ideia) => {
    setSelectedIdeia(ideia);
    setShowDetailsModal(true);
  };

  const openRejectModal = (ideia: Ideia) => {
    setSelectedIdeia(ideia);
    setShowRejectModal(true);
  };

  const closeModals = () => {
    setShowDetailsModal(false);
    setShowRejectModal(false);
    setSelectedIdeia(null);
    setRejectReason('');
  };

  const getStatusColor = (status: string) => {
    const colors = {
      'PENDENTE': 'bg-yellow-100 text-yellow-800 border-yellow-200',
      'APROVADA': 'bg-green-100 text-green-800 border-green-200',
      'REJEITADA': 'bg-red-100 text-red-800 border-red-200'
    };
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800 border-gray-200';
  };

  const getStatusLabel = (status: string) => {
    const labels = {
      'PENDENTE': 'Aguardando Aprovação',
      'APROVADA': 'Aprovada',
      'REJEITADA': 'Rejeitada'
    };
    return labels[status as keyof typeof labels] || status;
  };

  const getMarcaColor = (marca: string) => {
    const colors = {
      'RAYTCHEL': 'bg-purple-100 text-purple-700',
      'ZAFFIRA': 'bg-blue-100 text-blue-700',
      'ZAFF': 'bg-pink-100 text-pink-700',
      'CRISPIM': 'bg-orange-100 text-orange-700',
      'FAZENDA': 'bg-green-100 text-green-700'
    };
    return colors[marca as keyof typeof colors] || 'bg-gray-100 text-gray-700';
  };

  const getPriorityColor = (prioridade: string) => {
    const colors = {
      'HIGH': 'bg-red-100 text-red-700 border-red-200',
      'MEDIUM': 'bg-yellow-100 text-yellow-700 border-yellow-200',
      'LOW': 'bg-green-100 text-green-700 border-green-200'
    };
    return colors[prioridade as keyof typeof colors] || 'bg-gray-100 text-gray-700 border-gray-200';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  const tabs = [
    { id: 'pendentes', label: 'Pendentes', count: ideias.filter(i => i.status === 'PENDENTE').length },
    { id: 'aprovadas', label: 'Aprovadas', count: ideias.filter(i => i.status === 'APROVADA').length },
    { id: 'rejeitadas', label: 'Rejeitadas', count: ideias.filter(i => i.status === 'REJEITADA').length }
  ];

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
        </div>
      </div>
    );
  }

  if (!userCanApprove) {
    return (
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center space-x-3 mb-2">
            <Lightbulb className="w-8 h-8 text-purple-600" />
            <h1 className="text-3xl font-bold text-gray-900">Aprovar Ideias</h1>
          </div>
        </div>

        <div className="bg-yellow-50 border border-yellow-200 rounded-xl shadow-sm p-12">
          <div className="text-center">
            <AlertTriangle className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-yellow-800 mb-2">
              Acesso Restrito
            </h3>
            <p className="text-yellow-700">
              Você não tem permissão para aprovar ideias. Entre em contato com o administrador para solicitar acesso.
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
          <Lightbulb className="w-8 h-8 text-purple-600" />
          <h1 className="text-3xl font-bold text-gray-900">Aprovar Ideias</h1>
        </div>
        <p className="text-gray-600">
          Revise e aprove ideias importadas para transformá-las em OS
        </p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                activeTab === tab.id
                  ? 'border-purple-500 text-purple-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <span>{tab.label}</span>
              {tab.count > 0 && (
                <span className="bg-purple-100 text-purple-600 px-2 py-1 rounded-full text-xs font-medium">
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {ideias.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12">
          <div className="text-center">
            <Lightbulb className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              {activeTab === 'pendentes' ? 'Nenhuma ideia pendente' : 
               activeTab === 'aprovadas' ? 'Nenhuma ideia aprovada' : 'Nenhuma ideia rejeitada'}
            </h3>
            <p className="text-gray-600">
              {activeTab === 'pendentes' 
                ? 'Quando houver ideias importadas aguardando aprovação, elas aparecerão aqui.'
                : activeTab === 'aprovadas'
                ? 'Ideias aprovadas que já foram transformadas em OS aparecerão aqui.'
                : 'Ideias rejeitadas aparecerão aqui para referência.'
              }
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {ideias.map((ideia) => (
            <div key={ideia.id} className="bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <h3 className="font-semibold text-gray-900 text-lg line-clamp-2 flex-1">
                    {ideia.titulo}
                  </h3>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getPriorityColor(ideia.prioridade)}`}>
                    {ideia.prioridade}
                  </span>
                </div>
                
                <div className="aspect-video bg-gradient-to-br from-purple-100 to-blue-100 rounded-lg mb-4 flex items-center justify-center">
                  <span className="text-4xl">💡</span>
                </div>
                  
                <div className="space-y-3 mb-4">
                  <div className="flex items-center space-x-2">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getMarcaColor(ideia.marca)}`}>
                      {ideia.marca}
                    </span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getPriorityColor(ideia.prioridade)}`}>
                      {ideia.prioridade}
                    </span>
                  </div>
                  
                  <div className="flex items-center space-x-2 text-xs">
                    <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded">
                      {ideia.objetivo}
                    </span>
                    <span className="bg-green-100 text-green-700 px-2 py-1 rounded">
                      {ideia.tipo}
                    </span>
                  </div>
                  
                  {ideia.created_by_user && (
                    <div className="flex items-center text-sm text-gray-600">
                      <User className="w-4 h-4 mr-2" />
                      <span>Por {ideia.created_by_user.nome}</span>
                    </div>
                  )}
                  
                  <div className="flex items-center text-sm text-gray-500">
                    <Clock className="w-4 h-4 mr-2" />
                    <span>Criado em {formatDate(ideia.criado_em)}</span>
                  </div>

                  {ideia.status === 'APROVADA' && ideia.os_criada && (
                    <div className="flex items-center text-sm text-green-600">
                      <CheckCircle className="w-4 h-4 mr-2" />
                      <span>OS criada: {ideia.os_criada.titulo}</span>
                    </div>
                  )}

                  {ideia.status === 'REJEITADA' && ideia.motivo_rejeicao && (
                    <div className="bg-red-50 border border-red-200 rounded p-2">
                      <p className="text-xs text-red-700">
                        <strong>Motivo:</strong> {ideia.motivo_rejeicao}
                      </p>
                    </div>
                  )}
                </div>
                
                <div className="flex space-x-2">
                  <button
                    onClick={() => openDetailsModal(ideia)}
                    className="flex-1 border border-purple-600 text-purple-600 py-2 px-3 rounded-lg hover:bg-purple-50 transition-colors flex items-center justify-center text-sm font-medium"
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    Detalhes
                  </button>
                  
                  {ideia.status === 'PENDENTE' && userCanApprove && (
                    <>
                      <button
                        onClick={() => openEditModal(ideia)}
                        className="flex-1 border border-blue-600 text-blue-600 py-2 px-3 rounded-lg hover:bg-blue-50 transition-colors flex items-center justify-center text-sm font-medium"
                      >
                        <Edit className="w-4 h-4 mr-2" />
                        Editar
                      </button>
                      
                      <button
                        onClick={() => handleApprove(ideia.id)}
                        disabled={actionLoading === ideia.id}
                        className="flex-1 bg-green-600 text-white py-2 px-3 rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors flex items-center justify-center text-sm font-medium"
                      >
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Aprovar
                      </button>
                      
                      <button
                        onClick={() => openRejectModal(ideia)}
                        disabled={actionLoading === ideia.id}
                        className="flex-1 bg-red-600 text-white py-2 px-3 rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors flex items-center justify-center text-sm font-medium"
                      >
                        <XCircle className="w-4 h-4 mr-2" />
                        Rejeitar
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal de Edição */}
      {showEditModal && editingIdeia && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-4xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-gray-900">
                Editar Ideia
              </h3>
              <button
                onClick={closeEditModal}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Título */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Título *
                </label>
                <input
                  type="text"
                  value={editForm.titulo || ''}
                  onChange={(e) => setEditForm(prev => ({ ...prev, titulo: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent"
                  placeholder="Título da ideia"
                />
              </div>

              {/* Descrição */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Descrição *
                </label>
                <textarea
                  value={editForm.descricao || ''}
                  onChange={(e) => setEditForm(prev => ({ ...prev, descricao: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent resize-none"
                  rows={4}
                  placeholder="Descrição detalhada"
                />
              </div>

              {/* Marca */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Marca *
                </label>
                <select
                  value={editForm.marca || ''}
                  onChange={(e) => setEditForm(prev => ({ ...prev, marca: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent"
                >
                  <option value="RAYTCHEL">Raytchel</option>
                  <option value="ZAFFIRA">Zaffira</option>
                  <option value="ZAFF">Zaff</option>
                  <option value="CRISPIM">Crispim</option>
                  <option value="FAZENDA">Fazenda</option>
                </select>
              </div>

              {/* Objetivo */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Objetivo *
                </label>
                <select
                  value={editForm.objetivo || ''}
                  onChange={(e) => setEditForm(prev => ({ ...prev, objetivo: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent"
                >
                  <option value="ATRACAO">Atração</option>
                  <option value="NUTRICAO">Nutrição</option>
                  <option value="CONVERSAO">Conversão</option>
                </select>
              </div>

              {/* Tipo */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tipo *
                </label>
                <select
                  value={editForm.tipo || ''}
                  onChange={(e) => setEditForm(prev => ({ ...prev, tipo: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent"
                >
                  <option value="EDUCATIVO">Educativo</option>
                  <option value="HISTORIA">História</option>
                  <option value="CONVERSAO">Conversão</option>
                </select>
              </div>

              {/* Prioridade */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Prioridade *
                </label>
                <select
                  value={editForm.prioridade || ''}
                  onChange={(e) => setEditForm(prev => ({ ...prev, prioridade: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent"
                >
                  <option value="HIGH">🔴 Alta</option>
                  <option value="MEDIUM">🟡 Média</option>
                  <option value="LOW">🟢 Baixa</option>
                </select>
              </div>

              {/* Data de Publicação */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Data de Publicação
                </label>
                <input
                  type="datetime-local"
                  value={editForm.data_publicacao_prevista || ''}
                  onChange={(e) => setEditForm(prev => ({ ...prev, data_publicacao_prevista: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent"
                />
              </div>

              {/* Gancho */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Gancho
                </label>
                <textarea
                  value={editForm.gancho || ''}
                  onChange={(e) => setEditForm(prev => ({ ...prev, gancho: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent resize-none"
                  rows={3}
                  placeholder="Gancho principal do conteúdo"
                />
              </div>

              {/* CTA */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Call to Action (CTA)
                </label>
                <input
                  type="text"
                  value={editForm.cta || ''}
                  onChange={(e) => setEditForm(prev => ({ ...prev, cta: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent"
                  placeholder="Ex: Acesse o link na bio para saber mais"
                />
              </div>

              {/* Roteiro */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Roteiro / Script
                </label>
                <textarea
                  value={editForm.script_text || ''}
                  onChange={(e) => setEditForm(prev => ({ ...prev, script_text: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent resize-none font-mono text-sm"
                  rows={8}
                  placeholder="Roteiro detalhado do conteúdo"
                />
              </div>

              {/* Legenda */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Legenda
                </label>
                <textarea
                  value={editForm.legenda || ''}
                  onChange={(e) => setEditForm(prev => ({ ...prev, legenda: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent resize-none"
                  rows={6}
                  placeholder="Legenda para redes sociais com hashtags"
                />
              </div>

              {/* Prazo */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Prazo
                </label>
                <input
                  type="date"
                  value={editForm.prazo || ''}
                  onChange={(e) => setEditForm(prev => ({ ...prev, prazo: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent"
                />
              </div>

              {/* Canais */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Canais de Distribuição
                </label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {['Instagram', 'TikTok', 'YouTube', 'Facebook', 'LinkedIn', 'Twitter', 'Stories', 'Reels'].map(canal => (
                    <label key={canal} className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={(editForm.canais || []).includes(canal)}
                        onChange={(e) => handleCanaisChange(canal, e.target.checked)}
                        className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
                      />
                      <span className="text-sm text-gray-700">{canal}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-4 mt-8 pt-6 border-t border-gray-200">
              <button
                onClick={closeEditModal}
                className="px-6 py-3 text-gray-600 hover:text-gray-800 font-medium"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={editLoading}
                className="bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 disabled:opacity-50 transition-colors flex items-center space-x-2"
              >
                {editLoading ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                ) : (
                  <Save className="w-4 h-4" />
                )}
                <span>{editLoading ? 'Salvando...' : 'Salvar Alterações'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Detalhes */}
      {showDetailsModal && selectedIdeia && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-4xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-gray-900">
                Detalhes da Ideia
              </h3>
              <button
                onClick={closeModals}
                className="text-gray-400 hover:text-gray-600"
              >
                <XCircle className="w-6 h-6" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-500 uppercase tracking-wide">Título</label>
                  <p className="text-lg font-semibold text-gray-900 mt-1">{selectedIdeia.titulo}</p>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-gray-500 uppercase tracking-wide">Descrição</label>
                  <p className="text-gray-700 mt-1">{selectedIdeia.descricao}</p>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-gray-500 uppercase tracking-wide">Gancho</label>
                  <p className="text-gray-700 mt-1 italic">"{selectedIdeia.gancho}"</p>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-gray-500 uppercase tracking-wide">CTA</label>
                  <p className="text-gray-700 mt-1 font-medium">"{selectedIdeia.cta}"</p>
                </div>
              </div>
              
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-500 uppercase tracking-wide">Marca</label>
                    <span className="inline-block mt-1 px-3 py-1 bg-indigo-100 text-indigo-800 rounded-full text-sm font-medium">
                      {selectedIdeia.marca}
                    </span>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-gray-500 uppercase tracking-wide">Objetivo</label>
                    <span className="inline-block mt-1 px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
                      {selectedIdeia.objetivo}
                    </span>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-gray-500 uppercase tracking-wide">Tipo</label>
                    <span className="inline-block mt-1 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                      {selectedIdeia.tipo}
                    </span>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-gray-500 uppercase tracking-wide">Prioridade</label>
                    <span className={`inline-block mt-1 px-3 py-1 rounded-full text-sm font-medium border ${getPriorityColor(selectedIdeia.prioridade)}`}>
                      {selectedIdeia.prioridade === 'HIGH' ? '🔴 Alta' : 
                       selectedIdeia.prioridade === 'MEDIUM' ? '🟡 Média' : '🟢 Baixa'}
                    </span>
                  </div>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-gray-500 uppercase tracking-wide">Canais</label>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {selectedIdeia.canais.map((canal, index) => (
                      <span key={index} className="px-2 py-1 bg-purple-100 text-purple-800 rounded text-sm">
                        {canal}
                      </span>
                    ))}
                  </div>
                </div>
                
                {selectedIdeia.prazo && (
                  <div>
                    <label className="text-sm font-medium text-gray-500 uppercase tracking-wide">Prazo</label>
                    <p className="text-gray-700 mt-1 flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      {formatDate(selectedIdeia.prazo)}
                    </p>
                  </div>
                )}

                {selectedIdeia.data_publicacao_prevista && (
                  <div>
                    <label className="text-sm font-medium text-gray-500 uppercase tracking-wide">Data de Publicação</label>
                    <p className="text-gray-700 mt-1 flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      {new Date(selectedIdeia.data_publicacao_prevista).toLocaleString('pt-BR')}
                    </p>
                  </div>
                )}
              </div>
            </div>
            
            {selectedIdeia.script_text && (
              <div className="border-t pt-6 mt-6">
                <label className="text-sm font-medium text-gray-500 uppercase tracking-wide">Roteiro</label>
                <div className="mt-2 p-4 bg-gray-50 rounded-lg">
                  <pre className="text-sm text-gray-700 whitespace-pre-wrap font-mono">{selectedIdeia.script_text}</pre>
                </div>
              </div>
            )}
            
            {selectedIdeia.legenda && (
              <div className="border-t pt-6 mt-6">
                <label className="text-sm font-medium text-gray-500 uppercase tracking-wide">Legenda</label>
                <div className="mt-2 p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-700">{selectedIdeia.legenda}</p>
                </div>
              </div>
            )}
            
            {selectedIdeia.status === 'PENDENTE' && userCanApprove && (
              <div className="flex gap-3 pt-6 mt-6 border-t">
                <button
                  onClick={() => handleApprove(selectedIdeia.id)}
                  disabled={actionLoading === selectedIdeia.id}
                  className="flex-1 bg-green-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-green-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
                >
                  <CheckCircle className="w-5 h-5" />
                  Aprovar e Criar OS
                </button>
                <button
                  onClick={() => {
                    closeModals();
                    openRejectModal(selectedIdeia);
                  }}
                  disabled={actionLoading === selectedIdeia.id}
                  className="px-6 py-3 border border-red-600 text-red-600 rounded-lg font-medium hover:bg-red-50 disabled:opacity-50 transition-colors flex items-center gap-2"
                >
                  <XCircle className="w-5 h-5" />
                  Rejeitar
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal de Rejeição */}
      {showRejectModal && selectedIdeia && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Rejeitar Ideia: {selectedIdeia.titulo}
            </h3>
            
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Motivo da rejeição *
              </label>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Descreva o motivo da rejeição..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-600 focus:border-transparent resize-none"
                rows={4}
                required
              />
            </div>
            
            <div className="flex space-x-3">
              <button
                onClick={handleReject}
                disabled={!rejectReason.trim() || actionLoading === selectedIdeia.id}
                className="flex-1 bg-red-600 text-white py-2 px-4 rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {actionLoading === selectedIdeia.id ? 'Rejeitando...' : 'Confirmar Rejeição'}
              </button>
              <button
                onClick={closeModals}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}