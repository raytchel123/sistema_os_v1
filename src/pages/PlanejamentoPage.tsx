import { useState, useEffect } from 'react';
import { Calendar, ChevronLeft, ChevronRight, Plus, Wand2, Clock, Tag, Edit, Trash2, Eye } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { format, addDays } from 'date-fns';
import { supabase } from '../lib/supabase';
import { showToast } from '../components/ui/Toast';
import { PostDetailsModal } from '../components/planning/PostDetailsModal';

interface PostSuggestion {
  id: string;
  scheduled_date: string;
  scheduled_time: string;
  post_type: 'POST' | 'STORY' | 'REELS';
  title: string;
  description: string;
  hook: string;
  development: string;
  cta: string;
  copy_final: string;
  hashtags: string[];
  visual_elements: string[];
  soundtrack?: string;
  thumbnail_url: string;
  status: 'SUGGESTION' | 'IN_PRODUCTION' | 'APPROVED' | 'POSTED';
  brand_code: string;
  ai_generated: boolean;
  created_at: string;
}

const monthNames = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

const dayNames = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'];

export function PlanejamentoPage() {
  const navigate = useNavigate();
  
  // Move getStartOfWeek function before its usage
  const getStartOfWeek = (date: Date): Date => {
    const start = new Date(date);
    const day = start.getDay();
    const diff = start.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
    start.setDate(diff);
    start.setHours(0, 0, 0, 0);
    return start;
  };

  const [currentDate, setCurrentDate] = useState(new Date());
  const [posts, setPosts] = useState<PostSuggestion[]>([]);
  const [selectedPost, setSelectedPost] = useState<PostSuggestion | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [brands, setBrands] = useState<any[]>([]);
  const [selectedBrand, setSelectedBrand] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  // Computed value for selectedWeek
  const selectedWeek = getStartOfWeek(currentDate);

  const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`;

  useEffect(() => {
    fetchBrands();
  }, []);

  useEffect(() => {
    if (selectedBrand) {
      fetchPostSuggestions();
    }
  }, [currentDate, selectedBrand]);

  // Carregar sugestões salvas
  useEffect(() => {
    loadSuggestions();
  }, [currentDate, selectedBrand]);

  const loadSuggestions = async () => {
    setIsLoading(true);
    try {
      const startDate = format(selectedWeek, 'yyyy-MM-dd');
      const endDate = format(addDays(selectedWeek, 6), 'yyyy-MM-dd');
      
      const { data, error } = await supabase
        .from('post_suggestions')
        .select('*')
        .eq('brand_code', selectedBrand)
        .gte('scheduled_date', startDate)
        .lte('scheduled_date', endDate)
        .order('scheduled_date', { ascending: true });

      if (error) throw error;
      
      setPosts(data || []);
    } catch (error) {
      console.error('Erro ao carregar sugestões:', error);
      showToast.error('Erro ao carregar sugestões');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchBrands = async () => {
    try {
      const { data: { session } } = await (await import('../lib/supabase')).supabase.auth.getSession();
      if (!session) return;

      const headers = {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      };

      const response = await fetch(`${apiUrl}/api/brands`, { headers });
      
      if (response.ok) {
        const data = await response.json();
        const activeBrands = data.filter((brand: any) => brand.is_active);
        setBrands(activeBrands);
        if (activeBrands.length > 0 && !selectedBrand) {
          setSelectedBrand(activeBrands[0].code);
        }
      }
    } catch (err) {
      console.error('Erro ao carregar marcas:', err);
    }
  };

  const fetchPostSuggestions = async () => {
    try {
      const { data: { session } } = await (await import('../lib/supabase')).supabase.auth.getSession();
      if (!session) return;

      const headers = {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      };

      const startOfWeek = getStartOfWeek(currentDate);
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);

      const params = new URLSearchParams({
        brand_code: selectedBrand,
        start_date: startOfWeek.toISOString().split('T')[0],
        end_date: endOfWeek.toISOString().split('T')[0]
      });

      const response = await fetch(`${apiUrl}/planning-ai/suggestions?${params}`, { headers });
      
      if (response.ok) {
        const data = await response.json();
        setPosts(data.suggestions || []);
      }
    } catch (err) {
      console.error('Erro ao carregar sugestões:', err);
    }
  };

  const generateWeeklyPosts = async () => {
    if (!selectedBrand) {
      showToast.error('Selecione uma marca primeiro');
      return;
    }

    setLoading(true);
    const loadingToast = showToast.loading('Gerando sugestões de postagens...');

    try {
      const { data: { session } } = await (await import('../lib/supabase')).supabase.auth.getSession();
      if (!session) return;

      const headers = {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      };

      const startOfWeek = getStartOfWeek(currentDate);
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);

      const response = await fetch(`${apiUrl}/planning-ai/generate-week`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          action: 'generate_and_save_week',
          brand: selectedBrand,
          startDate: format(selectedWeek, 'yyyy-MM-dd')
        })
      });

      if (response.ok) {
        await response.json();
        
        // Recarregar sugestões do banco
        await loadSuggestions();
        showToast.success('Sugestões geradas com sucesso!');
      } else {
        const errorData = await response.json().catch(() => ({}));
        showToast.error(`Erro ao gerar sugestões: ${errorData.error || 'Erro desconhecido'}`);
      }
    } catch (error) {
      console.error('Erro ao gerar sugestões:', error);
      showToast.error('Erro ao gerar sugestões');
    } finally {
      showToast.dismiss(loadingToast);
      setLoading(false);
    }
  };

  const deleteSuggestion = async (suggestionId: string) => {
    try {
      const { error } = await supabase
        .from('post_suggestions')
        .delete()
        .eq('id', suggestionId);

      if (error) throw error;
      
      await loadSuggestions();
      showToast.success('Sugestão excluída com sucesso!');
    } catch (error) {
      console.error('Erro ao excluir sugestão:', error);
      showToast.error('Erro ao excluir sugestão');
    }
  };

  const getWeekDays = (): Date[] => {
    const startOfWeek = getStartOfWeek(currentDate);
    const days = [];
    
    for (let i = 0; i < 7; i++) {
      const day = new Date(startOfWeek);
      day.setDate(startOfWeek.getDate() + i);
      days.push(day);
    }
    
    return days;
  };

  const navigateWeek = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    newDate.setDate(currentDate.getDate() + (direction === 'next' ? 7 : -7));
    setCurrentDate(newDate);
  };

  const getPostsForDate = (date: Date): PostSuggestion[] => {
    const dateStr = date.toISOString().split('T')[0];
    return posts.filter(post => post.scheduled_date === dateStr);
  };

  const getStatusColor = (status: string) => {
    const colors = {
      'SUGGESTION': 'bg-orange-100 text-orange-800 border-orange-200',
      'IN_PRODUCTION': 'bg-blue-100 text-blue-800 border-blue-200',
      'APPROVED': 'bg-green-100 text-green-800 border-green-200',
      'POSTED': 'bg-gray-100 text-gray-800 border-gray-200'
    };
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800 border-gray-200';
  };

  const getStatusLabel = (status: string) => {
    const labels = {
      'SUGGESTION': 'Pendente Edição',
      'IN_PRODUCTION': 'Em Produção',
      'APPROVED': 'Aprovado',
      'POSTED': 'Publicado'
    };
    return labels[status as keyof typeof labels] || status;
  };

  const getTypeColor = (type: string) => {
    const colors = {
      'POST': 'bg-blue-500',
      'STORY': 'bg-purple-500',
      'REELS': 'bg-pink-500'
    };
    return colors[type as keyof typeof colors] || 'bg-gray-500';
  };

  const openPostDetails = (post: PostSuggestion) => {
    setSelectedPost(post);
    setShowDetailsModal(true);
  };

  const closeDetailsModal = () => {
    setShowDetailsModal(false);
    setSelectedPost(null);
  };

  const createOSFromPost = async (post: PostSuggestion) => {
    const loadingToast = showToast.loading('Criando OS...');
    
    try {
      const { data: { session } } = await (await import('../lib/supabase')).supabase.auth.getSession();
      if (!session) return;

      const headers = {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      };

      const osData = {
        titulo: post.title,
        descricao: post.description,
        marca: post.brand_code,
        objetivo: 'ATRACAO',
        tipo: 'EDUCATIVO',
        status: 'ROTEIRO',
        data_publicacao_prevista: `${post.scheduled_date}T${post.scheduled_time}:00`,
        canais: ['Instagram'],
        prioridade: 'MEDIUM',
        gancho: post.hook,
        cta: post.cta,
        script_text: post.copy_final,
        legenda: post.copy_final,
        categorias_criativos: [post.post_type === 'POST' ? 'Instagram Feed' : `Instagram ${post.post_type}`]
      };

      const response = await fetch(`${apiUrl}/api/ordens`, {
        method: 'POST',
        headers,
        body: JSON.stringify(osData)
      });

      if (response.ok) {
        // Update suggestion status
        await fetch(`${apiUrl}/planning-ai/suggestions/${post.id}`, {
          method: 'PATCH',
          headers,
          body: JSON.stringify({ status: 'IN_PRODUCTION' })
        });

        showToast.success('OS criada com sucesso!');
        closeDetailsModal();
        fetchPostSuggestions(); // Refresh suggestions
      } else {
        showToast.error('Erro ao criar OS');
      }
    } catch (error) {
      showToast.error('Erro ao criar OS');
    } finally {
      showToast.dismiss(loadingToast);
    }
  };

  const weekDays = getWeekDays();

  return (
<div className="w-full px-4">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Calendar className="w-8 h-8 text-purple-600" />
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Planejamento</h1>
              <p className="text-gray-600">Sugestões automáticas de conteúdo geradas por IA</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            {/* Brand Selector */}
            <select
              value={selectedBrand}
              onChange={(e) => setSelectedBrand(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent"
            >
              <option value="">Selecione uma marca</option>
              {brands.map(brand => (
                <option key={brand.code} value={brand.code}>
                  {brand.name}
                </option>
              ))}
            </select>
            
            <button
              onClick={generateWeeklyPosts}
              disabled={loading || !selectedBrand}
              className="bg-purple-600 text-white px-6 py-2 rounded-lg hover:bg-purple-700 disabled:opacity-50 flex items-center space-x-2"
            >
              <Wand2 className="w-4 h-4" />
              <span>{loading ? 'Gerando...' : 'Gerar Sugestões'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Calendar Header */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-6">
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => navigateWeek('prev')}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            
            <h2 className="text-xl font-semibold text-gray-900">
              {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
            </h2>
            
            <button
              onClick={() => navigateWeek('next')}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          <div className="flex items-center space-x-4 text-sm">
            <div className="flex items-center space-x-2">
              <span className="w-3 h-3 bg-orange-500 rounded-full"></span>
              <span className="text-gray-600">Pendente Edição</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="w-3 h-3 bg-blue-500 rounded-full"></span>
              <span className="text-gray-600">Em Produção</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="w-3 h-3 bg-green-500 rounded-full"></span>
              <span className="text-gray-600">Aprovado</span>
            </div>
          </div>
        </div>

        {/* Week Calendar */}
        <div className="grid grid-cols-7 gap-px bg-gray-200">
          {weekDays.map((day, index) => {
            const dayPosts = getPostsForDate(day);
            const isToday = day.toDateString() === new Date().toDateString();
            
            return (
              <div key={index} className="bg-white min-h-[500px] p-3">
                {/* Day Header */}
                <div className="mb-4 pb-2 border-b border-gray-100">
                  <div className="text-sm text-gray-600 mb-1">{dayNames[index]}</div>
                  <div className={`text-lg font-semibold ${isToday ? 'text-purple-600' : 'text-gray-900'}`}>
                    {day.getDate()}/{monthNames[day.getMonth()].substring(0, 3)}
                  </div>
                  {isToday && (
                    <div className="text-xs text-purple-600 font-medium">Hoje</div>
                  )}
                </div>

                {/* Posts for this day */}
                <div className="space-y-3">
                  {dayPosts.map((post) => (
                    <div
                      key={post.id}
                      className="bg-gray-50 rounded-lg border border-gray-200 hover:border-purple-300 transition-colors cursor-pointer"
                    >
                      {/* Status Badge */}
                      <div className="p-2">
                        <div className={`text-xs px-2 py-1 rounded border ${getStatusColor(post.status)} text-center font-medium`}>
                          {getStatusLabel(post.status)}
                        </div>
                      </div>

                      {/* Post Type Dropdown */}
                      <div className="px-2 mb-2">
                        <select 
                          value={post.post_type}
                          onChange={async (e) => {
                            try {
                              const { error } = await supabase
                                .from('post_suggestions')
                                .update({ post_type: e.target.value })
                                .eq('id', post.id);
                              
                              if (error) throw error;
                              await loadSuggestions();
                            } catch (error) {
                              console.error('Erro ao atualizar tipo:', error);
                              showToast.error('Erro ao atualizar tipo');
                            }
                          }}
                          className="w-full text-xs border border-gray-300 rounded px-2 py-1"
                        >
                          <option value="POST">Post</option>
                          <option value="STORY">Story</option>
                          <option value="REELS">Reels</option>
                        </select>
                      </div>

                      {/* Thumbnail */}
                      <div 
                        className="aspect-square bg-gradient-to-br from-purple-100 to-blue-100 rounded-lg mx-2 mb-3 flex items-center justify-center overflow-hidden cursor-pointer"
                        onClick={() => openPostDetails(post)}
                      >
                        <img 
                          src={post.thumbnail_url} 
                          alt={post.title}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.style.display = 'none';
                            target.parentElement!.innerHTML = '<span class="text-2xl">🎬</span>';
                          }}
                        />
                      </div>

                      {/* Post Info */}
                      <div className="px-2 pb-2">
                        <h4 className="text-sm font-medium text-gray-900 line-clamp-2 mb-2">
                          {post.title}
                        </h4>
                        
                        <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
                          <div className="flex items-center">
                            <Clock className="w-3 h-3 mr-1" />
                            {post.scheduled_time}
                          </div>
                          <div className="flex items-center">
                            <Tag className="w-3 h-3 mr-1" />
                            <span className={`text-xs px-1 py-0.5 rounded text-white ${getTypeColor(post.post_type)}`}>
                              {post.post_type}
                            </span>
                          </div>
                        </div>

                        {/* Action Icons */}
                        <div className="flex items-center justify-between pt-2 border-t border-gray-200">
                          <div className="flex items-center space-x-1">
                            <button
                              onClick={async (e) => {
                                e.stopPropagation();
                                openPostDetails(post);
                              }}
                              className="p-1 text-gray-400 hover:text-purple-600 transition-colors"
                              title="Ver detalhes"
                            >
                              <Eye className="w-3 h-3" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                // Edit functionality
                              }}
                              className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                              title="Editar"
                            >
                              <Edit className="w-3 h-3" />
                            </button>
                            <button
                              onClick={async (e) => {
                                e.stopPropagation();
                                if (confirm('Tem certeza que deseja excluir esta sugestão?')) {
                                  await deleteSuggestion(post.id);
                                }
                              }}
                              className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                              title="Excluir"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}

                  {/* Empty state for days without posts */}
                  {dayPosts.length === 0 && (
                    <div className="text-center py-8">
                      <div className="text-gray-300 mb-2">
                        <Plus className="w-8 h-8 mx-auto" />
                      </div>
                      <button
                        onClick={async () => {
                          setIsGenerating(true);
                          try {
                            const { data: { session } } = await (await import('../lib/supabase')).supabase.auth.getSession();
                            if (!session) return;

                            const headers = {
                              'Authorization': `Bearer ${session.access_token}`,
                              'Content-Type': 'application/json',
                            };

                            const response = await fetch(`${apiUrl}/planning-ai/generate-single`, {
                              method: 'POST',
                              headers,
                              body: JSON.stringify({
                                action: 'generate_single_day',
                                brand: selectedBrand,
                                date: day.toISOString().split('T')[0]
                              })
                            });
                            
                            if (!response.ok) throw new Error('Erro ao gerar sugestão');
                            
                            await loadSuggestions();
                            showToast.success('Sugestão gerada com sucesso!');
                          } catch (error) {
                            console.error('Erro ao gerar sugestão:', error);
                            showToast.error('Erro ao gerar sugestão');
                          } finally {
                            setIsGenerating(false);
                          }
                        }}
                        className="text-purple-600 hover:text-purple-800 text-sm flex items-center space-x-1 mx-auto"
                      >
                        <span>Gerar post</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Post Details Modal */}
      {showDetailsModal && selectedPost && (
        <PostDetailsModal
          post={selectedPost}
          onClose={closeDetailsModal}
          onCreateOS={createOSFromPost}
        />
      )}
    </div>
  );
}