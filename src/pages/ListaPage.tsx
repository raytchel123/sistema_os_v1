import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { List, Filter, Search, Plus, Edit, CheckCircle, XCircle, ChevronUp, ChevronDown, Trash2 } from 'lucide-react';
import { OSDrawer } from '../components/kanban/OSDrawer';
import { useAuth } from '../contexts/AuthContext';
import { showToast } from '../components/ui/Toast';

interface OS {
  id: string;
  titulo: string;
  marca: string;
  status: string;
  prioridade: string;
  data_publicacao_prevista: string;
  criado_em: string;
}

type SortField = 'titulo' | 'marca' | 'status' | 'prioridade' | 'data_publicacao_prevista' | 'criado_em';
type SortField = 'titulo' | 'marca' | 'status' | 'prioridade' | 'data_publicacao_prevista' | 'criado_em';
type SortDirection = 'asc' | 'desc';

export function ListaPage() {
  const [ordens, setOrdens] = useState<OS[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedOS, setSelectedOS] = useState<any>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [userCanApprove, setUserCanApprove] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [sortField, setSortField] = useState<SortField>('criado_em');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [filters, setFilters] = useState({
    marca: '',
    status: '',
    prioridade: ''
  });
  const navigate = useNavigate();
  const { user } = useAuth();

  const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`;

  useEffect(() => {
    fetchOrdens();
    checkUserPermissions();
  }, [filters]);

  const checkUserPermissions = async () => {
    try {
      console.log('🔍 Checking user permissions in ListaPage...');
      const { data: { session } } = await (await import('../lib/supabase')).supabase.auth.getSession();
      if (!session) return;

      const headers = {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      };

      const response = await fetch(`${apiUrl}/api`, { headers });
      
      if (response.ok) {
        const userData = await response.json();
        console.log('👤 ListaPage user data:', userData);
        setUserCanApprove(userData.pode_aprovar || false);
        console.log('✅ ListaPage userCanApprove set to:', userData.pode_aprovar);
      } else {
        const errorText = await response.text();
        console.error('❌ ListaPage API Error:', response.status, errorText);
      }
    } catch (err) {
      console.error('Erro ao verificar permissões:', err);
    }
  };

  const fetchOrdens = async () => {
    try {
      setLoading(true);
      const { data: { session } } = await (await import('../lib/supabase')).supabase.auth.getSession();
      if (!session) return;

      const headers = {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      };

      const params = new URLSearchParams();
      if (filters.marca) params.append('marca', filters.marca);
      if (filters.status) params.append('status', filters.status);
      if (filters.prioridade) params.append('prioridade', filters.prioridade);

      const response = await fetch(`${apiUrl}/api/ordens?${params}`, { headers });
      
      if (response.ok) {
        const data = await response.json();
        setOrdens(data);
      }
    } catch (err) {
      console.error('Erro ao carregar ordens:', err);
    } finally {
      setLoading(false);
    }
  };

  const openOSDrawer = async (osId: string) => {
    try {
      console.log('🔍 ListaPage - Opening drawer for OS:', osId);
      const { data: { session } } = await (await import('../lib/supabase')).supabase.auth.getSession();
      if (!session) return;

      const headers = {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      };

      const response = await fetch(`${apiUrl}/api/ordens/${osId}`, { headers });
      
      if (response.ok) {
        const osData = await response.json();
        console.log('📦 ListaPage - Raw API response:', osData);
        
        setSelectedOS(osData);
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
    setSelectedOS(null);
  };

  const handleUpdate = () => {
    fetchOrdens(); // Refresh list after update
  };

  const handleApprove = async (osId: string) => {
    setActionLoading(osId);
    const loadingToast = showToast.loading('Aprovando OS...');
    
    try {
      const { data: { session } } = await (await import('../lib/supabase')).supabase.auth.getSession();
      if (!session) return;

      const headers = {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      };

      const response = await fetch(`${apiUrl}/api/ordens/${osId}/approve`, {
        method: 'POST',
        headers
      });

      if (response.ok) {
        showToast.success('OS aprovada com sucesso!');
        fetchOrdens(); // Refresh list
      } else {
        const errorData = await response.json().catch(() => ({}));
        showToast.error(`Erro ao aprovar OS (${response.status}): ${errorData.error || 'Erro desconhecido'}`);
      }
    } catch (err) {
      showToast.error(`Erro ao aprovar OS: ${err instanceof Error ? err.message : 'Erro de conexão'}`);
    } finally {
      showToast.dismiss(loadingToast);
      setActionLoading(null);
    }
  };

  const handleReject = async (osId: string) => {
    const motivo = prompt('Motivo da reprovação:');
    if (!motivo) return;

    setActionLoading(osId);
    const loadingToast = showToast.loading('Reprovando OS...');
    
    try {
      const { data: { session } } = await (await import('../lib/supabase')).supabase.auth.getSession();
      if (!session) return;

      const headers = {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      };

      const response = await fetch(`${apiUrl}/api/ordens/${osId}/reject`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ motivo })
      });

      if (response.ok) {
        showToast.success('OS reprovada com sucesso!');
        fetchOrdens(); // Refresh list
      } else {
        const errorData = await response.json().catch(() => ({}));
        showToast.error(`Erro ao reprovar OS (${response.status}): ${errorData.error || 'Erro desconhecido'}`);
      }
    } catch (err) {
      showToast.error(`Erro ao reprovar OS: ${err instanceof Error ? err.message : 'Erro de conexão'}`);
    } finally {
      showToast.dismiss(loadingToast);
      setActionLoading(null);
    }
  };

  const handleRemove = async (osId: string, titulo: string) => {
    if (!window.confirm(`Tem certeza que deseja remover a OS "${titulo}"? Esta ação não pode ser desfeita.`)) {
      return;
    }

    setActionLoading(osId);
    const loadingToast = showToast.loading('Removendo OS...');
    
    try {
      const { data: { session } } = await (await import('../lib/supabase')).supabase.auth.getSession();
      if (!session) return;

      const headers = {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      };

      const response = await fetch(`${apiUrl}/api/ordens/${osId}`, {
        method: 'DELETE',
        headers
      });

      if (response.ok) {
        showToast.success('OS removida com sucesso!');
        fetchOrdens(); // Refresh list
      } else {
        const errorData = await response.json().catch(() => ({}));
        showToast.error(`Erro ao remover OS (${response.status}): ${errorData.error || 'Erro desconhecido'}`);
      }
    } catch (err) {
      showToast.error(`Erro ao remover OS: ${err instanceof Error ? err.message : 'Erro de conexão'}`);
    } finally {
      showToast.dismiss(loadingToast);
      setActionLoading(null);
    }
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <div className="w-4 h-4" />; // Placeholder for alignment
    }
    return sortDirection === 'asc' ? 
      <ChevronUp className="w-4 h-4 text-blue-600" /> : 
      <ChevronDown className="w-4 h-4 text-blue-600" />;
  };

  const filteredOrdens = ordens.filter(os =>
    os.titulo.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const sortedOrdens = [...filteredOrdens].sort((a, b) => {
    let aValue: any = a[sortField];
    let bValue: any = b[sortField];

    // Handle null/undefined values
    if (aValue === null || aValue === undefined) aValue = '';
    if (bValue === null || bValue === undefined) bValue = '';

    // Convert dates to comparable format
    if (sortField === 'data_publicacao_prevista' || sortField === 'criado_em') {
      aValue = aValue ? new Date(aValue).getTime() : 0;
      bValue = bValue ? new Date(bValue).getTime() : 0;
    }

    // Convert to string for comparison if not already a number
    if (typeof aValue !== 'number') {
      aValue = String(aValue).toLowerCase();
      bValue = String(bValue).toLowerCase();
    }

    let comparison = 0;
    if (aValue < bValue) comparison = -1;
    if (aValue > bValue) comparison = 1;

    return sortDirection === 'desc' ? -comparison : comparison;
  });


  return (
<div className="w-full px-4">
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <List className="w-8 h-8 text-blue-600" />
            <h1 className="text-3xl font-bold text-gray-900">Lista de OS</h1>
          </div>
          
          <button 
            onClick={() => navigate('/criar-os')}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center space-x-2"
          >
            <Plus className="w-4 h-4" />
            <span>Nova OS</span>
          </button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
        <div className="flex items-center space-x-4">
          <div className="flex-1 relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por título..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          
          <div className="flex items-center space-x-3">
            <Filter className="w-4 h-4 text-gray-500" />
            <select
              value={filters.marca}
              onChange={(e) => setFilters(prev => ({ ...prev, marca: e.target.value }))}
              className="border border-gray-300 rounded px-3 py-2"
            >
              <option value="">Todas as marcas</option>
              <option value="RAYTCHEL">Raytchel</option>
              <option value="ZAFFIRA">Zaffira</option>
              <option value="ZAFF">Zaff</option>
              <option value="CRISPIM">Crispim</option>
              <option value="FAZENDA">Fazenda</option>
            </select>
            
            <select
              value={filters.status}
              onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
              className="border border-gray-300 rounded px-3 py-2"
            >
              <option value="">Todos os status</option>
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
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                    onClick={() => handleSort('titulo')}
                  >
                    <div className="flex items-center space-x-1">
                      <span>Número</span>
                      {getSortIcon('numero_os')}
                    </div>
                  </th>
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                    onClick={() => handleSort('titulo')}
                  >
                    <div className="flex items-center space-x-1">
                      <span>Título</span>
                      {getSortIcon('titulo')}
                    </div>
                  </th>
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                    onClick={() => handleSort('marca')}
                  >
                    <div className="flex items-center space-x-1">
                      <span>Marca</span>
                      {getSortIcon('marca')}
                    </div>
                  </th>
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                    onClick={() => handleSort('status')}
                  >
                    <div className="flex items-center space-x-1">
                      <span>Status</span>
                      {getSortIcon('status')}
                    </div>
                  </th>
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                    onClick={() => handleSort('prioridade')}
                  >
                    <div className="flex items-center space-x-1">
                      <span>Prioridade</span>
                      {getSortIcon('prioridade')}
                    </div>
                  </th>
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                    onClick={() => handleSort('data_publicacao_prevista')}
                  >
                    <div className="flex items-center space-x-1">
                      <span>Data Prevista</span>
                      {getSortIcon('data_publicacao_prevista')}
                    </div>
                  </th>
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                    onClick={() => handleSort('criado_em')}
                  >
                    <div className="flex items-center space-x-1">
                      <span>Criado em</span>
                      {getSortIcon('criado_em')}
                    </div>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Categorias
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {sortedOrdens.map((os) => (
                  <tr key={os.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 font-mono">
                        #{os.numero_os || '---'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{os.titulo}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {os.marca}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                        {os.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        os.prioridade === 'HIGH' ? 'bg-red-100 text-red-800' :
                        os.prioridade === 'MEDIUM' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-green-100 text-green-800'
                      }`}>
                        {os.prioridade}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {os.data_publicacao_prevista ? 
                        new Date(os.data_publicacao_prevista).toLocaleDateString('pt-BR') : 
                        '-'
                      }
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(os.criado_em).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-wrap gap-1">
                        {(os.categorias_criativos || []).slice(0, 3).map((categoria, index) => (
                          <span key={index} className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                            {categoria}
                          </span>
                        ))}
                        {(os.categorias_criativos || []).length > 3 && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                            +{(os.categorias_criativos || []).length - 3}
                          </span>
                        )}
                        {(!os.categorias_criativos || os.categorias_criativos.length === 0) && (
                          <span className="text-xs text-gray-400 italic">Nenhuma categoria</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end space-x-2">
                        {os.status === 'APROVACAO' && userCanApprove && (
                          <>
                            <button
                              onClick={() => handleApprove(os.id)}
                              disabled={actionLoading === os.id}
                              className="bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700 disabled:opacity-50 flex items-center text-xs"
                              title="Aprovar OS"
                            >
                              <CheckCircle className="w-3 h-3 mr-1" />
                              Aprovar
                            </button>
                            <button
                              onClick={() => handleReject(os.id)}
                              disabled={actionLoading === os.id}
                              className="bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700 disabled:opacity-50 flex items-center text-xs"
                              title="Reprovar OS"
                            >
                              <XCircle className="w-3 h-3 mr-1" />
                              Reprovar
                            </button>
                          </>
                        )}
                        {userCanApprove && (
                          <button
                            onClick={() => handleRemove(os.id, os.titulo)}
                            disabled={actionLoading === os.id}
                            className="bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700 disabled:opacity-50 flex items-center text-xs"
                            title="Remover OS"
                          >
                            <Trash2 className="w-3 h-3 mr-1" />
                          </button>
                        )}
                        <button
                          onClick={() => openOSDrawer(os.id)}
                          className="text-blue-600 hover:text-blue-900 p-2 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Editar OS"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <OSDrawer
        isOpen={isDrawerOpen}
        onClose={closeDrawer}
        ordem={selectedOS}
        onUpdate={handleUpdate}
      />
    </div>
  );
}