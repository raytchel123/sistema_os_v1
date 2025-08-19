import { useState, useEffect } from 'react';
import { Settings, Key, TestTube, CheckCircle, XCircle, Eye, EyeOff, Save, Loader, Building, Plus, Edit, Trash2, X } from 'lucide-react';
import { showToast } from '../components/ui/Toast';

interface TokenConfig {
  platform: string;
  label: string;
  placeholder: string;
  description: string;
  testEndpoint?: string;
}

interface Brand {
  id: string;
  code: string;
  name: string;
  description: string;
  about: string;
  is_active: boolean;
}

interface BrandFormData {
  name: string;
  code: string;
  description: string;
  about: string;
  is_active: boolean;
}

const TOKEN_CONFIGS: TokenConfig[] = [
  {
    platform: 'INSTAGRAM',
    label: 'Instagram Access Token',
    placeholder: 'IGQVJYb2...',
    description: 'Token de acesso para a API do Instagram Graph',
    testEndpoint: 'https://graph.facebook.com/me'
  },
  {
    platform: 'YOUTUBE',
    label: 'YouTube API Key',
    placeholder: 'AIzaSyC...',
    description: 'Chave da API do YouTube Data v3',
    testEndpoint: 'https://www.googleapis.com/youtube/v3/channels'
  },
  {
    platform: 'TIKTOK',
    label: 'TikTok Access Token',
    placeholder: 'act.123...',
    description: 'Token de acesso para a API do TikTok Business',
    testEndpoint: null
  }
];

