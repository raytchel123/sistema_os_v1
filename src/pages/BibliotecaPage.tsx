import { useState, useEffect } from 'react';
import { Archive, Search, Copy, ExternalLink, Filter, Calendar, Tag, RefreshCw, Instagram, Eye, Heart, MessageCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { showToast } from '../components/ui/Toast';
import { useAuth } from '../contexts/AuthContext';

interface PostedOS {
  id: string;
  titulo: string;
  marca: string;
  canais: string[];
  final_media_links: any[];
  platform_publish_urls: any;
  criado_em: string;
  data_publicacao_prevista: string;
  thumbnail?: string;
}

interface InstagramPost {
  id: string;
  media_type: 'IMAGE' | 'VIDEO' | 'CAROUSEL_ALBUM';
  caption: string;
  timestamp: string;
  like_count: number;
  comments_count: number;
  permalink: string;
  media_url?: string;
  thumbnail_url?: string;
  insights?: {
    reach?: number;
    impressions?: number;
    video_views?: number;
    profile_visits?: number;
  };
}

interface Brand {
  id: string;
  code: string;
  name: string;
  description: string;
  is_active: boolean;
}

export function BibliotecaPage() {
  const { user } = useAuth();
  const [items, setItems] = useState<PostedOS[]>([]);
  const [instagramPosts, setInstagramPosts] = useState<InstagramPost[]>([]);
  const [filteredItems, setFilteredItems] = useState<PostedOS[]>([]);
  const [loading, setLoading] = useState(true);
  const [instagramLoading, setInstagramLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [brands, setBrands] = useState<Brand[]>([]);
  const [selectedBrand, setSelectedBrand] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'os' | 'instagram'>('os');
  const [filters, setFilters] = useState({
    marca: '',
    plataforma: '',
    periodo: 'all'
  });
  const navigate = useNavigate();

  const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`;

  useEffect(() => {
    if (user) {
      fetchBrands();
      fetchPostedOS();
    }
  }, [user]);

  useEffect(() => {
    filterItems();
  }, [items, searchTerm, filters]);

  useEffect(() => {
    if (selectedBrand && activeTab === 'instagram') {
      fetchInstagramPosts();
    }
  }, [selectedBrand, activeTab]);

  const fetchBrands = async () => {
    if (!user?.org_id) return;

    try {
      const { supabase } = await import('../lib/supabase');

      const { data, error } = await supabase
        .from('brands')
        .select('*')
        .eq('org_id', user.org_id)
        .eq('is_active', true)
        .order('name');

      if (error) {
        console.error('Erro ao carregar marcas:', error);
        return;
      }

      setBrands(data || []);
      if (data && data.length > 0 && !selectedBrand) {
        setSelectedBrand(data[0].id);
      }
    } catch (err) {
      console.error('Erro ao carregar marcas:', err);
    }
  };

  const fetchPostedOS = async () => {
    try {
      setLoading(true);
      const { data: { session } } = await (await import('../lib/supabase')).supabase.auth.getSession();
      if (!session) return;

      const headers = {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      };

      const response = await fetch(`${apiUrl}/api/ordens?status=PUBLICADO`, { headers });
      
      if (response.ok) {
        const data = await response.json();
        setItems(data);
      }
    } catch (err) {
      console.error('Erro ao carregar biblioteca:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchInstagramPosts = async () => {
    if (!selectedBrand) return;

    setInstagramLoading(true);
    const loadingToast = showToast.loading('Carregando posts do Instagram...');

    try {
      const { data: { session } } = await (await import('../lib/supabase')).supabase.auth.getSession();
      if (!session) return;

      const headers = {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      };

      const response = await fetch(`${apiUrl}/instagram-integration/posts?brand_id=${selectedBrand}`, { headers });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Erro ${response.status}`);
      }

      const data = await response.json();
      setInstagramPosts(data.posts || []);
      
      if (data.posts?.length > 0) {
        showToast.success(`${data.posts.length} posts carregados do Instagram!`);
      } else {
        showToast.info('Nenhum post encontrado no Instagram para esta marca');
      }
    } catch (error) {
      console.error('Erro ao carregar posts do Instagram:', error);
      showToast.error(`Erro ao carregar Instagram: ${selectedBrand} ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    } finally {
      showToast.dismiss(loadingToast);
      setInstagramLoading(false);
    }
  };

  const filterItems = () => {
    let filtered = items;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(item => 
        item.titulo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.marca.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Brand filter
    if (filters.marca) {
      filtered = filtered.filter(item => item.marca === filters.marca);
    }

    // Platform filter
    if (filters.plataforma) {
      filtered = filtered.filter(item => 
        item.canais.includes(filters.plataforma) ||
        item.final_media_links.some((link: any) => link.platform === filters.plataforma)
      );
    }

    // Period filter
    if (filters.periodo) {
      const now = new Date();
      const filterDate = new Date();
      
      switch (filters.periodo) {
        case '7d':
          filterDate.setDate(now.getDate() - 7);
          break;
        case '30d':
          filterDate.setDate(now.getDate() - 30);
          break;
        case '90d':
          filterDate.setDate(now.getDate() - 90);
          break;
        case 'all':
        default:
          // No date filtering
          break;
      }
      
      if (filters.periodo !== 'all') {
        filtered = filtered.filter(item => 
          new Date(item.criado_em) >= filterDate
        );
      }
    }

    setFilteredItems(filtered);
  };

  const duplicateAsNewOS = async (originalOS: PostedOS) => {
    const loadingToast = showToast.loading('Duplicando OS...');
    
    try {
      const { data: { session } } = await (await import('../lib/supabase')).supabase.auth.getSession();
      if (!session) return;

      const headers = {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      };

      // Create new OS based on the original
      const newOSData = {
        titulo: `${originalOS.titulo} (Cópia)`,
        marca: originalOS.marca,
        canais: originalOS.canais,
        // Reset status and dates
        status: 'ROTEIRO',
        data_publicacao_prevista: null,
        // Keep structure but clear final outputs
        criativos_prontos_links: [],
        midia_bruta_links: []
      };

      const response = await fetch(`${apiUrl}/api/ordens`, {
        method: 'POST',
        headers,
        body: JSON.stringify(newOSData)
      });

      if (response.ok) {
        showToast.success('OS duplicada com sucesso!');
        navigate('/kanban');
      } else {
        showToast.error('Erro ao duplicar OS');
      }
    } catch (err) {
      showToast.error('Erro ao duplicar OS');
    } finally {
      showToast.dismiss(loadingToast);
    }
  };

  const createOSFromInstagramPost = async (post: InstagramPost) => {
    const loadingToast = showToast.loading('Criando OS a partir do post...');
    
    try {
      const { data: { session } } = await (await import('../lib/supabase')).supabase.auth.getSession();
      if (!session) return;

      const headers = {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      };

      const selectedBrandData = brands.find(b => b.id === selectedBrand);
      
      // Create new OS based on Instagram post
      const newOSData = {
        titulo: `Repost: ${post.caption.split('\n')[0].substring(0, 50)}...`,
        descricao: post.caption,
        marca: selectedBrandData?.code || 'RAYTCHEL',
        objetivo: 'ATRACAO',
        tipo: 'EDUCATIVO',
        status: 'ROTEIRO',
        canais: ['Instagram'],
        prioridade: 'MEDIUM',
        legenda: post.caption,
        final_media_links: [post.permalink],
        categorias_criativos: [post.media_type === 'VIDEO' ? 'Instagram Reels' : 'Instagram Feed']
      };

      const response = await fetch(`${apiUrl}/api/ordens`, {
        method: 'POST',
        headers,
        body: JSON.stringify(newOSData)
      });

      if (response.ok) {
        showToast.success('OS criada com sucesso a partir do post do Instagram!');
        navigate('/kanban');
      } else {
        const errorData = await response.json().catch(() => ({}));
        showToast.error(`Erro ao criar OS: ${errorData.error || 'Erro desconhecido'}`);
      }
    } catch (err) {
      showToast.error('Erro ao criar OS');
    } finally {
      showToast.dismiss(loadingToast);
    }
  };

  const getMarcaColor = (marca: string) => {
    const colors = {
      'RAYTCHEL': 'bg-blue-100 text-blue-700',
      'ZAFFIRA': 'bg-yellow-100 text-yellow-700',
      'ZAFF': 'bg-gray-100 text-gray-700',
      'CRISPIM': 'bg-orange-100 text-orange-700',
      'FAZENDA': 'bg-green-100 text-green-700'
    };
    return colors[marca as keyof typeof colors] || 'bg-gray-100 text-gray-700';
  };

  const getPlatformIcon = (platform: string) => {
    const icons = {
      'INSTAGRAM': '📱',
      'TIKTOK': '🎵',
      'YOUTUBE': '▶️',
      'FACEBOOK': '👥',
      'LINKEDIN': '💼'
    };
    return icons[platform as keyof typeof icons] || '🔗';
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const getMediaTypeIcon = (mediaType: string) => {
    switch (mediaType) {
      case 'VIDEO': return '🎬';
      case 'CAROUSEL_ALBUM': return '📸';
      case 'IMAGE': return '🖼️';
      default: return '📱';
    }
  };

  const selectedBrandData = brands.find(b => b.id === selectedBrand);

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-8">
        <div className="flex items-center space-x-3 mb-2">
          <Archive className="w-8 h-8 text-purple-600" />
          <h1 className="text-3xl font-bold text-gray-900">Biblioteca</h1>
        </div>
        <p className="text-gray-600">
          Conteúdos publicados e posts do Instagram
        </p>
      </div>

      {/* Brand Selection */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Selecionar Marca</h3>
          {activeTab === 'instagram' && selectedBrand && (
            <button
              onClick={fetchInstagramPosts}
              disabled={instagramLoading}
              className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 disabled:opacity-50 flex items-center space-x-2"
            >
              <RefreshCw className={`w-4 h-4 ${instagramLoading ? 'animate-spin' : ''}`} />
              <span>{instagramLoading ? 'Carregando...' : 'Atualizar'}</span>
            </button>
          )}
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
              <h4 className="font-semibold text-gray-900">{brand.name}</h4>
              <p className="text-sm text-gray-600 mt-1">{brand.description}</p>
              {selectedBrand === brand.id && (
                <div className="mt-2 flex items-center text-purple-600">
                  <div className="w-4 h-4 rounded-full bg-purple-600 flex items-center justify-center mr-2">
                    <svg className="w-2 h-2 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <span className="text-sm font-medium">Selecionada</span>
                </div>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('os')}
            className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
              activeTab === 'os'
                ? 'border-purple-500 text-purple-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Archive className="w-4 h-4" />
            <span>OS Publicadas</span>
          </button>
          
          <button
            onClick={() => setActiveTab('instagram')}
            className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
              activeTab === 'instagram'
                ? 'border-purple-500 text-purple-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Instagram className="w-4 h-4" />
            <span>Posts do Instagram</span>
            {selectedBrandData && (
              <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full">
                {selectedBrandData.name}
              </span>
            )}
          </button>
        </nav>
      </div>

      {/* OS Tab */}
      {activeTab === 'os' && (
        <>
          {/* Search and Filters */}
          <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
            <div className="flex flex-col md:flex-row gap-4">
              {/* Search */}
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Buscar por título ou marca..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent"
                />
              </div>

              {/* Filters */}
              <div className="flex gap-3">
                <select
                  value={filters.marca}
                  onChange={(e) => setFilters(prev => ({ ...prev, marca: e.target.value }))}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent"
                >
                  <option value="">Todas as marcas</option>
                  <option value="RAYTCHEL">Raytchel</option>
                  <option value="ZAFFIRA">Zaffira</option>
                  <option value="ZAFF">Zaff</option>
                  <option value="CRISPIM">Crispim</option>
                  <option value="FAZENDA">Fazenda</option>
                </select>

                <select
                  value={filters.plataforma}
                  onChange={(e) => setFilters(prev => ({ ...prev, plataforma: e.target.value }))}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent"
                >
                  <option value="">Todas as plataformas</option>
                  <option value="INSTAGRAM">Instagram</option>
                  <option value="TIKTOK">TikTok</option>
                  <option value="YOUTUBE">YouTube</option>
                  <option value="FACEBOOK">Facebook</option>
                  <option value="LINKEDIN">LinkedIn</option>
                </select>

                <select
                  value={filters.periodo}
                  onChange={(e) => setFilters(prev => ({ ...prev, periodo: e.target.value }))}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent"
                >
                  <option value="all">Todos os períodos</option>
                  <option value="7d">Últimos 7 dias</option>
                  <option value="30d">Últimos 30 dias</option>
                  <option value="90d">Últimos 90 dias</option>
                </select>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12">
              <div className="text-center">
                <Archive className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  {items.length === 0 ? 'Nenhum conteúdo publicado' : 'Nenhum resultado encontrado'}
                </h3>
                <p className="text-gray-600">
                  {items.length === 0 
                    ? 'Quando houver conteúdos publicados, eles aparecerão aqui.'
                    : 'Tente ajustar os filtros de busca.'
                  }
                </p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredItems.map((item) => (
                <div key={item.id} className="bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                  {/* Thumbnail placeholder */}
                  <div className="aspect-video bg-gradient-to-br from-purple-100 to-blue-100 rounded-t-lg flex items-center justify-center">
                    <span className="text-4xl">🎬</span>
                  </div>
                  
                  <div className="p-6">
                    <div className="flex items-start justify-between mb-3">
                      <h3 className="font-semibold text-gray-900 text-lg line-clamp-2 flex-1">
                        {item.titulo}
                      </h3>
                      <span className={`ml-2 text-xs px-2 py-1 rounded ${getMarcaColor(item.marca)}`}>
                        {item.marca}
                      </span>
                    </div>

                    {/* Platforms */}
                    <div className="flex items-center space-x-2 mb-4">
                      {item.final_media_links.map((link: any, index: number) => (
                        <span key={index} className="text-lg" title={link.platform}>
                          {getPlatformIcon(link.platform)}
                        </span>
                      ))}
                      {Object.keys(item.platform_publish_urls || {}).map((platform, index) => (
                        <span key={index} className="text-lg" title={platform}>
                          {getPlatformIcon(platform.toUpperCase())}
                        </span>
                      ))}
                    </div>

                    {/* Links */}
                    <div className="space-y-2 mb-4">
                      {item.final_media_links.slice(0, 2).map((link: any, index: number) => (
                        <a
                          key={index}
                          href={link.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center text-sm text-blue-600 hover:text-blue-800"
                        >
                          <ExternalLink className="w-3 h-3 mr-1" />
                          {link.platform} - v{link.version || 1}
                        </a>
                      ))}
                      {item.final_media_links.length > 2 && (
                        <span className="text-xs text-gray-500">
                          +{item.final_media_links.length - 2} mais links
                        </span>
                      )}
                    </div>

                    {/* Date */}
                    <div className="text-xs text-gray-500 mb-4">
                      Publicado em {new Date(item.data_publicacao_prevista || item.criado_em).toLocaleDateString('pt-BR')}
                    </div>

                    {/* Actions */}
                    <div className="flex space-x-2">
                      <button
                        onClick={() => duplicateAsNewOS(item)}
                        className="flex-1 bg-purple-600 text-white py-2 px-3 rounded-lg hover:bg-purple-700 transition-colors flex items-center justify-center text-sm"
                      >
                        <Copy className="w-4 h-4 mr-2" />
                        Duplicar
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Instagram Tab */}
      {activeTab === 'instagram' && (
        <>
          {!selectedBrand ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12">
              <div className="text-center">
                <Instagram className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  Selecione uma Marca
                </h3>
                <p className="text-gray-600">
                  Escolha uma marca acima para visualizar os posts do Instagram
                </p>
              </div>
            </div>
          ) : instagramLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
              <span className="ml-3 text-gray-600">Carregando posts do Instagram...</span>
            </div>
          ) : instagramPosts.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12">
              <div className="text-center">
                <Instagram className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  Nenhum post encontrado
                </h3>
                <p className="text-gray-600 mb-4">
                  Não foram encontrados posts do Instagram para {selectedBrandData?.name}
                </p>
                <button
                  onClick={fetchInstagramPosts}
                  className="bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 flex items-center space-x-2 mx-auto"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>Tentar Novamente</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {instagramPosts.map((post) => (
                <div key={post.id} className="bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                  {/* Post Media */}
                  <div className="aspect-square bg-gradient-to-br from-purple-100 to-pink-100 rounded-t-lg flex items-center justify-center overflow-hidden">
                    {post.media_url ? (
                      <img 
                        src={post.media_url} 
                        alt="Instagram post"
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                          target.parentElement!.innerHTML = `<span class="text-4xl">${getMediaTypeIcon(post.media_type)}</span>`;
                        }}
                      />
                    ) : (
                      <span className="text-4xl">{getMediaTypeIcon(post.media_type)}</span>
                    )}
                  </div>
                  
                  <div className="p-6">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded">
                            {post.media_type}
                          </span>
                          <span className="text-xs text-gray-500">
                            {formatDate(post.timestamp)}
                          </span>
                        </div>
                        <p className="text-sm text-gray-700 line-clamp-3 leading-relaxed">
                          {post.caption}
                        </p>
                      </div>
                    </div>

                    {/* Metrics */}
                    <div className="flex items-center justify-between mb-4 p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-4 text-sm">
                        <div className="flex items-center space-x-1 text-red-600">
                          <Heart className="w-4 h-4" />
                          <span className="font-medium">{formatNumber(post.like_count)}</span>
                        </div>
                        <div className="flex items-center space-x-1 text-blue-600">
                          <MessageCircle className="w-4 h-4" />
                          <span className="font-medium">{formatNumber(post.comments_count)}</span>
                        </div>
                        {post.insights?.reach && (
                          <div className="flex items-center space-x-1 text-green-600">
                            <Eye className="w-4 h-4" />
                            <span className="font-medium">{formatNumber(post.insights.reach)}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex space-x-2">
                      <a
                        href={post.permalink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 bg-purple-600 text-white py-2 px-3 rounded-lg hover:bg-purple-700 transition-colors flex items-center justify-center text-sm"
                      >
                        <ExternalLink className="w-4 h-4 mr-2" />
                        Ver Post
                      </a>
                      <button
                        onClick={() => createOSFromInstagramPost(post)}
                        className="flex-1 border border-purple-600 text-purple-600 py-2 px-3 rounded-lg hover:bg-purple-50 transition-colors flex items-center justify-center text-sm"
                      >
                        <Copy className="w-4 h-4 mr-2" />
                        Criar OS
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}