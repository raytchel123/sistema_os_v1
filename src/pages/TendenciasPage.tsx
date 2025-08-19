import { useState, useEffect } from 'react';
import { TrendingUp, Instagram, Youtube, Download, Copy, RefreshCw, BarChart3, Target, Lightbulb } from 'lucide-react';
import { showToast } from '../components/ui/Toast';

interface ContentData {
  id: string;
  platform: 'instagram' | 'youtube';
  type: string;
  title: string;
  caption: string;
  hashtags: string[];
  publishedAt: string;
  metrics: {
    likes?: number;
    comments?: number;
    views?: number;
    shares?: number;
  };
  funnelStage: 'TOPO' | 'MEIO' | 'FUNDO';
  url: string;
}

interface ContentSuggestion {
  id: string;
  type: 'REEL' | 'CARROSSEL' | 'STORY';
  title: string;
  hook: string;
  content: string;
  cta: string;
  soundtrack?: string;
  funnelStage: 'TOPO' | 'MEIO' | 'FUNDO';
  hashtags: string[];
  estimatedEngagement: number;
}

interface TrendsAnalysis {
  topPerformingThemes: string[];
  bestPostTypes: string[];
  optimalPostTimes: string[];
  engagementPatterns: {
    avgLikes: number;
    avgComments: number;
    avgViews: number;
  };
  funnelDistribution: {
    topo: number;
    meio: number;
    fundo: number;
  };
}

