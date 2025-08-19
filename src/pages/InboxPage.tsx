import { useState, useEffect } from 'react';
import { Inbox, Clock, AlertTriangle, CheckCircle, XCircle, Calendar, ArrowUp } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface OSItem {
  id: string;
  titulo: string;
  marca: string;
  status: string;
  prioridade: string;
  sla_atual: string | null;
  responsavel: {
    nome: string;
    papel: string;
  } | null;
  criado_em: string;
  data_publicacao_prevista: string | null;
}

export function InboxPage() {
  const [items, setItems] = useState<OSItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const { user } = useAuth();

  const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`;

  useEffect(() => {
    fetchInboxItems();
  }, []);

  const fetchInboxItems = async () => {
    try {
      setLoading(true);
      const { data: { session } } = await (await import('../lib/supabase')).supabase.auth.getSession();
      if (!session) return;

      const headers = {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      };

      // Fetch OS that need CEO attention (REVISAO, APROVACAO, or blocked)
      const response = await fetch(`${apiUrl}/api/ordens`, { headers });
      
      if (response.ok) {
        const data = await response.json();
        setItems(data);
      }
    } catch (err) {
      setError('Erro ao carregar inbox');
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (osId: string, action: string, data?: any) => {
    setActionLoading(osId);
    try {
      const { data: { session } } = await (await import('../lib/supabase')).supabase.auth.getSession();
      if (!session) return;

      const headers = {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      };

      let endpoint = '';
      let method = 'POST';
      let body = {};

      switch (action) {
        case 'approve':
          endpoint = `${apiUrl}/api/ordens/${osId}/approve`;
          break;
        case 'reject':
          endpoint = `${apiUrl}/api/ordens/${osId}/reject`;
          body = { motivo: data.motivo };
          break;
        case 'set-deadline':
          endpoint = `${apiUrl}/api/ordens/${osId}`;
          method = 'PATCH';
          body = { data_publicacao_prevista: data.deadline };
          break;
        case 'elevate-priority':
          endpoint = `${apiUrl}/api/ordens/${osId}`;
          method = 'PATCH';
          body = { prioridade: 'HIGH' };
          break;
      }

      const response = await fetch(endpoint, {
        method,
        headers,
        body: JSON.stringify(body)
      });

      if (response.ok) {
        fetchInboxItems(); // Refresh list
      } else {
        let msg = `HTTP ${response.status}`;
        try {
          const j = await response.json();
          if (j?.error) msg += ` – ${j.error}`;
        } catch {}
        alert(`Erro ao executar ação: ${msg}`);
      }
    } catch (err) {
      alert(`Erro ao executar ação: ${err instanceof Error ? err.message : 'Erro de conexão'}`);
    } finally {
      setActionLoading(null);
    }
  };

  const getStatusColor = (status: string) => {
    const colors = {
      'REVISAO': 'bg-yellow-100 text-yellow-800 border-yellow-200',
      'APROVACAO': 'bg-blue-100 text-blue-800 border-blue-200',
      'BLOCKED': 'bg-red-100 text-red-800 border-red-200'
    };
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800 border-gray-200';
  };

  const getPriorityColor = (prioridade: string) => {
    const colors = {
      'HIGH': 'text-red-600',
      'MEDIUM': 'text-yellow-600',
      'LOW': 'text-green-600'
    };
    return colors[prioridade as keyof typeof colors] || 'text-gray-600';
  };

  const isOverdue = (slaAtual: string | null) => {
    if (!slaAtual) return false;
    return new Date(slaAtual) < new Date();
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('pt-BR');
  };

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
        <div className="flex items-center space-x-3 mb-2">
          <Inbox className="w-8 h-8 text-orange-600" />
          <h1 className="text-3xl font-bold text-gray-900">Inbox</h1>
        </div>
        <p className="text-gray-600">
          OS que precisam da sua atenção para aprovação ou desbloqueio
        </p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}

      {items.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12">
          <div className="text-center">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              Tudo em Ordem! 🎉
            </h3>
            <p className="text-gray-600">
              Nenhuma OS precisa da sua atenção no momento.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {items.map((item) => (
            <div key={item.id} className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <h3 className="text-lg font-semibold text-gray-900">{item.titulo}</h3>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(item.status)}`}>
                      {item.status}
                    </span>
                    {isOverdue(item.sla_atual) && (
                      <span className="flex items-center text-red-600 text-sm">
                        <AlertTriangle className="w-4 h-4 mr-1" />
                        Atrasado
                      </span>
                    )}
                  </div>
                  
                  <div className="flex items-center space-x-6 text-sm text-gray-600">
                    <span className="flex items-center">
                      <span className={`w-2 h-2 rounded-full mr-2 ${getPriorityColor(item.prioridade) === 'text-red-600' ? 'bg-red-500' : getPriorityColor(item.prioridade) === 'text-yellow-600' ? 'bg-yellow-500' : 'bg-green-500'}`}></span>
                      {item.prioridade}
                    </span>
                    <span>{item.marca}</span>
                    {item.sla_atual && (
                      <span className="flex items-center">
                        <Clock className="w-4 h-4 mr-1" />
                        SLA: {formatDateTime(item.sla_atual)}
                      </span>
                    )}
                    {item.data_publicacao_prevista && (
                      <span className="flex items-center">
                        <Calendar className="w-4 h-4 mr-1" />
                        Previsto: {formatDateTime(item.data_publicacao_prevista)}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                {item.status === 'APROVACAO' && (
                  <>
                    <button
                      onClick={() => handleAction(item.id, 'approve')}
                      disabled={actionLoading === item.id}
                      className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center text-sm"
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Aprovar
                    </button>
                    <button
                      onClick={() => {
                        const motivo = prompt('Motivo da reprovação:');
                        if (motivo) handleAction(item.id, 'reject', { motivo });
                      }}
                      disabled={actionLoading === item.id}
                      className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center text-sm"
                    >
                      <XCircle className="w-4 h-4 mr-2" />
                      Reprovar
                    </button>
                  </>
                )}

                <button
                  onClick={() => {
                    const deadline = prompt('Nova data de publicação (YYYY-MM-DD HH:MM):');
                    if (deadline) handleAction(item.id, 'set-deadline', { deadline });
                  }}
                  disabled={actionLoading === item.id}
                  className="border border-blue-600 text-blue-600 px-4 py-2 rounded-lg hover:bg-blue-50 disabled:opacity-50 flex items-center text-sm"
                >
                  <Calendar className="w-4 h-4 mr-2" />
                  Definir Prazo
                </button>

                {item.prioridade !== 'HIGH' && (
                  <button
                    onClick={() => handleAction(item.id, 'elevate-priority')}
                    disabled={actionLoading === item.id}
                    className="border border-orange-600 text-orange-600 px-4 py-2 rounded-lg hover:bg-orange-50 disabled:opacity-50 flex items-center text-sm"
                  >
                    <ArrowUp className="w-4 h-4 mr-2" />
                    Elevar Prioridade
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}