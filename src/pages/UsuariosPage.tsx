import { useState, useEffect } from 'react';
import { Users, Plus, Edit, Trash2, Shield, X, Save } from 'lucide-react';
import { showToast } from '../components/ui/Toast';

interface User {
  id: string;
  nome: string;
  email: string;
  papel: string;
  pode_aprovar: boolean;
  pode_ver_todas_os: boolean;
  criado_em: string;
}

interface UserFormData {
  nome: string;
  email: string;
  papel: string;
  pode_aprovar: boolean;
  pode_ver_todas_os: boolean;
  senha?: string;
  menu_permissions: {
    kanban: boolean;
    lista: boolean;
    calendario: boolean;
    biblioteca: boolean;
    ideias: boolean;
    importar: boolean;
    ideias_pendentes: boolean;
    tendencias: boolean;
    relatorios: boolean;
    settings: boolean;
    usuarios: boolean;
  };
}

export function UsuariosPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [formData, setFormData] = useState<UserFormData>({
    nome: '',
    email: '',
    papel: 'EDITOR',
    pode_aprovar: false,
    pode_ver_todas_os: false,
    senha: '',
    menu_permissions: {
      kanban: true,
      lista: true,
      calendario: true,
      biblioteca: true,
      ideias: true,
      importar: false,
      ideias_pendentes: false,
      tendencias: true,
      relatorios: false,
      settings: false,
      usuarios: false
    }
  });
  const [formLoading, setFormLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`;

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const { data: { session } } = await (await import('../lib/supabase')).supabase.auth.getSession();
      if (!session) return;

      const headers = {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      };

      const response = await fetch(`${apiUrl}/api/users`, { headers });
      
      if (response.ok) {
        const data = await response.json();
        setUsers(data);
      }
    } catch (err) {
      console.error('Erro ao carregar usuários:', err);
    } finally {
      setLoading(false);
    }
  };

  const openCreateModal = () => {
    setEditingUser(null);
    setFormData({
      nome: '',
      email: '',
      papel: 'EDITOR',
      pode_aprovar: false,
      pode_ver_todas_os: false,
      senha: '',
      menu_permissions: {
        kanban: true,
        lista: true,
        calendario: true,
        biblioteca: true,
        ideias: true,
        importar: false,
        ideias_pendentes: false,
        tendencias: true,
        relatorios: false,
        settings: false,
        usuarios: false
      }
    });
    setError(null);
    setShowModal(true);
  };

  const openEditModal = (user: User) => {
    setEditingUser(user);
    
    console.log('🔍 DEBUG - User data for edit modal:', user);
    console.log('🔍 DEBUG - User menu_permissions:', user.menu_permissions);
    
    // Usar permissões do usuário diretamente, sem mesclar com padrões
    const userPermissions = user.menu_permissions || {
      kanban: true,
      lista: true,
      calendario: true,
      biblioteca: true,
      ideias: true,
      importar: false,
      ideias_pendentes: false,
      tendencias: true,
      relatorios: false,
      settings: false,
      usuarios: false
    };
    
    console.log('🔍 DEBUG - Final permissions for modal:', userPermissions);
    
    setFormData({
      nome: user.nome,
      email: user.email,
      papel: user.papel,
      pode_aprovar: user.pode_aprovar,
      pode_ver_todas_os: user.pode_ver_todas_os || false,
      menu_permissions: userPermissions
    });
    setError(null);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingUser(null);
    setFormData({
      nome: '',
      email: '',
      papel: 'EDITOR',
      pode_aprovar: false,
      pode_ver_todas_os: false,
      senha: '',
      menu_permissions: {
        kanban: true,
        lista: true,
        calendario: true,
        biblioteca: true,
        ideias: true,
        importar: false,
        ideias_pendentes: false,
        tendencias: true,
        relatorios: false,
        settings: false,
        usuarios: false
      }
    });
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.nome.trim() || !formData.email.trim()) {
      setError('Nome e email são obrigatórios');
      return;
    }

    if (!editingUser && !formData.senha) {
      setError('Senha é obrigatória para novos usuários');
      return;
    }

    setFormLoading(true);
    setError(null);

    try {
      const { data: { session } } = await (await import('../lib/supabase')).supabase.auth.getSession();
      if (!session) return;

      const headers = {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      };

      const payload = {
        nome: formData.nome.trim(),
        email: formData.email.trim(),
        papel: formData.papel,
        pode_aprovar: formData.pode_aprovar,
        pode_ver_todas_os: formData.pode_ver_todas_os,
        menu_permissions: formData.menu_permissions,
        ...(formData.senha && { senha: formData.senha })
      };

      let response;
      if (editingUser) {
        // Update user
        response = await fetch(`${apiUrl}/api/users/${editingUser.id}`, {
          method: 'PUT',
          headers,
          body: JSON.stringify(payload)
        });
      } else {
        // Create user
        response = await fetch(`${apiUrl}/api/users`, {
          method: 'POST',
          headers,
          body: JSON.stringify(payload)
        });
      }

      if (response.ok) {
        await fetchUsers();
        closeModal();
        showToast.success(editingUser ? 'Usuário atualizado com sucesso!' : 'Usuário criado com sucesso!');
      } else {
        let msg = `HTTP ${response.status}`;
        try {
          const j = await response.json();
          if (j?.error) msg += ` – ${j.error}`;
        } catch {}
        setError(`Erro ao salvar usuário: ${msg}`);
      }
    } catch (err) {
      setError(`Erro ao salvar usuário: ${err instanceof Error ? err.message : 'Erro de conexão'}`);
      console.error('Erro:', err);
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async (user: User) => {
    if (!window.confirm(`Tem certeza que deseja excluir o usuário "${user.nome}"?`)) {
      return;
    }

    const loadingToast = showToast.loading('Excluindo usuário...');

    try {
      const { data: { session } } = await (await import('../lib/supabase')).supabase.auth.getSession();
      if (!session) return;

      const headers = {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      };

      const response = await fetch(`${apiUrl}/api/users/${user.id}`, {
        method: 'DELETE',
        headers
      });

      if (response.ok) {
        await fetchUsers();
        showToast.success('Usuário excluído com sucesso!');
      } else {
        let msg = `HTTP ${response.status}`;
        try {
          const j = await response.json();
          if (j?.error) msg += ` – ${j.error}`;
        } catch {}
        showToast.error(`Erro ao excluir usuário: ${msg}`);
      }
    } catch (err) {
      showToast.error(`Erro ao excluir usuário: ${err instanceof Error ? err.message : 'Erro de conexão'}`);
      console.error('Erro:', err);
    } finally {
      showToast.dismiss(loadingToast);
    }
  };

  const papelOptions = [
    { value: 'COPY', label: 'Copy' },
    { value: 'AUDIO', label: 'Áudio' },
    { value: 'VIDEO', label: 'Vídeo' },
    { value: 'EDITOR', label: 'Editor' },
    { value: 'REVISOR', label: 'Revisor' },
    { value: 'CRISPIM', label: 'Crispim' },
    { value: 'SOCIAL', label: 'Social Media' }
  ];

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Users className="w-8 h-8 text-blue-600" />
            <h1 className="text-3xl font-bold text-gray-900">Usuários</h1>
          </div>
          
          <button
            onClick={openCreateModal}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center space-x-2"
          >
            <Plus className="w-4 h-4" />
            <span>Novo Usuário</span>
          </button>
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
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Nome
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Papel
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Pode Aprovar
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Criado em
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Visualização
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {users.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                          <span className="text-blue-600 font-medium text-sm">
                            {user.nome.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div className="ml-3">
                          <div className="text-sm font-medium text-gray-900">{user.nome}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {user.email}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        <Shield className="w-3 h-3 mr-1" />
                        {user.papel}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {user.pode_aprovar ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          ✓ Sim
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                          ✗ Não
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(user.criado_em).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {user.pode_ver_todas_os === true ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          👁️ Todas as OS
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                          👤 Apenas suas
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          onClick={() => openEditModal(user)}
                          className="text-blue-600 hover:text-blue-900"
                          title="Editar usuário"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleDelete(user)}
                          className="text-red-600 hover:text-red-900"
                          title="Excluir usuário"
                        >
                          <Trash2 className="w-4 h-4" />
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

      {/* Modal de Criação/Edição */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900">
                {editingUser ? 'Editar Usuário' : 'Novo Usuário'}
              </h3>
              <button
                onClick={closeModal}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nome *
                </label>
                <input
                  type="text"
                  value={formData.nome}
                  onChange={(e) => setFormData(prev => ({ ...prev, nome: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent"
                  placeholder="Nome completo"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email *
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent"
                  placeholder="email@exemplo.com"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Papel *
                </label>
                <select
                  value={formData.papel}
                  onChange={(e) => setFormData(prev => ({ ...prev, papel: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent"
                  required
                >
                  {papelOptions.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Permissões de Menu
                </label>
                <div className="grid grid-cols-2 gap-3 p-4 bg-gray-50 rounded-lg">
                  {Object.entries({
                    kanban: 'Kanban',
                    lista: 'Lista',
                    calendario: 'Planejamento',
                    biblioteca: 'Biblioteca',
                    ideias: 'Ideias',
                    importar: 'Importar OS',
                    ideias_pendentes: 'Aprovar Ideias',
                    tendencias: 'Tendências',
                    relatorios: 'Relatórios',
                    settings: 'Configurações',
                    usuarios: 'Usuários'
                  }).map(([key, label]) => (
                    <label key={key} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={formData.menu_permissions[key as keyof typeof formData.menu_permissions]}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          menu_permissions: {
                            ...prev.menu_permissions,
                            [key]: e.target.checked
                          }
                        }))}
                        className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700">{label}</span>
                    </label>
                  ))}
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Selecione quais menus este usuário pode acessar
                </p>
              </div>

              <div>
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={formData.pode_aprovar}
                    onChange={(e) => setFormData(prev => ({ ...prev, pode_aprovar: e.target.checked }))}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm font-medium text-gray-700">
                    Pode aprovar OS
                  </span>
                </label>
                <p className="text-xs text-gray-500 mt-1">
                  Permite que este usuário aprove OS na etapa de aprovação
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Nível de Visualização
                </label>
                <div className="space-y-3">
                  <label className="flex items-center space-x-3">
                    <input
                      type="radio"
                      name="pode_ver_todas_os"
                      checked={!formData.pode_ver_todas_os}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setFormData(prev => ({ ...prev, pode_ver_todas_os: false }));
                        }
                      }}
                      className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                    />
                    <div>
                      <span className="text-sm font-medium text-gray-700">👤 Apenas suas OS</span>
                      <p className="text-xs text-gray-500">Visualiza apenas OS onde é responsável ou participante</p>
                    </div>
                  </label>
                  <label className="flex items-center space-x-3">
                    <input
                      type="radio"
                      name="pode_ver_todas_os"
                      checked={formData.pode_ver_todas_os}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setFormData(prev => ({ ...prev, pode_ver_todas_os: true }));
                        }
                      }}
                      className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                    />
                    <div>
                      <span className="text-sm font-medium text-gray-700">👁️ Todas as OS</span>
                      <p className="text-xs text-gray-500">Visualiza todas as OS da organização</p>
                    </div>
                  </label>
                </div>
              </div>

              {!editingUser && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Senha *
                  </label>
                  <input
                    type="password"
                    value={formData.senha}
                    onChange={(e) => setFormData(prev => ({ ...prev, senha: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent"
                    placeholder="Senha do usuário"
                    required
                  />
                </div>
              )}

              {editingUser && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nova Senha (opcional)
                  </label>
                  <input
                    type="password"
                    value={formData.senha}
                    onChange={(e) => setFormData(prev => ({ ...prev, senha: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent"
                    placeholder="Deixe em branco para manter a senha atual"
                  />
                </div>
              )}

              <div className="flex space-x-3 pt-4">
                <button
                  type="submit"
                  disabled={formLoading}
                  className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                >
                  {formLoading ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  ) : (
                    <Save className="w-4 h-4 mr-2" />
                  )}
                  {formLoading ? 'Salvando...' : (editingUser ? 'Atualizar' : 'Criar')}
                </button>
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}