export function SettingsPage() {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [selectedBrand, setSelectedBrand] = useState<string>('');
  const [tokens, setTokens] = useState<Record<string, string>>({});
  const [showTokens, setShowTokens] = useState<Record<string, boolean>>({});
  const [testResults, setTestResults] = useState<Record<string, { success: boolean; message: string } | null>>({});
  const [loading, setLoading] = useState(false);
  const [testingTokens, setTestingTokens] = useState<Record<string, boolean>>({});
  const [brandsLoading, setBrandsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'tokens' | 'brands'>('tokens');
  const [showBrandModal, setShowBrandModal] = useState(false);
  const [editingBrand, setEditingBrand] = useState<Brand | null>(null);
  const [brandFormData, setBrandFormData] = useState<BrandFormData>({
    name: '',
    code: '',
    description: '',
    about: '',
    is_active: true
  });
  const [brandFormLoading, setBrandFormLoading] = useState(false);
  const [brandError, setBrandError] = useState<string | null>(null);

  const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`;

  useEffect(() => {
    fetchBrands();
  }, []);

  useEffect(() => {
    if (selectedBrand) {
      fetchTokensForBrand(selectedBrand);
    }
  }, [selectedBrand]);

  const fetchBrands = async () => {
    try {
      setBrandsLoading(true);
      const { data: { session } } = await (await import('../lib/supabase')).supabase.auth.getSession();
      if (!session) return;

      const headers = {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      };

      const response = await fetch(`${apiUrl}/api/brands`, { headers });
      
      if (response.ok) {
        const data = await response.json();
        const activeBrands = data.filter((brand: Brand) => brand.is_active);
        setBrands(activeBrands);
        
        // Auto-select first brand if none selected
        if (activeBrands.length > 0 && !selectedBrand) {
          setSelectedBrand(activeBrands[0].id);
        }
      }
    } catch (err) {
      console.error('Erro ao carregar marcas:', err);
      showToast.error('Erro ao carregar marcas');
    } finally {
      setBrandsLoading(false);
    }
  };

  const fetchTokensForBrand = async (brandId: string) => {
    try {
      const { data: { session } } = await (await import('../lib/supabase')).supabase.auth.getSession();
      if (!session) return;

      const headers = {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      };

      const response = await fetch(`${apiUrl}/api/settings/tokens/bulk?brand_id=${brandId}`, { headers });
      
      if (response.ok) {
        const data = await response.json();
        setTokens({
          INSTAGRAM: data.instagram_token || '',
          YOUTUBE: data.youtube_api_key || '',
          TIKTOK: data.tiktok_token || ''
        });
      } else {
        console.error('Erro ao carregar tokens:', response.status);
        setTokens({
          INSTAGRAM: '',
          YOUTUBE: '',
          TIKTOK: ''
        });
      }
    } catch (err) {
      console.error('Erro ao carregar tokens:', err);
      setTokens({
        INSTAGRAM: '',
        YOUTUBE: '',
        TIKTOK: ''
      });
    }
  };

  const handleTokenChange = (platform: string, value: string) => {
    setTokens(prev => ({ ...prev, [platform]: value }));
    // Clear test result when token changes
    setTestResults(prev => ({ ...prev, [platform]: null }));
  };

  const toggleTokenVisibility = (platform: string) => {
    setShowTokens(prev => ({ ...prev, [platform]: !prev[platform] }));
  };

  const testToken = async (platform: string) => {
    const token = tokens[platform];
    if (!token) {
      showToast.error('Token não informado');
      return;
    }

    setTestingTokens(prev => ({ ...prev, [platform]: true }));

    try {
      const { data: { session } } = await (await import('../lib/supabase')).supabase.auth.getSession();
      if (!session) return;

      const headers = {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      };

      const response = await fetch(`${apiUrl}/api/settings/test-connection`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          platform: platform.toLowerCase(),
          token
        })
      });

      if (response.ok) {
        const result = await response.json();
        setTestResults(prev => ({
          ...prev,
          [platform]: { success: true, message: result.account_name || 'Conexão bem-sucedida' }
        }));
        showToast.success(`${platform}: Conexão bem-sucedida!`);
      } else {
        const errorData = await response.json();
        setTestResults(prev => ({
          ...prev,
          [platform]: { success: false, message: errorData.error || 'Falha na conexão' }
        }));
        showToast.error(`${platform}: Falha na conexão`);
      }
    } catch (error) {
      setTestResults(prev => ({
        ...prev,
        [platform]: { success: false, message: 'Erro de rede' }
      }));
      showToast.error(`${platform}: Erro de rede`);
    } finally {
      setTestingTokens(prev => ({ ...prev, [platform]: false }));
    }
  };

  const handleSaveTokens = async () => {
    if (!selectedBrand) {
      showToast.error('Selecione uma marca primeiro');
      return;
    }

    setLoading(true);
    const loadingToast = showToast.loading('Salvando tokens...');

    try {
      const { data: { session } } = await (await import('../lib/supabase')).supabase.auth.getSession();
      if (!session) {
        throw new Error('Usuário não autenticado');
      }

      const headers = {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      };

      const response = await fetch(`${apiUrl}/api/settings/tokens/bulk`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          brand_id: selectedBrand,
          instagram_token: tokens.INSTAGRAM || null,
          youtube_api_key: tokens.YOUTUBE || null,
          tiktok_token: tokens.TIKTOK || null
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Erro ao salvar tokens (${response.status}): ${errorData.error?.message || errorData.error || 'Erro desconhecido'}`);
      }

      showToast.success('Tokens salvos com sucesso!');
    } catch (error) {
      console.error('Erro ao salvar tokens:', error);
      showToast.error(`Erro ao salvar tokens: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    } finally {
      showToast.dismiss(loadingToast);
      setLoading(false);
    }
  };

  const openCreateBrandModal = () => {
    setEditingBrand(null);
    setBrandFormData({
      name: '',
      code: '',
      description: '',
      about: '',
      is_active: true
    });
    setBrandError(null);
    setShowBrandModal(true);
  };

  const openEditBrandModal = (brand: Brand) => {
    setEditingBrand(brand);
    setBrandFormData({
      name: brand.name,
      code: brand.code,
      description: brand.description || '',
      about: brand.about || '',
      is_active: brand.is_active
    });
    setBrandError(null);
    setShowBrandModal(true);
  };

  const closeBrandModal = () => {
    setShowBrandModal(false);
    setEditingBrand(null);
    setBrandFormData({
      name: '',
      code: '',
      description: '',
      about: '',
      is_active: true
    });
    setBrandError(null);
  };

  const handleBrandSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!brandFormData.name.trim() || !brandFormData.code.trim()) {
      setBrandError('Nome e código são obrigatórios');
      return;
    }

    setBrandFormLoading(true);
    setBrandError(null);

    try {
      const { data: { session } } = await (await import('../lib/supabase')).supabase.auth.getSession();
      if (!session) return;

      const headers = {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      };

      const payload = {
        name: brandFormData.name.trim(),
        code: brandFormData.code.trim().toUpperCase(),
        description: brandFormData.description.trim() || null,
        about: brandFormData.about.trim() || null,
        is_active: brandFormData.is_active
      };

      let response;
      if (editingBrand) {
        // Update brand
        response = await fetch(`${apiUrl}/api/brands/${editingBrand.id}`, {
          method: 'PUT',
          headers,
          body: JSON.stringify(payload)
        });
      } else {
        // Create brand
        response = await fetch(`${apiUrl}/api/brands`, {
          method: 'POST',
          headers,
          body: JSON.stringify(payload)
        });
      }

      if (response.ok) {
        await fetchBrands();
        closeBrandModal();
        showToast.success(editingBrand ? 'Marca atualizada com sucesso!' : 'Marca criada com sucesso!');
      } else {
        const errorData = await response.json().catch(() => ({}));
        setBrandError(`Erro ao salvar marca: ${errorData.error || 'Erro desconhecido'}`);
      }
    } catch (err) {
      setBrandError(`Erro ao salvar marca: ${err instanceof Error ? err.message : 'Erro de conexão'}`);
    } finally {
      setBrandFormLoading(false);
    }
  };

  const handleDeleteBrand = async (brand: Brand) => {
    if (!window.confirm(`Tem certeza que deseja excluir a marca "${brand.name}"?`)) {
      return;
    }

    const loadingToast = showToast.loading('Excluindo marca...');

    try {
      const { data: { session } } = await (await import('../lib/supabase')).supabase.auth.getSession();
      if (!session) return;

      const headers = {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      };

      const response = await fetch(`${apiUrl}/api/brands/${brand.id}`, {
        method: 'DELETE',
        headers
      });

      if (response.ok) {
        await fetchBrands();
        showToast.success('Marca excluída com sucesso!');
      } else {
        const errorData = await response.json().catch(() => ({}));
        showToast.error(`Erro ao excluir marca: ${errorData.error || 'Erro desconhecido'}`);
      }
    } catch (err) {
      showToast.error(`Erro ao excluir marca: ${err instanceof Error ? err.message : 'Erro de conexão'}`);
    } finally {
      showToast.dismiss(loadingToast);
    }
  };

  const selectedBrandData = brands.find(b => b.id === selectedBrand);

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <div className="flex items-center space-x-3 mb-2">
          <Settings className="w-8 h-8 text-purple-600" />
          <h1 className="text-3xl font-bold text-gray-900">Configurações</h1>
        </div>
        <p className="text-gray-600">
          Configure tokens de API para integrações com redes sociais
        </p>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-8">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('tokens')}
            className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
              activeTab === 'tokens'
                ? 'border-purple-500 text-purple-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Key className="w-4 h-4" />
            <span>Tokens de API</span>
          </button>
          
          <button
            onClick={() => setActiveTab('brands')}
            className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
              activeTab === 'brands'
                ? 'border-purple-500 text-purple-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Building className="w-4 h-4" />
            <span>Gerenciar Marcas</span>
          </button>
        </nav>
      </div>

      {/* Brands Tab */}
      {activeTab === 'brands' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Marcas</h2>
              <p className="text-gray-600 mt-1">
                Configure o contexto das suas marcas para melhorar as sugestões de IA
              </p>
            </div>
            
            <button
              onClick={openCreateBrandModal}
              className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 flex items-center space-x-2"
            >
              <Plus className="w-4 h-4" />
              <span>Nova Marca</span>
            </button>
          </div>

          {brandsLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-600"></div>
              <span className="ml-2 text-gray-600">Carregando marcas...</span>
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Marca
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Código
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Descrição
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Contexto (About)
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
                    {brands.map((brand) => (
                      <tr key={brand.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                              <span className="text-purple-600 font-medium text-sm">
                                {brand.name.charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <div className="ml-3">
                              <div className="text-sm font-medium text-gray-900">{brand.name}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            {brand.code}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-900 max-w-xs truncate">
                            {brand.description || 'Sem descrição'}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-900 max-w-xs truncate">
                            {brand.about || 'Sem contexto'}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {brand.is_active ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              ✓ Ativa
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                              ✗ Inativa
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex items-center justify-end space-x-2">
                            <button
                              onClick={() => openEditBrandModal(brand)}
                              className="text-blue-600 hover:text-blue-900"
                              title="Editar marca"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={() => handleDeleteBrand(brand)}
                              className="text-red-600 hover:text-red-900"
                              title="Excluir marca"
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
        </div>
      )}

      {/* Tokens Tab */}
      {activeTab === 'tokens' && (
        <>
      {/* Brand Selection */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Selecionar Marca</h2>
        
        {brandsLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-600"></div>
            <span className="ml-2 text-gray-600">Carregando marcas...</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {brands.map((brand) => (
              <button
                key={brand.id}
                onClick={() => setSelectedBrand(brand.id)}
                className={`p-4 rounded-lg border-2 transition-all duration-200 text-left ${
                  selectedBrand === brand.id
                    ? 'border-purple-500 bg-purple-50 shadow-lg'
                    : 'border-gray-200 hover:border-purple-300 hover:shadow-md'
                }`}
              >
                <h3 className="font-semibold text-gray-900">{brand.name}</h3>
                <p className="text-sm text-gray-600 mt-1">{brand.description}</p>
                {selectedBrand === brand.id && (
                  <div className="mt-2 flex items-center text-purple-600">
                    <CheckCircle className="w-4 h-4 mr-1" />
                    <span className="text-sm font-medium">Selecionada</span>
                  </div>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Token Configuration */}
      {selectedBrand && selectedBrandData && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                Tokens para {selectedBrandData.name}
              </h2>
              <p className="text-gray-600 mt-1">
                Configure os tokens de API para esta marca específica
              </p>
            </div>
            
            <button
              onClick={handleSaveTokens}
              disabled={loading}
              className="bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 font-medium"
            >
              {loading ? (
                <Loader className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              <span>{loading ? 'Salvando...' : 'Salvar Tokens'}</span>
            </button>
          </div>

          <div className="space-y-6">
            {TOKEN_CONFIGS.map((config) => (
              <div key={config.platform} className="border border-gray-200 rounded-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{config.label}</h3>
                    <p className="text-sm text-gray-600">{config.description}</p>
                  </div>
                  
                  {config.testEndpoint && (
                    <button
                      onClick={() => testToken(config.platform)}
                      disabled={!tokens[config.platform] || testingTokens[config.platform]}
                      className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                    >
                      {testingTokens[config.platform] ? (
                        <Loader className="w-4 h-4 animate-spin" />
                      ) : (
                        <TestTube className="w-4 h-4" />
                      )}
                      <span>{testingTokens[config.platform] ? 'Testando...' : 'Testar'}</span>
                    </button>
                  )}
                </div>

                <div className="space-y-3">
                  <div className="relative">
                    <input
                      type={showTokens[config.platform] ? 'text' : 'password'}
                      value={tokens[config.platform] || ''}
                      onChange={(e) => handleTokenChange(config.platform, e.target.value)}
                      placeholder={config.placeholder}
                      className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent"
                    />
                    <button
                      type="button"
                      onClick={() => toggleTokenVisibility(config.platform)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showTokens[config.platform] ? (
                        <EyeOff className="w-5 h-5" />
                      ) : (
                        <Eye className="w-5 h-5" />
                      )}
                    </button>
                  </div>

                  {/* Test Result */}
                  {testResults[config.platform] && (
                    <div className={`flex items-center space-x-2 p-3 rounded-lg ${
                      testResults[config.platform]?.success 
                        ? 'bg-green-50 text-green-800 border border-green-200' 
                        : 'bg-red-50 text-red-800 border border-red-200'
                    }`}>
                      {testResults[config.platform]?.success ? (
                        <CheckCircle className="w-4 h-4" />
                      ) : (
                        <XCircle className="w-4 h-4" />
                      )}
                      <span className="text-sm font-medium">
                        {testResults[config.platform]?.message}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Instructions */}
          <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-blue-900 mb-3">Como obter os tokens:</h3>
            <div className="space-y-3 text-sm text-blue-800">
              <div>
                <strong>Instagram:</strong> Acesse o Facebook Developers, crie um app, configure Instagram Graph API (não Basic Display), vincule sua página do Facebook à conta Instagram Business e gere um Page Access Token de longa duração.
              </div>
              <div>
                <strong>YouTube:</strong> No Google Cloud Console, ative a YouTube Data API v3 e crie uma chave de API.
              </div>
              <div>
                <strong>TikTok:</strong> Registre-se no TikTok for Developers, crie um app e obtenha o access token.
              </div>
            </div>
            
            <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <h4 className="font-semibold text-yellow-900 mb-2">⚠️ Importante para Instagram:</h4>
              <ul className="text-sm text-yellow-800 space-y-1">
                <li>• Use Instagram Graph API (para contas Business), não Basic Display API</li>
                <li>• O token deve ser um Page Access Token de longa duração</li>
                <li>• Certifique-se de que não há espaços ou quebras de linha no token</li>
                <li>• A conta Instagram deve estar vinculada a uma página do Facebook</li>
                <li>• Use o botão "Testar" para validar o token antes de salvar</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {!selectedBrand && !brandsLoading && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12">
          <div className="text-center">
            <Key className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              Selecione uma Marca
            </h3>
            <p className="text-gray-600">
              Escolha uma marca acima para configurar seus tokens de API
            </p>
          </div>
        </div>
      )}
        </>
      )}

      {/* Brand Modal */}
      {showBrandModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900">
                {editingBrand ? 'Editar Marca' : 'Nova Marca'}
              </h3>
              <button
                onClick={closeBrandModal}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {brandError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                {brandError}
              </div>
            )}

            <form onSubmit={handleBrandSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nome da Marca *
                  </label>
                  <input
                    type="text"
                    value={brandFormData.name}
                    onChange={(e) => setBrandFormData(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent"
                    placeholder="Ex: Raytchel"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Código da Marca *
                  </label>
                  <input
                    type="text"
                    value={brandFormData.code}
                    onChange={(e) => setBrandFormData(prev => ({ ...prev, code: e.target.value.toUpperCase() }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent"
                    placeholder="Ex: RAYTCHEL"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Descrição
                </label>
                <input
                  type="text"
                  value={brandFormData.description}
                  onChange={(e) => setBrandFormData(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent"
                  placeholder="Ex: Clínica de harmonização facial e estética"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Contexto da Marca (About) *
                </label>
                <textarea
                  value={brandFormData.about}
                  onChange={(e) => setBrandFormData(prev => ({ ...prev, about: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent resize-none"
                  rows={6}
                  placeholder="Descreva o contexto da marca: público-alvo, tom de voz, estilo de comunicação, valores, diferenciais, tipo de conteúdo que produz, etc. Este contexto será usado pela IA para gerar sugestões mais precisas."
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  Este contexto é fundamental para que a IA gere sugestões de conteúdo adequadas à marca
                </p>
              </div>

              <div>
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={brandFormData.is_active}
                    onChange={(e) => setBrandFormData(prev => ({ ...prev, is_active: e.target.checked }))}
                    className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
                  />
                  <span className="text-sm font-medium text-gray-700">
                    Marca ativa
                  </span>
                </label>
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  type="submit"
                  disabled={brandFormLoading}
                  className="flex-1 bg-purple-600 text-white py-2 px-4 rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                >
                  {brandFormLoading ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  ) : (
                    <Save className="w-4 h-4 mr-2" />
                  )}
                  {brandFormLoading ? 'Salvando...' : (editingBrand ? 'Atualizar' : 'Criar')}
                </button>
                <button
                  type="button"
                  onClick={closeBrandModal}
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