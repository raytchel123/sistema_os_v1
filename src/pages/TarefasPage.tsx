import { useState, useEffect } from 'react';
import { CheckSquare, Plus, Trash2, Edit2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

type TarefaStatus = 'PENDENTE' | 'EM_ANDAMENTO' | 'CONCLUIDA' | 'CANCELADA';
type Prioridade = 'LOW' | 'MEDIUM' | 'HIGH';
type Marca = 'RAYTCHEL' | 'ZAFFIRA' | 'ZAFF' | 'CRISPIM' | 'FAZENDA';

interface Tarefa {
  id: string;
  descricao: string;
  prioridade: Prioridade;
  usuario_id: string | null;
  marca: Marca;
  status: TarefaStatus;
  criado_em: string;
  usuario?: { nome: string };
}

const statusOptions: { value: TarefaStatus; label: string }[] = [
  { value: 'PENDENTE', label: 'Pendente' },
  { value: 'EM_ANDAMENTO', label: 'Em Andamento' },
  { value: 'CONCLUIDA', label: 'Concluída' },
  { value: 'CANCELADA', label: 'Cancelada' },
];

const prioridadeOptions: { value: Prioridade; label: string; color: string }[] = [
  { value: 'LOW', label: 'Baixa', color: 'bg-green-100 text-green-800' },
  { value: 'MEDIUM', label: 'Média', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'HIGH', label: 'Alta', color: 'bg-red-100 text-red-800' },
];

const marcaOptions: Marca[] = ['RAYTCHEL', 'ZAFFIRA', 'ZAFF', 'CRISPIM', 'FAZENDA'];

const statusColors: Record<TarefaStatus, string> = {
  PENDENTE: 'bg-gray-100 text-gray-800',
  EM_ANDAMENTO: 'bg-blue-100 text-blue-800',
  CONCLUIDA: 'bg-green-100 text-green-800',
  CANCELADA: 'bg-red-100 text-red-800',
};

export default function TarefasPage() {
  const { user } = useAuth();
  const [tarefas, setTarefas] = useState<Tarefa[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingTarefa, setEditingTarefa] = useState<Tarefa | null>(null);
  const [formData, setFormData] = useState({
    descricao: '',
    prioridade: 'MEDIUM' as Prioridade,
    usuario_id: '',
    marca: 'RAYTCHEL' as Marca,
    status: 'PENDENTE' as TarefaStatus,
  });

  useEffect(() => {
    if (user?.org_id) {
      fetchTarefas();
      fetchUsers();
    }
  }, [user]);

  const fetchTarefas = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('tarefas')
        .select(`
          *,
          usuario:usuario_id(nome)
        `)
        .eq('org_id', user?.org_id)
        .order('criado_em', { ascending: false });

      if (error) throw error;
      setTarefas(data || []);
    } catch (error: any) {
      console.error('Erro ao buscar tarefas:', error);
      toast.error('Erro ao carregar tarefas');
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, nome')
        .eq('org_id', user?.org_id);

      if (error) throw error;
      setUsers(data || []);
    } catch (error: any) {
      console.error('Erro ao buscar usuários:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (editingTarefa) {
        const { error } = await supabase
          .from('tarefas')
          .update({
            ...formData,
            usuario_id: formData.usuario_id || null,
            atualizado_em: new Date().toISOString(),
          })
          .eq('id', editingTarefa.id);

        if (error) throw error;
        toast.success('Tarefa atualizada com sucesso!');
      } else {
        const { error } = await supabase
          .from('tarefas')
          .insert({
            ...formData,
            usuario_id: formData.usuario_id || null,
            org_id: user?.org_id,
            created_by: user?.id,
          });

        if (error) throw error;
        toast.success('Tarefa criada com sucesso!');
      }

      setShowModal(false);
      setEditingTarefa(null);
      resetForm();
      fetchTarefas();
    } catch (error: any) {
      console.error('Erro ao salvar tarefa:', error);
      toast.error('Erro ao salvar tarefa');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta tarefa?')) return;

    try {
      const { error } = await supabase
        .from('tarefas')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Tarefa excluída com sucesso!');
      fetchTarefas();
    } catch (error: any) {
      console.error('Erro ao excluir tarefa:', error);
      toast.error('Erro ao excluir tarefa');
    }
  };

  const handleEdit = (tarefa: Tarefa) => {
    setEditingTarefa(tarefa);
    setFormData({
      descricao: tarefa.descricao,
      prioridade: tarefa.prioridade,
      usuario_id: tarefa.usuario_id || '',
      marca: tarefa.marca,
      status: tarefa.status,
    });
    setShowModal(true);
  };

  const resetForm = () => {
    setFormData({
      descricao: '',
      prioridade: 'MEDIUM',
      usuario_id: '',
      marca: 'RAYTCHEL',
      status: 'PENDENTE',
    });
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingTarefa(null);
    resetForm();
  };

  return (
    <div className="p-6">
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <CheckSquare className="w-8 h-8 text-blue-600" />
            <h1 className="text-3xl font-bold text-gray-900">Tarefas</h1>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-5 h-5" />
            Nova Tarefa
          </button>
        </div>
        <p className="text-gray-600">Gerencie suas tarefas e acompanhe o progresso</p>
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Descrição
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Prioridade
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Usuário
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Marca
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {tarefas.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                    Nenhuma tarefa encontrada
                  </td>
                </tr>
              ) : (
                tarefas.map((tarefa) => (
                  <tr key={tarefa.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {tarefa.descricao}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-2 py-1 text-xs font-medium rounded-full ${
                          prioridadeOptions.find((p) => p.value === tarefa.prioridade)?.color
                        }`}
                      >
                        {prioridadeOptions.find((p) => p.value === tarefa.prioridade)?.label}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {tarefa.usuario?.nome || '-'}
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-800 rounded">
                        {tarefa.marca}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-2 py-1 text-xs font-medium rounded-full ${
                          statusColors[tarefa.status]
                        }`}
                      >
                        {statusOptions.find((s) => s.value === tarefa.status)?.label}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right text-sm font-medium">
                      <button
                        onClick={() => handleEdit(tarefa)}
                        className="text-blue-600 hover:text-blue-900 mr-4"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(tarefa.id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-2xl font-bold mb-4">
              {editingTarefa ? 'Editar Tarefa' : 'Nova Tarefa'}
            </h2>
            <form onSubmit={handleSubmit}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Descrição
                  </label>
                  <textarea
                    value={formData.descricao}
                    onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent"
                    rows={3}
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Prioridade
                  </label>
                  <select
                    value={formData.prioridade}
                    onChange={(e) =>
                      setFormData({ ...formData, prioridade: e.target.value as Prioridade })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent"
                  >
                    {prioridadeOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Usuário
                  </label>
                  <select
                    value={formData.usuario_id}
                    onChange={(e) => setFormData({ ...formData, usuario_id: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent"
                  >
                    <option value="">Selecione...</option>
                    {users.map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.nome}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Marca
                  </label>
                  <select
                    value={formData.marca}
                    onChange={(e) => setFormData({ ...formData, marca: e.target.value as Marca })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent"
                    required
                  >
                    {marcaOptions.map((marca) => (
                      <option key={marca} value={marca}>
                        {marca}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Status
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) =>
                      setFormData({ ...formData, status: e.target.value as TarefaStatus })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent"
                  >
                    {statusOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  {editingTarefa ? 'Atualizar' : 'Criar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