export function TendenciasPage() {
  const [contentData, setContentData] = useState<ContentData[]>([]);
  const [suggestions, setSuggestions] = useState<ContentSuggestion[]>([]);
  const [analysis, setAnalysis] = useState<TrendsAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'analysis' | 'suggestions'>('analysis');
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`;

  useEffect(() => {
    fetchTrendsData();
  }, []);

  const fetchTrendsData = async () => {
    setLoading(true);
    const loadingToast = showToast.loading('Analisando tendências...');

    try {
      const { data: { session } } = await (await import('../lib/supabase')).supabase.auth.getSession();
      if (!session) {
        throw new Error('Usuário não autenticado');
      }

      const headers = {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      };

      const response = await fetch(`${apiUrl}/trends-analyzer/analyze`, {
        method: 'POST',
        headers
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao analisar tendências');
      }

      const data = await response.json();
      
      setContentData(data.contentData || []);
      setSuggestions(data.suggestions || []);
      setAnalysis(data.analysis || null);
      setLastUpdate(new Date());
      
      showToast.success('Análise de tendências atualizada!');
    } catch (error) {
      console.error('Erro ao buscar tendências:', error);
      showToast.error(`Erro: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    } finally {
      showToast.dismiss(loadingToast);
      setLoading(false);
    }
  };

  const exportToSpreadsheet = async () => {
    try {
      const csvContent = generateCSV();
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `analise-tendencias-${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      showToast.success('Planilha exportada com sucesso!');
    } catch (error) {
      showToast.error('Erro ao exportar planilha');
    }
  };

  const copyToClipboard = async () => {
    try {
      const textContent = generateTextReport();
      await navigator.clipboard.writeText(textContent);
      showToast.success('Relatório copiado para a área de transferência!');
    } catch (error) {
      showToast.error('Erro ao copiar texto');
    }
  };

  const generateCSV = (): string => {
    const headers = ['Plataforma', 'Tipo', 'Título', 'Data', 'Curtidas', 'Comentários', 'Visualizações', 'Funil', 'Hashtags'];
    const rows = contentData.map(content => [
      content.platform,
      content.type,
      content.title,
      new Date(content.publishedAt).toLocaleDateString('pt-BR'),
      content.metrics.likes || 0,
      content.metrics.comments || 0,
      content.metrics.views || 0,
      content.funnelStage,
      content.hashtags.join('; ')
    ]);

    return [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
  };

  const generateTextReport = (): string => {
    return `
📊 RELATÓRIO DE ANÁLISE DE TENDÊNCIAS
Gerado em: ${new Date().toLocaleString('pt-BR')}

🎯 SUGESTÕES DE CONTEÚDO PARA A PRÓXIMA SEMANA:

${suggestions.map((suggestion, index) => `
${index + 1}. ${suggestion.title}
   Tipo: ${suggestion.type}
   Funil: ${suggestion.funnelStage}
   
   🎣 Hook: ${suggestion.hook}
   📝 Conteúdo: ${suggestion.content}
   🚀 CTA: ${suggestion.cta}
   ${suggestion.soundtrack ? `🎵 Trilha: ${suggestion.soundtrack}` : ''}
   
   Hashtags: ${suggestion.hashtags.join(' ')}
   Engajamento estimado: ${suggestion.estimatedEngagement}%
`).join('\n')}

📈 ANÁLISE DE PERFORMANCE:
${analysis ? `
Temas de melhor performance: ${analysis.topPerformingThemes.join(', ')}
Tipos de post mais eficazes: ${analysis.bestPostTypes.join(', ')}
Horários ideais: ${analysis.optimalPostTimes.join(', ')}

Métricas médias:
- Curtidas: ${analysis.engagementPatterns.avgLikes}
- Comentários: ${analysis.engagementPatterns.avgComments}  
- Visualizações: ${analysis.engagementPatterns.avgViews}

Distribuição por funil:
- Topo: ${analysis.funnelDistribution.topo}%
- Meio: ${analysis.funnelDistribution.meio}%
- Fundo: ${analysis.funnelDistribution.fundo}%
` : 'Dados de análise não disponíveis'}
    `.trim();
  };

  const getFunnelColor = (stage: string) => {
    switch (stage) {
      case 'TOPO': return 'bg-blue-100 text-blue-700';
      case 'MEIO': return 'bg-yellow-100 text-yellow-700';
      case 'FUNDO': return 'bg-green-100 text-green-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getPlatformIcon = (platform: string) => {
    return platform === 'instagram' ? Instagram : Youtube;
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <TrendingUp className="w-8 h-8 text-purple-600" />
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Análise de Tendências</h1>
              <p className="text-gray-600">
                Análise automática de performance e sugestões de conteúdo
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            <button
              onClick={exportToSpreadsheet}
              className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center space-x-2"
            >
              <Download className="w-4 h-4" />
              <span>Exportar</span>
            </button>
            
            <button
              onClick={copyToClipboard}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center space-x-2"
            >
              <Copy className="w-4 h-4" />
              <span>Copiar</span>
            </button>
            
            <button
              onClick={fetchTrendsData}
              disabled={loading}
              className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 disabled:opacity-50 flex items-center space-x-2"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              <span>Atualizar</span>
            </button>
          </div>
        </div>
        
        {lastUpdate && (
          <p className="text-sm text-gray-500 mt-2">
            Última atualização: {lastUpdate.toLocaleString('pt-BR')}
          </p>
        )}
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-8">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('analysis')}
            className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
              activeTab === 'analysis'
                ? 'border-purple-500 text-purple-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            <span>Análise de Performance</span>
          </button>
          
          <button
            onClick={() => setActiveTab('suggestions')}
            className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
              activeTab === 'suggestions'
                ? 'border-purple-500 text-purple-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Lightbulb className="w-4 h-4" />
            <span>Sugestões de Conteúdo</span>
          </button>
        </nav>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
        </div>
      ) : (
        <>
          {/* Analysis Tab */}
          {activeTab === 'analysis' && (
            <div className="space-y-6">
              {/* Summary Cards */}
              {analysis && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  <div className="bg-white rounded-lg border border-gray-200 p-6">
                    <div className="flex items-center">
                      <Target className="w-8 h-8 text-blue-600 mr-3" />
                      <div>
                        <p className="text-sm text-gray-600">Média de Curtidas</p>
                        <p className="text-2xl font-bold text-gray-900">
                          {formatNumber(analysis.engagementPatterns.avgLikes)}
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-white rounded-lg border border-gray-200 p-6">
                    <div className="flex items-center">
                      <Target className="w-8 h-8 text-green-600 mr-3" />
                      <div>
                        <p className="text-sm text-gray-600">Média de Comentários</p>
                        <p className="text-2xl font-bold text-gray-900">
                          {formatNumber(analysis.engagementPatterns.avgComments)}
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-white rounded-lg border border-gray-200 p-6">
                    <div className="flex items-center">
                      <Target className="w-8 h-8 text-purple-600 mr-3" />
                      <div>
                        <p className="text-sm text-gray-600">Média de Views</p>
                        <p className="text-2xl font-bold text-gray-900">
                          {formatNumber(analysis.engagementPatterns.avgViews)}
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-white rounded-lg border border-gray-200 p-6">
                    <div className="flex items-center">
                      <Target className="w-8 h-8 text-orange-600 mr-3" />
                      <div>
                        <p className="text-sm text-gray-600">Total de Posts</p>
                        <p className="text-2xl font-bold text-gray-900">{contentData.length}</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Content Performance */}
              <div className="bg-white rounded-lg border border-gray-200">
                <div className="p-6 border-b border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900">Performance dos Conteúdos</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Plataforma</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Título</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tipo</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Funil</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Curtidas</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Comentários</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Views</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Data</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {contentData.map((content) => {
                        const PlatformIcon = getPlatformIcon(content.platform);
                        return (
                          <tr key={content.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                <PlatformIcon className="w-5 h-5 text-gray-600 mr-2" />
                                <span className="capitalize">{content.platform}</span>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="text-sm font-medium text-gray-900 max-w-xs truncate">
                                {content.title}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {content.type}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`px-2 py-1 text-xs font-medium rounded-full ${getFunnelColor(content.funnelStage)}`}>
                                {content.funnelStage}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {formatNumber(content.metrics.likes || 0)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {formatNumber(content.metrics.comments || 0)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {formatNumber(content.metrics.views || 0)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {new Date(content.publishedAt).toLocaleDateString('pt-BR')}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Suggestions Tab */}
          {activeTab === 'suggestions' && (
            <div className="space-y-6">
              <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg p-6 border border-purple-200">
                <h3 className="text-lg font-semibold text-purple-900 mb-2">
                  🎯 Sugestões para a Próxima Semana
                </h3>
                <p className="text-purple-700">
                  Baseado na análise dos últimos conteúdos e tendências identificadas
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {suggestions.map((suggestion, index) => (
                  <div key={suggestion.id} className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <h4 className="text-lg font-semibold text-gray-900 mb-2">
                          {index + 1}. {suggestion.title}
                        </h4>
                        <div className="flex items-center space-x-3 mb-3">
                          <span className="bg-blue-100 text-blue-700 text-xs px-2 py-1 rounded">
                            {suggestion.type}
                          </span>
                          <span className={`text-xs px-2 py-1 rounded ${getFunnelColor(suggestion.funnelStage)}`}>
                            {suggestion.funnelStage}
                          </span>
                          <span className="text-xs text-gray-500">
                            ~{suggestion.estimatedEngagement}% engajamento
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <p className="text-sm font-medium text-gray-700">🎣 Hook:</p>
                        <p className="text-sm text-gray-600 bg-gray-50 p-2 rounded">
                          {suggestion.hook}
                        </p>
                      </div>

                      <div>
                        <p className="text-sm font-medium text-gray-700">📝 Conteúdo:</p>
                        <p className="text-sm text-gray-600 bg-gray-50 p-2 rounded">
                          {suggestion.content}
                        </p>
                      </div>

                      <div>
                        <p className="text-sm font-medium text-gray-700">🚀 CTA:</p>
                        <p className="text-sm text-gray-600 bg-gray-50 p-2 rounded">
                          {suggestion.cta}
                        </p>
                      </div>

                      {suggestion.soundtrack && (
                        <div>
                          <p className="text-sm font-medium text-gray-700">🎵 Trilha:</p>
                          <p className="text-sm text-gray-600 bg-gray-50 p-2 rounded">
                            {suggestion.soundtrack}
                          </p>
                        </div>
                      )}

                      <div>
                        <p className="text-sm font-medium text-gray-700">Hashtags:</p>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {suggestion.hashtags.map((tag, tagIndex) => (
                            <span key={tagIndex} className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded">
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {suggestions.length === 0 && !loading && (
                <div className="text-center py-12">
                  <Lightbulb className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    Nenhuma sugestão disponível
                  </h3>
                  <p className="text-gray-600">
                    Execute a análise para gerar sugestões de conteúdo
                  </p>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}