import { useState, useEffect } from 'react';
import { X, Save, Calendar, User, Tag, FileText, Link, Trash2, Copy, Clock, AlertTriangle, CheckCircle } from 'lucide-react';
import { showToast } from '../ui/Toast';
import { useAuth } from '../../contexts/AuthContext';

interface OSDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  ordem: any;
  onUpdate: () => void;
}

export function OSDrawer({ isOpen, onClose, ordem, onUpdate }: OSDrawerProps) {
  const [loading, setLoading] = useState(false);
  const [approvalLoading, setApprovalLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('info');
  const [users, setUsers] = useState<any[]>([]);
  const [brands, setBrands] = useState<any[]>([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [brandsLoading, setBrandsLoading] = useState(true);
  const [logs, setLogs] = useState<any[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [formData, setFormData] = useState({
    titulo: '',
    descricao: '',
    marca: '',
    objetivo: '',
    tipo: '',
    prioridade: '',
    data_publicacao_prevista: '',
    canais: [] as string[],
    gancho: '',
    cta: '',
    script_text: '',
    legenda: '',
    informacoes_adicionais: '',
    raw_media_links: [] as string[],
    final_media_links: [] as string[],
    categorias_criativos: [] as string[],
    responsaveis: {},
    prazo: ''
  });
  const { user } = useAuth();

  const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`;

  useEffect(() => {
    if (isOpen) {
      fetchUsers();
      fetchBrands();
      if (ordem?.id) {
        fetchLogs();
      }
    }
  }, [isOpen]);

  const fetchLogs = async () => {
    if (!ordem?.id) return;
    
    try {
      setLogsLoading(true);
      const { data: { session } } = await (await import('../../lib/supabase')).supabase.auth.getSession();
      if (!session) return;

      const headers = {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      };

      const response = await fetch(`${apiUrl}/api/ordens/${ordem.id}/logs`, { headers });
      
      if (response.ok) {
        const data = await response.json();
        setLogs(data);
        console.log('📋 Logs loaded for OS:', data);
      } else {
        console.error('❌ Error loading logs:', response.status);
      }
    } catch (err) {
      console.error('Erro ao carregar logs:', err);
    } finally {
      setLogsLoading(false);
    }
  };

  useEffect(() => {
    if (ordem && isOpen) {
      console.log('🔄 OSDrawer - Raw ordem data:', ordem);
      console.log('🔄 OSDrawer - Ordem ID:', ordem.id);
      console.log('🔄 OSDrawer - Ordem titulo:', ordem.titulo);
      
      setFormData({
        titulo: ordem?.titulo || '',
        descricao: ordem?.descricao || '',
        marca: ordem?.marca || '',
        objetivo: ordem?.objetivo || '',
        tipo: ordem?.tipo || '',
        prioridade: ordem?.prioridade || '',
        data_publicacao_prevista: ordem?.data_publicacao_prevista ? 
          new Date(ordem.data_publicacao_prevista).toISOString().slice(0, 16) : '',
        canais: ordem?.canais || [],
        gancho: ordem?.gancho || '',
        cta: ordem?.cta || '',
        script_text: ordem?.script_text || '',
        legenda: ordem?.legenda || '',
        informacoes_adicionais: ordem?.informacoes_adicionais || '',
        raw_media_links: ordem?.midia_bruta_links || ordem?.raw_media_links || [],
        final_media_links: ordem?.criativos_prontos_links || ordem?.final_media_links || [],
        categorias_criativos: ordem?.categorias_criativos || [],
        responsaveis: ordem?.responsaveis || {},
        prazo: ordem?.prazo ? new Date(ordem.prazo).toISOString().split('T')[0] : ''
      });
    }
  }, [ordem, isOpen]);

  const fetchUsers = async () => {
    try {
      setUsersLoading(true);
      const { data: { session } } = await (await import('../../lib/supabase')).supabase.auth.getSession();
      if (!session) return;

      const headers = {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      };

      const response = await fetch(`${apiUrl}/api/users`, { headers });
      
      if (response.ok) {
        const data = await response.json();
        setUsers(data);
        console.log('👥 Users loaded for drawer:', data);
      } else {
        console.error('❌ Error loading users:', response.status);
      }
    } catch (err) {
      console.error('Erro ao carregar usuários:', err);
    } finally {
      setUsersLoading(false);
    }
  };

  const fetchBrands = async () => {
    try {
      setBrandsLoading(true);
      const { data: { session } } = await (await import('../../lib/supabase')).supabase.auth.getSession();
      if (!session) return;

      const headers = {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      };

      const response = await fetch(`${apiUrl}/api/brands`, { headers });
      
      if (response.ok) {
        const data = await response.json();
        setBrands(data.filter((brand: any) => brand.is_active));
      }
    } catch (err) {
      console.error('Erro ao carregar marcas:', err);
    } finally {
      setBrandsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!ordem?.id) return;

    console.log('💾 OSDrawer - Starting save for OS:', ordem.id);
    console.log('📝 OSDrawer - Current form data:', formData);
    console.log('📝 OSDrawer - Form data validation:', {
      hasTitulo: !!formData.titulo,
      hasDescricao: !!formData.descricao,
      hasMarca: !!formData.marca,
      hasObjetivo: !!formData.objetivo,
      hasTipo: !!formData.tipo,
      formDataKeys: Object.keys(formData)
    });

    setLoading(true);
    const loadingToast = showToast.loading('Salvando alterações...');

    try {
      const { data: { session } } = await (await import('../../lib/supabase')).supabase.auth.getSession();
      if (!session) {
        throw new Error('Usuário não autenticado');
      }

      const headers = {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      };

      // Preparar dados para envio
      const payload = {
        titulo: formData.titulo,
        descricao: formData.descricao,
        marca: formData.marca,
        objetivo: formData.objetivo,
        tipo: formData.tipo,
        status: formData.status || ordem.status,
        prioridade: formData.prioridade,
        data_publicacao_prevista: formData.data_publicacao_prevista || null,
        canais: formData.canais,
        gancho: formData.gancho || null,
        cta: formData.cta || null,
        script_text: formData.script_text || null,
        legenda: formData.legenda || null,
        informacoes_adicionais: formData.informacoes_adicionais || null,
        midia_bruta_links: formData.raw_media_links.filter(link => link.trim()),
        criativos_prontos_links: formData.final_media_links.filter(link => link.trim()),
        categorias_criativos: formData.categorias_criativos,
        responsaveis: formData.responsaveis,
        prazo: formData.prazo || null
      };
      
      console.log('🚀 OSDrawer - Final payload:', payload);
      console.log('🚀 OSDrawer - Payload validation:', {
        hasRequiredFields: !!(payload.titulo && payload.marca && payload.objetivo && payload.tipo),
        payloadSize: JSON.stringify(payload).length,
        endpoint: `${apiUrl}/api/ordens/${ordem.id}`
      });

      const response = await fetch(`${apiUrl}/api/ordens/${ordem.id}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(payload)
      });

      console.log('📡 OSDrawer - API response:', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
        headers: Object.fromEntries(response.headers.entries())
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('❌ OSDrawer - API error:', response.status, errorData);
        throw new Error(`Erro ao salvar (${response.status}): ${errorData.error || 'Erro desconhecido'}`);
      }

      const responseData = await response.json();
      console.log('✅ OSDrawer - Save successful:', responseData);
      
      showToast.success('OS atualizada com sucesso!');
      onUpdate();
    } catch (error) {
      console.error('Erro ao salvar OS:', error);
      showToast.error(error instanceof Error ? error.message : 'Erro desconhecido');
    } finally {
      showToast.dismiss(loadingToast);
      setLoading(false);
    }
  };

  const handlePedirAprovacao = async () => {
    if (!ordem?.id) return;

    setApprovalLoading(true);
    const loadingToast = showToast.loading('Enviando para aprovação...');

    try {
      const { data: { session } } = await (await import('../../lib/supabase')).supabase.auth.getSession();
      if (!session) {
        throw new Error('Usuário não autenticado');
      }

      const headers = {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      };

      const response = await fetch(`${apiUrl}/api/ordens/${ordem.id}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({
          ...formData,
          status: 'APROVACAO'
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`Erro ao enviar para aprovação (${response.status}): ${errorData.error || 'Erro desconhecido'}`);
      }

      showToast.success('OS enviada para aprovação com sucesso!');
      onUpdate();
      onClose();
    } catch (error) {
      console.error('Erro ao enviar para aprovação:', error);
      showToast.error(error instanceof Error ? error.message : 'Erro desconhecido');
    } finally {
      showToast.dismiss(loadingToast);
      setApprovalLoading(false);
    }
  };

  const handleMarkAsPosted = async () => {
    if (!ordem?.id) return;

    if (!window.confirm('Tem certeza que deseja marcar esta OS como postada?')) {
      return;
    }

    setLoading(true);
    const loadingToast = showToast.loading('Marcando como postado...');

    try {
      const { data: { session } } = await (await import('../../lib/supabase')).supabase.auth.getSession();
      if (!session) {
        throw new Error('Usuário não autenticado');
      }

      const headers = {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      };

      const response = await fetch(`${apiUrl}/api/ordens/${ordem.id}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({
          ...formData,
          status: 'POSTADO'
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`Erro ao marcar como postado (${response.status}): ${errorData.error || 'Erro desconhecido'}`);
      }

      showToast.success('OS marcada como postada com sucesso!');
      onUpdate();
      onClose();
    } catch (error) {
      console.error('Erro ao marcar como postado:', error);
      showToast.error(error instanceof Error ? error.message : 'Erro desconhecido');
    } finally {
      showToast.dismiss(loadingToast);
      setLoading(false);
    }
  };

  const handleCanaisChange = (canal: string, checked: boolean) => {
    if (checked) {
      setFormData(prev => ({
        ...prev,
        canais: [...prev.canais, canal]
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        canais: prev.canais.filter(c => c !== canal)
      }));
    }
  };

  const handleCategoriasChange = (categoria: string, checked: boolean) => {
    if (checked) {
      setFormData(prev => ({
        ...prev,
        categorias_criativos: [...prev.categorias_criativos, categoria]
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        categorias_criativos: prev.categorias_criativos.filter(c => c !== categoria)
      }));
    }
  };

  const addMediaLink = (type: 'raw_media_links' | 'final_media_links') => {
    setFormData(prev => ({
      ...prev,
      [type]: [...prev[type], '']
    }));
  };

  const removeMediaLink = (type: 'raw_media_links' | 'final_media_links', index: number) => {
    setFormData(prev => ({
      ...prev,
      [type]: prev[type].filter((_, i) => i !== index)
    }));
  };

  const updateMediaLink = (type: 'raw_media_links' | 'final_media_links', index: number, value: string) => {
    setFormData(prev => ({
      ...prev,
      [type]: prev[type].map((link, i) => i === index ? value : link)
    }));
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'Não definido';
    const date = new Date(dateString);
    return isNaN(date.getTime()) ? 'Data inválida' : date.toLocaleDateString('pt-BR');
  };

  const getStatusColor = (status: string) => {
    const colors = {
      'ROTEIRO': 'bg-gray-100 text-gray-800',
      'AUDIO': 'bg-pink-100 text-pink-800',
      'CAPTACAO': 'bg-orange-100 text-orange-800',
      'EDICAO': 'bg-purple-100 text-purple-800',
      'REVISAO': 'bg-yellow-100 text-yellow-800',
      'APROVACAO': 'bg-blue-100 text-blue-800',
      'AGENDAMENTO': 'bg-indigo-100 text-indigo-800',
      'POSTADO': 'bg-green-100 text-green-800'
    };
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const getPriorityColor = (prioridade: string) => {
    switch (prioridade) {
      case 'HIGH': return 'text-red-600';
      case 'MEDIUM': return 'text-yellow-600';
      case 'LOW': return 'text-green-600';
      default: return 'text-gray-600';
    }
  };

  const tabs = [
    { id: 'info', label: 'Informações', icon: FileText },
    { id: 'script', label: 'Roteiro', icon: FileText },
    { id: 'media', label: 'Mídia', icon: Link },
    { id: 'timeline', label: 'Timeline', icon: Clock }
  ];

  const marcaOptions = [
    ...brands.map(brand => ({
      value: brand.code,
      label: brand.name
    }))
  ];

  const objetivoOptions = [
    { value: 'ATRACAO', label: 'Atração' },
    { value: 'NUTRICAO', label: 'Nutrição' },
    { value: 'CONVERSAO', label: 'Conversão' }
  ];

  const tipoOptions = [
    { value: 'EDUCATIVO', label: 'Educativo' },
    { value: 'HISTORIA', label: 'História' },
    { value: 'CONVERSAO', label: 'Conversão' }
  ];

  const prioridadeOptions = [
    { value: 'LOW', label: 'Baixa' },
    { value: 'MEDIUM', label: 'Média' },
    { value: 'HIGH', label: 'Alta' }
  ];

  const canaisOptions = [
    'Instagram', 'TikTok', 'YouTube', 'Facebook', 'LinkedIn', 'Twitter', 'Stories', 'Reels', 'Threads','Pinterest'
  ];

  const categoriasOptions = [
    'Instagram Stories', 'Instagram Feed', 'Instagram Reels', 'TikTok', 'YouTube Shorts', 
    'YouTube', 'LinkedIn', 'Facebook', 'Twitter', 'Threads','Pinterest'
  ];

  if (!isOpen || !ordem) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex">
      <div className="ml-auto w-full max-w-4xl bg-white h-full overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-white">
          <div className="flex items-center space-x-4">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 line-clamp-1">
                {ordem.titulo}
              </h2>
              <div className="flex items-center space-x-3 mt-1">
                <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(ordem.status)}`}>
                  {ordem.status}
                </span>
                <span className={`text-sm font-medium ${getPriorityColor(ordem.prioridade)}`}>
                  {ordem.prioridade}
                </span>
                <span className="text-sm text-gray-500">
                  {ordem.marca}
                </span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            <button
              onClick={handlePedirAprovacao}
              disabled={approvalLoading || ordem.status === 'APROVACAO' || ordem.status === 'POSTADO'}
              className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              <CheckCircle className="w-4 h-4" />
              <span>{approvalLoading ? 'Enviando...' : 'Pedir para Aprovar'}</span>
            </button>
            <button
              onClick={handleSave}
              disabled={loading}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center space-x-2"
            >
              <Save className="w-4 h-4" />
              <span>{loading ? 'Salvando...' : 'Salvar'}</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>


        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Informações Tab */}
          {activeTab === 'info' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Título *
                  </label>
                  <input
                    type="text"
                    value={formData.titulo}
                    onChange={(e) => setFormData(prev => ({ ...prev, titulo: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Marca *
                  </label>
                  {brandsLoading ? (
                    <div className="flex items-center justify-center py-2 border border-gray-300 rounded-lg">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                      <span className="ml-2 text-gray-600 text-sm">Carregando...</span>
                    </div>
                  ) : (
                    <select
                      value={formData.marca}
                      onChange={(e) => setFormData(prev => ({ ...prev, marca: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent"
                    >
                      <option value="">Selecione uma marca...</option>
                      {marcaOptions.map(option => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Objetivo *
                  </label>
                  <select
                    value={formData.objetivo}
                    onChange={(e) => setFormData(prev => ({ ...prev, objetivo: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent"
                  >
                    {objetivoOptions.map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tipo *
                  </label>
                  <select
                    value={formData.tipo}
                    onChange={(e) => setFormData(prev => ({ ...prev, tipo: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent"
                  >
                    {tipoOptions.map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Prioridade
                  </label>
                  <select
                    value={formData.prioridade}
                    onChange={(e) => setFormData(prev => ({ ...prev, prioridade: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent"
                  >
                    {prioridadeOptions.map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Status
                  </label>
                  <select
                    value={formData.status || ordem?.status || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent"
                  >
                    <option value="ROTEIRO">Roteiro</option>
                    <option value="AUDIO">Áudio</option>
                    <option value="CAPTACAO">Captação</option>
                    <option value="EDICAO">Edição</option>
                    <option value="REVISAO">Revisão</option>
                    <option value="APROVACAO">Aprovação</option>
                    <option value="AGENDAMENTO">Agendamento</option>
                    <option value="PUBLICADO">Publicado</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Data de Publicação
                  </label>
                  <input
                    type="datetime-local"
                    value={formData.data_publicacao_prevista}
                    onChange={(e) => setFormData(prev => ({ ...prev, data_publicacao_prevista: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Prazo
                  </label>
                  <input
                    type="date"
                    value={formData.prazo}
                    onChange={(e) => setFormData(prev => ({ ...prev, prazo: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Descrição
                </label>
                <textarea
                  value={formData.descricao}
                  onChange={(e) => setFormData(prev => ({ ...prev, descricao: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent resize-none"
                  rows={4}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Gancho
                </label>
                <textarea
                  value={formData.gancho}
                  onChange={(e) => setFormData(prev => ({ ...prev, gancho: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent resize-none"
                  rows={3}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Call to Action (CTA)
                </label>
                <input
                  type="text"
                  value={formData.cta}
                  onChange={(e) => setFormData(prev => ({ ...prev, cta: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent"
                />
              </div>

              {/* Responsáveis */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Responsáveis
                </label>
                {usersLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                    <span className="ml-2 text-gray-600">Carregando usuários...</span>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Edição</label>
                      <select
                        value={formData.responsaveis?.edicao || ''}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          responsaveis: { ...prev.responsaveis, edicao: e.target.value }
                        }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent"
                      >
                        <option value="">Selecione...</option>
                        {users.map(user => (
                          <option key={user.id} value={user.id}>
                            {user.nome} ({user.papel})
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Arte</label>
                      <select
                        value={formData.responsaveis?.arte || ''}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          responsaveis: { ...prev.responsaveis, arte: e.target.value }
                        }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent"
                      >
                        <option value="">Selecione...</option>
                        {users.map(user => (
                          <option key={user.id} value={user.id}>
                            {user.nome} ({user.papel})
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Revisão</label>
                      <select
                        value={formData.responsaveis?.revisao || ''}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          responsaveis: { ...prev.responsaveis, revisao: e.target.value }
                        }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent"
                      >
                        <option value="">Selecione...</option>
                        {users.map(user => (
                          <option key={user.id} value={user.id}>
                            {user.nome} ({user.papel})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}
              </div>

              {/* Canais */}
          <div className="hidden">
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Canais de Distribuição
                </label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {canaisOptions.map(canal => (
                    <label key={canal} className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.canais.includes(canal)}
                        onChange={(e) => handleCanaisChange(canal, e.target.checked)}
                        className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700">{canal}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Categorias */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Categorias dos Criativos
                </label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {categoriasOptions.map(categoria => (
                    <label key={categoria} className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.categorias_criativos.includes(categoria)}
                        onChange={(e) => handleCategoriasChange(categoria, e.target.checked)}
                        className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700">{categoria}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Roteiro Tab */}
          {activeTab === 'script' && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Roteiro / Script
                </label>
                <textarea
                  value={formData.script_text}
                  onChange={(e) => setFormData(prev => ({ ...prev, script_text: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent resize-none font-mono text-sm"
                  rows={20}
                  placeholder="Digite o roteiro aqui..."
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Legenda
                </label>
                <textarea
                  value={formData.legenda}
                  onChange={(e) => setFormData(prev => ({ ...prev, legenda: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent resize-none"
                  rows={8}
                  placeholder="Digite a legenda para as redes sociais..."
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Informações Adicionais
                </label>
                <textarea
                  value={formData.informacoes_adicionais}
                  onChange={(e) => setFormData(prev => ({ ...prev, informacoes_adicionais: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent resize-none bg-gray-50"
                  rows={6}
                  placeholder="Adicione informações extras, observações, briefings específicos ou qualquer detalhe importante para a produção..."
                />
                <p className="text-xs text-gray-500 mt-1">
                  Campo opcional para informações complementares que podem ajudar na produção
                </p>
              </div>
            </div>
          )}

          {/* Mídia Tab */}
          {activeTab === 'media' && (
            <div className="space-y-6">
              {/* Links de Mídia Bruta */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Links de Mídia Bruta
                </label>
                <div className="space-y-2">
                  {formData.raw_media_links.map((link, index) => (
                    <div key={index} className="flex gap-2">
                      <input
                        type="url"
                        value={link}
                        onChange={(e) => updateMediaLink('raw_media_links', index, e.target.value)}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent"
                        placeholder="https://drive.google.com/..."
                      />
                      {formData.raw_media_links.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeMediaLink('raw_media_links', index)}
                          className="px-3 py-2 text-red-600 hover:text-red-800"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => addMediaLink('raw_media_links')}
                    className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                  >
                    + Adicionar link
                  </button>
                </div>
              </div>

              {/* Links de Criativos Finais */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Links de Criativos Finais
                </label>
                <div className="space-y-2">
                  {formData.final_media_links.map((link, index) => (
                    <div key={index} className="flex gap-2">
                      <input
                        type="url"
                        value={link}
                        onChange={(e) => updateMediaLink('final_media_links', index, e.target.value)}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent"
                        placeholder="https://drive.google.com/..."
                      />
                      {formData.final_media_links.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeMediaLink('final_media_links', index)}
                          className="px-3 py-2 text-red-600 hover:text-red-800"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => addMediaLink('final_media_links')}
                    className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                  >
                    + Adicionar link
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Timeline Tab */}
          {activeTab === 'timeline' && (
            <div className="space-y-6">
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-medium text-gray-900 mb-4">Informações da OS</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Criado em:</span>
                    <span className="ml-2 font-medium">{formatDate(ordem.criado_em)}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Atualizado em:</span>
                    <span className="ml-2 font-medium">{formatDate(ordem.atualizado_em)}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Status atual:</span>
                    <span className={`ml-2 px-2 py-1 rounded text-xs font-medium ${getStatusColor(ordem.status)}`}>
                      {ordem.status}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600">Responsável:</span>
                    <span className="ml-2 font-medium">
                      {ordem.responsavel?.nome || 'Não atribuído'}
                    </span>
                  </div>
                </div>
              </div>

              {ordem.sla_atual && (
                <div className={`p-4 rounded-lg border ${
                  new Date(ordem.sla_atual) < new Date() 
                    ? 'bg-red-50 border-red-200' 
                    : 'bg-yellow-50 border-yellow-200'
                }`}>
                  <div className="flex items-center">
                    {new Date(ordem.sla_atual) < new Date() ? (
                      <AlertTriangle className="w-5 h-5 text-red-600 mr-2" />
                    ) : (
                      <Clock className="w-5 h-5 text-yellow-600 mr-2" />
                    )}
                    <div>
                      <p className={`font-medium ${
                        new Date(ordem.sla_atual) < new Date() ? 'text-red-800' : 'text-yellow-800'
                      }`}>
                        {new Date(ordem.sla_atual) < new Date() ? 'SLA Vencido' : 'SLA Ativo'}
                      </p>
                      <p className={`text-sm ${
                        new Date(ordem.sla_atual) < new Date() ? 'text-red-600' : 'text-yellow-600'
                      }`}>
                        {formatDate(ordem.sla_atual)}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
              ,
              <div className="bg-white rounded-lg border border-gray-200">
                <div className="p-4 border-b border-gray-200">
                  <h3 className="font-medium text-gray-900 flex items-center">
                    <Clock className="w-5 h-5 mr-2 text-blue-600" />
                    Histórico de Eventos
                  </h3>
                </div>
                
                <div className="p-4">
                  {logsLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                      <span className="ml-2 text-gray-600">Carregando histórico...</span>
                    </div>
                  ) : logs.length === 0 ? (
                    <div className="text-center py-8">
                      <Clock className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                      <p className="text-gray-500">Nenhum evento registrado</p>
                    </div>
                  ) : (
                    <div className="space-y-4 max-h-96 overflow-y-auto">
                      {logs.map((log, index) => (
                        <div key={log.id || index} className="flex items-start space-x-3 p-4 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors">
                          <div className="flex-shrink-0">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                              log.acao === 'CRIAR' ? 'bg-blue-100' :
                              log.acao === 'MUDAR_STATUS' ? 'bg-green-100' :
                              log.acao === 'ANEXAR_ASSET' ? 'bg-purple-100' :
                              log.acao === 'REPROVAR' ? 'bg-red-100' :
                              log.acao === 'APROVAR' ? 'bg-green-100' :
                              log.acao === 'AGENDAR' ? 'bg-indigo-100' :
                              log.acao === 'POSTAR' ? 'bg-green-100' :
                              'bg-gray-100'
                            }`}>
                              {log.acao === 'CRIAR' && <FileText className="w-4 h-4 text-blue-600" />}
                              {log.acao === 'MUDAR_STATUS' && <CheckCircle className="w-4 h-4 text-green-600" />}
                              {log.acao === 'ANEXAR_ASSET' && <Link className="w-4 h-4 text-purple-600" />}
                              {log.acao === 'REPROVAR' && <XCircle className="w-4 h-4 text-red-600" />}
                              {log.acao === 'APROVAR' && <CheckCircle className="w-4 h-4 text-green-600" />}
                              {log.acao === 'AGENDAR' && <Calendar className="w-4 h-4 text-indigo-600" />}
                              {log.acao === 'POSTAR' && <CheckCircle className="w-4 h-4 text-green-600" />}
                              {!['CRIAR', 'MUDAR_STATUS', 'ANEXAR_ASSET', 'REPROVAR', 'APROVAR', 'AGENDAR', 'POSTAR'].includes(log.acao) && 
                                <Clock className="w-4 h-4 text-gray-600" />}
                            </div>
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex-1">
                                <p className="text-sm font-semibold text-gray-900">
                                {log.acao === 'CRIAR' && 'OS Criada'}
                                {log.acao === 'MUDAR_STATUS' && 'Status Alterado'}
                                {log.acao === 'ANEXAR_ASSET' && 'Asset Anexado'}
                                {log.acao === 'REPROVAR' && 'OS Reprovada'}
                                {log.acao === 'APROVAR' && 'OS Aprovada'}
                                {log.acao === 'AGENDAR' && 'OS Agendada'}
                                {log.acao === 'POSTAR' && 'OS Postada'}
                                {!['CRIAR', 'MUDAR_STATUS', 'ANEXAR_ASSET', 'REPROVAR', 'APROVAR', 'AGENDAR', 'POSTAR'].includes(log.acao) && log.acao}
                                </p>
                                
                                {/* Extrair informações do detalhe */}
                                {(() => {
                                  try {
                                    const detalheObj = JSON.parse(log.detalhe || '{}');
                                    return (
                                      <div className="mt-1 space-y-1">
                                        {detalheObj.from_state && detalheObj.to_state && (
                                          <div className="flex items-center space-x-2 text-xs">
                                            <span className="text-gray-500">Status:</span>
                                            <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(detalheObj.from_state)}`}>
                                              {detalheObj.from_state}
                                            </span>
                                            <span className="text-gray-400">→</span>
                                            <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(detalheObj.to_state)}`}>
                                              {detalheObj.to_state}
                                            </span>
                                          </div>
                                        )}
                                        
                                        {detalheObj.note && (
                                          <div className="text-xs text-gray-600 bg-yellow-50 border border-yellow-200 rounded p-2 mt-2">
                                            <span className="font-medium text-yellow-800">Motivo:</span> {detalheObj.note}
                                          </div>
                                        )}
                                        
                                        {detalheObj.reason && (
                                          <div className="text-xs text-gray-600 bg-blue-50 border border-blue-200 rounded p-2 mt-2">
                                            <span className="font-medium text-blue-800">Observação:</span> {detalheObj.reason}
                                          </div>
                                        )}
                                        
                                        {detalheObj.data_hora && (
                                          <div className="text-xs text-gray-600">
                                            <span className="font-medium">Agendado para:</span> {new Date(detalheObj.data_hora).toLocaleString('pt-BR')}
                                          </div>
                                        )}
                                        
                                        {detalheObj.plataforma && (
                                          <div className="text-xs text-gray-600">
                                            <span className="font-medium">Plataforma:</span> {detalheObj.plataforma}
                                          </div>
                                        )}
                                        
                                        {detalheObj.action && (
                                          <div className="text-xs text-gray-600">
                                            <span className="font-medium">Ação:</span> {detalheObj.action}
                                          </div>
                                        )}
                                        
                                        {detalheObj.titulo && log.acao === 'DELETE' && (
                                          <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded p-2 mt-2">
                                            <span className="font-medium">OS Removida:</span> {detalheObj.titulo}
                                          </div>
                                        )}
                                      </div>
                                    );
                                  } catch {
                                    // Se não for JSON válido, mostrar como texto simples
                                    return null;
                                  }
                                })()}
                              </div>
                              
                              <span className="text-xs text-gray-500">
                                {new Date(log.timestamp).toLocaleString('pt-BR')}
                              </span>
                            </div>
                            
                            {log.detalhe && (
                              <div className="mt-2">
                                {(() => {
                                  try {
                                    // Tentar parsear como JSON primeiro
                                    JSON.parse(log.detalhe);
                                    return null; // Se for JSON, já foi processado acima
                                  } catch {
                                    // Se não for JSON, mostrar como texto simples
                                    return (
                                      <p className="text-sm text-gray-600 bg-gray-100 rounded p-2 border border-gray-200">
                                        {log.detalhe}
                                      </p>
                                    );
                                  }
                                })()}
                              </div>
                            )}
                            
                            {log.user && (
                              <div className="flex items-center mt-3 pt-2 border-t border-gray-200">
                                <User className="w-3 h-3 text-gray-400 mr-1" />
                                <span className="text-xs text-gray-600 font-medium">
                                  {log.user.nome} ({log.user.papel})
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
          )}
        </div>
      </div>
    </div>
  );
}