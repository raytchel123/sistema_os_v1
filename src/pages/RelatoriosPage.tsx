import { useState, useEffect } from 'react';
import { BarChart3, AlertTriangle, Clock, TrendingUp, Users, Target, Calendar, Award, Zap } from 'lucide-react';
import { showToast } from '../components/ui/Toast';

interface SLAStats {
  total_ativas: number;
  em_risco: number;
  atrasadas: number;
  alta_prioridade_atrasadas: number;
  por_marca: Record<string, { total: number; atrasadas: number; em_risco: number }>;
  detalhes: {
    em_risco: any[];
    atrasadas: any[];
  };
}

interface ProductivityReport {
  periodo: string;
  usuarios: Array<{
    nome: string;
    papel: string;
    os_completadas: number;
    marcas: string[];
  }>;
  total_os_completadas: number;
}

export function RelatoriosPage() {
  const [stats, setStats] = useState<SLAStats | null>(null);
  const [productivity, setProductivity] = useState<ProductivityReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('sla');

  const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`;

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      const { data: { session } } = await (await import('../lib/supabase')).supabase.auth.getSession();
      if (!session) return;

      const headers = {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      };

      const [slaRes, productivityRes] = await Promise.all([
        fetch(`${apiUrl}/sla-monitor/sla-stats`, { headers }),
        fetch(`${apiUrl}/sla-monitor/productivity-report`, { headers })
      ]);
      
      if (slaRes.ok) {
        const slaData = await slaRes.json();
        setStats(slaData);
      }
      
      if (productivityRes.ok) {
        const productivityData = await productivityRes.json();
        setProductivity(productivityData);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  const runSLAMonitor = async () => {
    const loadingToast = showToast.loading('Executando monitor de SLA...');
    
    try {
      const { data: { session } } = await (await import('../lib/supabase')).supabase.auth.getSession();
      if (!session) return;

      const headers = {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      };

      const response = await fetch(`${apiUrl}/sla-monitor/sla-monitor`, {
        method: 'POST',
        headers
      });
      
      if (response.ok) {
        showToast.success('Monitor de SLA executado com sucesso!');
        fetchData(); // Refresh data
      } else {
        showToast.error('Erro ao executar monitor de SLA');
      }
    } catch (error) {
      showToast.error('Erro ao executar monitor de SLA');
    } finally {
      showToast.dismiss(loadingToast);
    }
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return !isNaN(date.getTime()) ? date.toLocaleString('pt-BR') : 'Data inválida';
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

  const tabs = [
    { id: 'sla', label: 'SLA & Prazos', icon: Clock },
    { id: 'productivity', label: 'Produtividade', icon: TrendingUp },
    { id: 'brands', label: 'Por Marca', icon: Target },
  ];

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <BarChart3 className="w-8 h-8 text-orange-600" />
            <h1 className="text-3xl font-bold text-gray-900">Relatórios</h1>
          </div>
          <button
            onClick={runSLAMonitor}
            className="bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 transition-colors flex items-center"
          >
            <Zap className="w-4 h-4 mr-2" />
            Executar Monitor SLA
          </button>
        </div>
        <p className="text-gray-600">
          Analise métricas de produção, SLA e performance da equipe
        </p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-8">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                activeTab === tab.id
                  ? 'border-orange-500 text-orange-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* SLA Tab */}
      {activeTab === 'sla' && stats && (
        <div className="space-y-6">
          {/* Cards de Estatísticas */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-center">
                <Users className="w-8 h-8 text-blue-600 mr-3" />
                <div>
                  <p className="text-sm text-gray-600">Total Ativas</p>
                  <p className="text-3xl font-bold text-gray-900">{stats.total_ativas}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-center">
                <Clock className="w-8 h-8 text-yellow-600 mr-3" />
                <div>
                  <p className="text-sm text-gray-600">Em Risco</p>
                  <p className="text-3xl font-bold text-yellow-600">{stats.em_risco}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-center">
                <AlertTriangle className="w-8 h-8 text-red-600 mr-3" />
                <div>
                  <p className="text-sm text-gray-600">Atrasadas</p>
                  <p className="text-3xl font-bold text-red-600">{stats.atrasadas}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-center">
                <TrendingUp className="w-8 h-8 text-purple-600 mr-3" />
                <div>
                  <p className="text-sm text-gray-600">Alta Prioridade</p>
                  <p className="text-3xl font-bold text-purple-600">{stats.alta_prioridade_atrasadas}</p>
                </div>
              </div>
            </div>
          </div>

          {/* OS Em Risco */}
          {stats.detalhes.em_risco.length > 0 && (
            <div className="bg-white rounded-lg border border-yellow-200 shadow-sm">
              <div className="p-6 border-b border-yellow-200 bg-yellow-50">
                <h3 className="text-lg font-semibold text-yellow-800 flex items-center">
                  <Clock className="w-5 h-5 mr-2" />
                  OS Em Risco (SLA próximo do vencimento)
                </h3>
              </div>
              <div className="p-6">
                <div className="space-y-4">
                  {stats.detalhes.em_risco.map((os: any) => (
                    <div key={os.id} className="flex items-center justify-between p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900">{os.titulo}</h4>
                        <div className="flex items-center space-x-4 mt-2 text-sm text-gray-600">
                          <span className={`px-2 py-1 rounded text-xs ${getStatusColor(os.status)}`}>
                            {os.status}
                          </span>
                          <span className={`px-2 py-1 rounded text-xs ${getMarcaColor(os.marca)}`}>
                            {os.marca}
                          </span>
                          <span>Prioridade: {os.prioridade}</span>
                          {os.sla_atual && (
                            <span>SLA: {formatDateTime(os.sla_atual)}</span>
                          )}
                        </div>
                      </div>
                      <div className="text-yellow-600">
                        <Clock className="w-5 h-5" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* OS Atrasadas */}
          {stats.detalhes.atrasadas.length > 0 && (
            <div className="bg-white rounded-lg border border-red-200 shadow-sm">
              <div className="p-6 border-b border-red-200 bg-red-50">
                <h3 className="text-lg font-semibold text-red-800 flex items-center">
                  <AlertTriangle className="w-5 h-5 mr-2" />
                  OS Atrasadas (SLA vencido)
                </h3>
              </div>
              <div className="p-6">
                <div className="space-y-4">
                  {stats.detalhes.atrasadas.map((os: any) => {
                    const horasAtraso = Math.floor(
                      (new Date().getTime() - new Date(os.sla_atual || '').getTime()) / (1000 * 60 * 60)
                    );
                    
                    return (
                      <div key={os.id} className="flex items-center justify-between p-4 bg-red-50 rounded-lg border border-red-200">
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-900">{os.titulo}</h4>
                          <div className="flex items-center space-x-4 mt-2 text-sm text-gray-600">
                            <span className={`px-2 py-1 rounded text-xs ${getStatusColor(os.status)}`}>
                              {os.status}
                            </span>
                            <span className={`px-2 py-1 rounded text-xs ${getMarcaColor(os.marca)}`}>
                              {os.marca}
                            </span>
                            <span className={`px-2 py-1 rounded text-xs ${
                              os.prioridade === 'HIGH' ? 'bg-red-100 text-red-700' : 
                              os.prioridade === 'MEDIUM' ? 'bg-yellow-100 text-yellow-700' : 
                              'bg-green-100 text-green-700'
                            }`}>
                              {os.prioridade}
                            </span>
                            <span className="text-red-600 font-medium">
                              Atrasado há {horasAtraso}h
                            </span>
                          </div>
                        </div>
                        <div className="text-red-600">
                          <AlertTriangle className="w-5 h-5" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Mensagem quando não há problemas */}
          {stats.em_risco === 0 && stats.atrasadas === 0 && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-8 text-center">
              <div className="text-green-600 mb-4">
                <TrendingUp className="w-16 h-16 mx-auto" />
              </div>
              <h3 className="text-xl font-semibold text-green-800 mb-2">
                Tudo em Ordem! 🎉
              </h3>
              <p className="text-green-700">
                Nenhuma OS em risco ou atrasada no momento.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Productivity Tab */}
      {activeTab === 'productivity' && productivity && (
        <div className="space-y-6">
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <Award className="w-5 h-5 mr-2 text-blue-600" />
              Produtividade da Equipe ({productivity.periodo})
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {productivity.usuarios.map((user, index) => (
                <div key={index} className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center">
                      <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mr-3">
                        <span className="text-white text-sm font-medium">
                          {user.nome[0].toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">{user.nome}</div>
                        <div className="text-xs text-gray-500">{user.papel}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-blue-600">{user.os_completadas}</div>
                      <div className="text-xs text-gray-500">OS concluídas</div>
                    </div>
                  </div>
                  
                  {user.marcas.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {user.marcas.map(marca => (
                        <span key={marca} className={`px-2 py-1 rounded text-xs ${getMarcaColor(marca)}`}>
                          {marca}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
            
            <div className="mt-6 p-4 bg-blue-50 rounded-lg">
              <div className="flex items-center justify-between">
                <span className="text-blue-800 font-medium">
                  Total de OS completadas na semana:
                </span>
                <span className="text-2xl font-bold text-blue-600">
                  {productivity.total_os_completadas}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Brands Tab */}
      {activeTab === 'brands' && stats && (
        <div className="space-y-6">
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center">
              <Target className="w-5 h-5 mr-2 text-purple-600" />
              Distribuição por Marca
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {Object.entries(stats.por_marca).map(([marca, data]) => (
                <div key={marca} className="bg-gray-50 rounded-lg p-6">
                  <div className="flex items-center justify-between mb-4">
                    <span className={`px-3 py-1 rounded-lg font-medium ${getMarcaColor(marca)}`}>
                      {marca}
                    </span>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-gray-900">{data.total}</div>
                      <div className="text-xs text-gray-500">Total</div>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Em risco:</span>
                      <span className={`font-medium ${data.em_risco > 0 ? 'text-yellow-600' : 'text-gray-400'}`}>
                        {data.em_risco}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Atrasadas:</span>
                      <span className={`font-medium ${data.atrasadas > 0 ? 'text-red-600' : 'text-gray-400'}`}>
                        {data.atrasadas}
                      </span>
                    </div>
                    
                    {/* Progress bar */}
                    <div className="mt-4">
                      <div className="flex justify-between text-xs text-gray-500 mb-1">
                        <span>Performance</span>
                        <span>{Math.round(((data.total - data.atrasadas) / data.total) * 100)}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-green-600 h-2 rounded-full transition-all duration-300"
                          style={{ 
                            width: `${Math.round(((data.total - data.atrasadas) / data.total) * 100)}%` 
                          }}
                        ></div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}