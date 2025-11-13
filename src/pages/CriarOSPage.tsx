import { useState } from 'react';
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, ArrowLeft } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { showToast } from '../components/ui/Toast';
import { useAuth } from '../contexts/AuthContext';

export function CriarOSPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [brands, setBrands] = useState<any[]>([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [brandsLoading, setBrandsLoading] = useState(true);
  
  const [formData, setFormData] = useState({
    titulo: '',
    descricao: '',
    midia_bruta_links: [''],
    criativos_prontos_links: [''],
    categorias_criativos: [] as string[],
    responsaveis: {
      edicao: '',
      arte: '',
      revisao: '',
      design: ''
    },
    prazo: '',
    marca: 'RAYTCHEL' as const,
    objetivo: 'ATRACAO' as const,
    tipo: 'EDUCATIVO' as const,
    prioridade: 'MEDIUM' as const,
    data_publicacao_prevista: '',
    canais: [] as string[],
    gancho: '',
    cta: ''
  });

  const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`;

  useEffect(() => {
    if (user) {
      fetchUsers();
      fetchBrands();
    }
  }, [user]);

  const fetchBrands = async () => {
    try {
      setBrandsLoading(true);
      if (!user) return;

      const { data, error } = await supabase
        .from('brands')
        .select('id, name, code')
        .eq('is_active', true)
        .order('name');

      if (error) {
        console.error('Erro ao carregar marcas:', error);
        return;
      }

      setBrands(data || []);
    } catch (err) {
      console.error('Erro ao carregar marcas:', err);
    } finally {
      setBrandsLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      setUsersLoading(true);
      if (!user) return;

      const { data, error } = await supabase
        .from('users')
        .select('id, nome, email, papel')
        .or(`org_id.eq.${user.org_id},org_id.is.null`)
        .order('nome');

      if (error) {
        console.error('Erro ao carregar usuários:', error);
        return;
      }

      setUsers(data || []);

      // Set default responsaveis if users exist
      if (data && data.length > 0) {
        const editor = data.find((u: any) => u.papel === 'EDITOR');
        const revisor = data.find((u: any) => u.papel === 'REVISOR');
        const video = data.find((u: any) => u.papel === 'VIDEO');
        const designer = data.find((u: any) => u.papel === 'DESIGN');

        setFormData(prev => ({
          ...prev,
          responsaveis: {
            edicao: editor?.id || data[0]?.id || '',
            arte: video?.id || data[0]?.id || '',
            revisao: revisor?.id || data[0]?.id || '',
            design: designer?.id || data[0]?.id || ''
          }
        }));
      }
    } catch (err) {
      console.error('Erro ao carregar usuários:', err);
    } finally {
      setUsersLoading(false);
    }
  };
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

  const categoriasOptions = [
    'Instagram Stories',
    'Instagram Feed',
    'Instagram Reels',
    'TikTok',
    'YouTube Shorts',
    'YouTube',
    'LinkedIn',
    'Facebook',
    'Twitter',
    'Threads',
    'Pinterest',
  ];

  const canaisOptions = [
    'Instagram',
    'TikTok', 
    'YouTube',
    'Facebook',
    'LinkedIn',
    'Twitter',
    'Stories',
    'Reels',
    'Threads',
    'Pinterest',
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.titulo.trim() || !formData.descricao.trim() || !formData.prazo ||
        !formData.responsaveis.edicao || !formData.responsaveis.arte || !formData.responsaveis.revisao || !formData.responsaveis.design) {
      setError('Título, descrição, prazo e responsáveis são obrigatórios');
      return;
    }


    setLoading(true);
    setError(null);

    const loadingToast = showToast.loading('Criando OS...');

    try {
      if (!user) {
        throw new Error('Usuário não autenticado');
      }

      const payload = {
        ...formData,
        midia_bruta_links: formData.midia_bruta_links.filter(link => link.trim()),
        criativos_prontos_links: formData.criativos_prontos_links.filter(link => link.trim()),
        data_publicacao_prevista: formData.data_publicacao_prevista || null,
        canais: ['Instagram'],
        gancho: formData.gancho || null,
        cta: formData.cta || null,
        org_id: user.org_id,
        created_by: user.id
      };

      const { data: newOS, error } = await supabase
        .from('ordens_de_servico')
        .insert([payload])
        .select()
        .single();

      if (error) {
        throw new Error(`Erro ao criar OS: ${error.message}`);
      }
      
      // Redirecionar para o kanban
      showToast.success('OS criada com sucesso!');
      navigate('/kanban');
      
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Erro ao criar OS';
      setError(errorMsg);
      showToast.error(errorMsg);
    } finally {
      showToast.dismiss(loadingToast);
      setLoading(false);
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

  const addMidiaLink = () => {
    setFormData(prev => ({
      ...prev,
      midia_bruta_links: [...prev.midia_bruta_links, '']
    }));
  };

  const removeMidiaLink = (index: number) => {
    setFormData(prev => ({
      ...prev,
      midia_bruta_links: prev.midia_bruta_links.filter((_, i) => i !== index)
    }));
  };

  const updateMidiaLink = (index: number, value: string) => {
    setFormData(prev => ({
      ...prev,
      midia_bruta_links: prev.midia_bruta_links.map((link, i) => i === index ? value : link)
    }));
  };

  const addCriativoLink = () => {
    setFormData(prev => ({
      ...prev,
      criativos_prontos_links: [...prev.criativos_prontos_links, '']
    }));
  };

  const removeCriativoLink = (index: number) => {
    setFormData(prev => ({
      ...prev,
      criativos_prontos_links: prev.criativos_prontos_links.filter((_, i) => i !== index)
    }));
  };

  const updateCriativoLink = (index: number, value: string) => {
    setFormData(prev => ({
      ...prev,
      criativos_prontos_links: prev.criativos_prontos_links.map((link, i) => i === index ? value : link)
    }));
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <div className="flex items-center space-x-3 mb-2">
          <button
            onClick={() => navigate(-1)}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <Plus className="w-8 h-8 text-blue-600" />
          <h1 className="text-3xl font-bold text-gray-900">Nova Ordem de Serviço</h1>
        </div>
        <p className="text-gray-600">
          Crie uma nova OS para iniciar a produção de conteúdo
        </p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Título */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Título *
            </label>
            <input
              type="text"
              value={formData.titulo}
              onChange={(e) => setFormData(prev => ({ ...prev, titulo: e.target.value }))}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent"
              placeholder="Ex: Como fazer marketing digital em 2024"
              required
            />
          </div>

          {/* Descrição */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Descrição *
            </label>
            <textarea
              value={formData.descricao}
              onChange={(e) => setFormData(prev => ({ ...prev, descricao: e.target.value }))}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent resize-none"
              rows={4}
              placeholder="Descreva o conteúdo a ser produzido..."
              required
            />
          </div>

          {/* Links de Mídia Bruta */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Links de Mídia Bruta * (Google Drive, Dropbox, WeTransfer, etc.)
            </label>
            <div className="space-y-2">
              {formData.midia_bruta_links.map((link, index) => (
                <div key={index} className="flex gap-2">
                  <input
                    type="url"
                    value={link}
                    onChange={(e) => updateMidiaLink(index, e.target.value)}
                    className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent"
                    placeholder="https://drive.google.com/..."
                  />
                  {formData.midia_bruta_links.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeMidiaLink(index)}
                      className="px-3 py-2 text-red-600 hover:text-red-800"
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}
              <button
                type="button"
                onClick={addMidiaLink}
                className="text-blue-600 hover:text-blue-800 text-sm font-medium"
              >
                + Adicionar link
              </button>
            </div>
          </div>

          {/* Links de Criativos Prontos */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Links de Criativos Prontos (se houver)
            </label>
            <div className="space-y-2">
              {formData.criativos_prontos_links.map((link, index) => (
                <div key={index} className="flex gap-2">
                  <input
                    type="url"
                    value={link}
                    onChange={(e) => updateCriativoLink(index, e.target.value)}
                    className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent"
                    placeholder="https://drive.google.com/..."
                  />
                  {formData.criativos_prontos_links.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeCriativoLink(index)}
                      className="px-3 py-2 text-red-600 hover:text-red-800"
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}
              <button
                type="button"
                onClick={addCriativoLink}
                className="text-blue-600 hover:text-blue-800 text-sm font-medium"
              >
                + Adicionar link
              </button>
            </div>
          </div>

          {/* Categorias dos Criativos */}
          <div className="md:col-span-2">
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

          {/* Responsáveis */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Responsáveis *
            </label>
            {usersLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                <span className="ml-2 text-gray-600">Carregando usuários...</span>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Edição *</label>
                  <select
                    value={formData.responsaveis.edicao}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      responsaveis: { ...prev.responsaveis, edicao: e.target.value }
                    }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent"
                    required
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
                  <label className="block text-xs text-gray-500 mb-1">Arte *</label>
                  <select
                    value={formData.responsaveis.arte}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      responsaveis: { ...prev.responsaveis, arte: e.target.value }
                    }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent"
                    required
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
                  <label className="block text-xs text-gray-500 mb-1">Design *</label>
                  <select
                    value={formData.responsaveis.design}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      responsaveis: { ...prev.responsaveis, design: e.target.value }
                    }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent"
                    required
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
                  <label className="block text-xs text-gray-500 mb-1">Revisão *</label>
                  <select
                    value={formData.responsaveis.revisao}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      responsaveis: { ...prev.responsaveis, revisao: e.target.value }
                    }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent"
                    required
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

          {/* Prazo */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Prazo de Entrega *
            </label>
            <input
              type="date"
              value={formData.prazo}
              onChange={(e) => setFormData(prev => ({ ...prev, prazo: e.target.value }))}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent"
              required
            />
          </div>

          {/* Marca */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Marca *
            </label>
            {brandsLoading ? (
              <div className="flex items-center justify-center py-3 border border-gray-300 rounded-lg">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                <span className="ml-2 text-gray-600 text-sm">Carregando marcas...</span>
              </div>
            ) : (
              <select
                value={formData.marca}
                onChange={(e) => setFormData(prev => ({ ...prev, marca: e.target.value as any }))}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent"
                required
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

          {/* Objetivo */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Objetivo *
            </label>
            <select
              value={formData.objetivo}
              onChange={(e) => setFormData(prev => ({ ...prev, objetivo: e.target.value as any }))}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent"
              required
            >
              {objetivoOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {/* Tipo */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tipo *
            </label>
            <select
              value={formData.tipo}
              onChange={(e) => setFormData(prev => ({ ...prev, tipo: e.target.value as any }))}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent"
              required
            >
              {tipoOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {/* Prioridade */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Prioridade
            </label>
            <select
              value={formData.prioridade}
              onChange={(e) => setFormData(prev => ({ ...prev, prioridade: e.target.value as any }))}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent"
            >
              {prioridadeOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {/* Data de Publicação Prevista */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Data de Publicação Prevista
            </label>
            <input
              type="datetime-local"
              value={formData.data_publicacao_prevista}
              onChange={(e) => setFormData(prev => ({ ...prev, data_publicacao_prevista: e.target.value }))}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent"
            />
          </div>

          {/* Gancho */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Gancho Principal
            </label>
            <textarea
              value={formData.gancho}
              onChange={(e) => setFormData(prev => ({ ...prev, gancho: e.target.value }))}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent resize-none"
              rows={3}
              placeholder="Descreva o gancho principal do conteúdo..."
            />
          </div>

          {/* CTA */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Call to Action (CTA)
            </label>
            <input
              type="text"
              value={formData.cta}
              onChange={(e) => setFormData(prev => ({ ...prev, cta: e.target.value }))}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent"
              placeholder="Ex: Acesse o link na bio para saber mais"
            />
          </div>
        </div>

        {/* Botões */}
        <div className="flex justify-end space-x-4 mt-8 pt-6 border-t border-gray-200">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="px-6 py-3 text-gray-600 hover:text-gray-800 font-medium"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium flex items-center"
          >
            {loading ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
            ) : (
              <Plus className="w-4 h-4 mr-2" />
            )}
            {loading ? 'Criando...' : 'Criar OS'}
          </button>
        </div>
      </form>
    </div>
  );
}