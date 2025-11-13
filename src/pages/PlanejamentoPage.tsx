import { useState, useEffect, DragEvent } from 'react';
import { Calendar, ChevronLeft, ChevronRight, Clock, Tag, Edit, Eye } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { format, addDays } from 'date-fns';
import { supabase } from '../lib/supabase';
import { showToast } from '../components/ui/Toast';
import { useAuth } from '../contexts/AuthContext';

interface OrdemServico {
  id: string;
  titulo: string;
  descricao: string;
  marca: string;
  objetivo: string;
  tipo: string;
  status: string;
  prioridade: string;
  gancho?: string;
  cta?: string;
  script_text?: string;
  legenda?: string;
  canais: string[];
  categorias_criativos: string[];
  data_publicacao_prevista?: string;
  criado_em: string;
  atualizado_em: string;
}

const monthNames = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

const dayNames = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'];

export function PlanejamentoPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  
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
  const [posts, setPosts] = useState<OrdemServico[]>([]);
  const [selectedPost, setSelectedPost] = useState<OrdemServico | null>(null);
  const [brands, setBrands] = useState<any[]>([]);
  const [selectedBrand, setSelectedBrand] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [draggedPost, setDraggedPost] = useState<OrdemServico | null>(null);

  // Computed value for selectedWeek
  const selectedWeek = getStartOfWeek(currentDate);


  useEffect(() => {
    fetchBrands();
  }, []);


  // Carregar sugestões salvas
  useEffect(() => {
    loadSuggestions();
  }, [currentDate, selectedBrand]);

  const loadSuggestions = async () => {
    if (!user?.org_id || !selectedBrand) return;

    setIsLoading(true);
    try {
      const startDate = format(selectedWeek, 'yyyy-MM-dd');
      const endDate = format(addDays(selectedWeek, 6), 'yyyy-MM-dd');

      const { data, error } = await supabase
        .from('ordens_de_servico')
        .select('*')
        .eq('org_id', user.org_id)
        .eq('marca', selectedBrand)
        .gte('data_publicacao_prevista', startDate)
        .lte('data_publicacao_prevista', endDate)
        .order('data_publicacao_prevista', { ascending: true });

      if (error) throw error;

      setPosts(data || []);
    } catch (error) {
      console.error('Erro ao carregar OSs:', error);
      showToast.error('Erro ao carregar OSs');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchBrands = async () => {
    if (!user?.org_id) return;

    try {
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
        setSelectedBrand(data[0].code);
      }
    } catch (err) {
      console.error('Erro ao carregar marcas:', err);
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

  const getPostsForDate = (date: Date): OrdemServico[] => {
    const dateStr = date.toISOString().split('T')[0];
    return posts.filter(post => {
      if (!post.data_publicacao_prevista) return false;
      const postDate = post.data_publicacao_prevista.split('T')[0];
      return postDate === dateStr;
    });
  };

  const getStatusColor = (status: string) => {
    const colors = {
      'ROTEIRO': 'bg-yellow-100 text-yellow-800 border-yellow-200',
      'PRODUCAO': 'bg-blue-100 text-blue-800 border-blue-200',
      'REVISAO': 'bg-purple-100 text-purple-800 border-purple-200',
      'APROVACAO': 'bg-orange-100 text-orange-800 border-orange-200',
      'PUBLICADO': 'bg-green-100 text-green-800 border-green-200',
      'ARQUIVADO': 'bg-gray-100 text-gray-800 border-gray-200'
    };
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800 border-gray-200';
  };

  const getStatusLabel = (status: string) => {
    const labels = {
      'ROTEIRO': 'Roteiro',
      'PRODUCAO': 'Produção',
      'REVISAO': 'Revisão',
      'APROVACAO': 'Aprovação',
      'PUBLICADO': 'Publicado',
      'ARQUIVADO': 'Arquivado'
    };
    return labels[status as keyof typeof labels] || status;
  };


  const openPostDetails = (post: OrdemServico) => {
    navigate(`/kanban?os=${post.id}`);
  };



  const handleDragStart = (e: DragEvent<HTMLDivElement>, post: OrdemServico) => {
    setDraggedPost(post);
    e.dataTransfer.effectAllowed = 'move';
    e.currentTarget.style.opacity = '0.5';
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = async (e: DragEvent<HTMLDivElement>, targetDate: Date) => {
    e.preventDefault();

    if (!draggedPost) return;

    const currentDate = draggedPost.data_publicacao_prevista ? new Date(draggedPost.data_publicacao_prevista) : new Date();
    const hours = currentDate.getHours();
    const minutes = currentDate.getMinutes();

    const newDateTime = new Date(targetDate);
    newDateTime.setHours(hours, minutes, 0, 0);

    try {
      const { error } = await supabase
        .from('ordens_de_servico')
        .update({
          data_publicacao_prevista: newDateTime.toISOString(),
          atualizado_em: new Date().toISOString()
        })
        .eq('id', draggedPost.id);

      if (error) throw error;

      showToast.success('OS movida com sucesso!');
      await loadSuggestions();
    } catch (error) {
      console.error('Erro ao mover OS:', error);
      showToast.error('Erro ao mover OS');
    } finally {
      setDraggedPost(null);
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
              <div
                key={index}
                className="bg-white min-h-[500px] p-3"
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, day)}
              >
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
                      draggable
                      onDragStart={(e) => handleDragStart(e, post)}
                      className="bg-gray-50 rounded-lg border border-gray-200 hover:border-purple-300 transition-colors cursor-move"
                    >
                      {/* Status Badge */}
                      <div className="p-2">
                        <div className={`text-xs px-2 py-1 rounded border ${getStatusColor(post.status)} text-center font-medium`}>
                          {getStatusLabel(post.status)}
                        </div>
                      </div>

                      {/* Brand Badge */}
                      <div className="px-2 mb-2">
                        <div className="text-xs px-2 py-1 bg-blue-50 text-blue-700 rounded border border-blue-200 text-center font-medium">
                          {post.marca}
                        </div>
                      </div>

                      {/* Content Preview */}
                      <div
                        className="aspect-square bg-gradient-to-br from-purple-100 to-blue-100 rounded-lg mx-2 mb-3 flex items-center justify-center overflow-hidden cursor-pointer p-4"
                        onClick={() => openPostDetails(post)}
                      >
                        <div className="text-center">
                          <div className="text-4xl mb-2">🎬</div>
                          <div className="text-xs text-gray-600 line-clamp-3">
                            {post.descricao || 'Sem descrição'}
                          </div>
                        </div>
                      </div>

                      {/* Post Info */}
                      <div className="px-2 pb-2">
                        <h4 className="text-sm font-medium text-gray-900 line-clamp-2 mb-2">
                          {post.titulo}
                        </h4>

                        <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
                          <div className="flex items-center">
                            <Clock className="w-3 h-3 mr-1" />
                            {post.data_publicacao_prevista ? new Date(post.data_publicacao_prevista).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                          </div>
                          <div className="flex items-center">
                            <Tag className="w-3 h-3 mr-1" />
                            <span className="text-xs px-1 py-0.5 rounded bg-gray-200 text-gray-700">
                              {post.tipo}
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
                                openPostDetails(post);
                              }}
                              className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                              title="Editar"
                            >
                              <Edit className="w-3 h-3" />
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
                        <Calendar className="w-8 h-8 mx-auto" />
                      </div>
                      <p className="text-xs text-gray-400">Nenhuma OS agendada</p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
}