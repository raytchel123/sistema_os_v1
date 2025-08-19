import { useState, useEffect } from 'react';
import { Search, Filter, Download, Copy, RefreshCw, BarChart3, Target, Archive, TrendingUp, Eye, Repeat, Trash2, DollarSign, Plus, Calendar } from 'lucide-react';
import { showToast } from '../components/ui/Toast';
import { useNavigate } from 'react-router-dom';

interface ContentItem {
  id: string;
  platform: 'instagram' | 'youtube' | 'tiktok';
  type: string;
  title: string;
  caption: string;
  url: string;
  publishedAt: string;
  status: 'PUBLICADO' | 'GRAVADO';
  metrics: {
    reach?: number;
    likes: number;
    comments: number;
    views: number;
    clicks?: number;
    ctr?: number;
    shares?: number;
  };
  funcao: 'VENDA_DIRETA' | 'NUTRICAO' | 'AUTORIDADE';
  desempenho: 'ALTA' | 'MEDIA' | 'BAIXA';
  repostavel: boolean;
  acao_sugerida: 'MATAR' | 'REPOSTAR' | 'REGRAVAR' | 'TRAFEGO_PAGO';
  hashtags: string[];
  thumbnail?: string;
  prioridade: 'ALTA' | 'MEDIA' | 'BAIXA';
}

interface FunnelGaps {
  topo: {
    missing: string[];
    suggestions: string[];
    percentage: number;
  };
  meio: {
    missing: string[];
    suggestions: string[];
    percentage: number;
  };
  fundo: {
    missing: string[];
    suggestions: string[];
    percentage: number;
  };
}

interface AuditResults {
  inventory: ContentItem[];
  funnelGaps: FunnelGaps;
  recommendations: {
    repost: ContentItem[];
    rerecord: ContentItem[];
    paidTraffic: ContentItem[];
    kill: ContentItem[];
  };
  summary: {
    totalContent: number;
    highPerformance: number;
    reusableContent: number;
    funnelCoverage: {
      vendaDireta: number;
      nutricao: number;
      autoridade: number;
    };
    topPerformers: ContentItem[];
    strategicInsights: {
      bestHours: string[];
      topThemes: string[];
      avgEngagement: number;
      conversionRate: number;
    };
  };
}

export function AuditoriaConteudoPage() {
  const [auditResults, setAuditResults] = useState<AuditResults | null>(null);
  const [filteredItems, setFilteredItems] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    platform: '',
    funcao: '',
    desempenho: '',
    acao: '',
    periodo: '60',
    status: ''
  });
  const [activeTab, setActiveTab] = useState<'inventory' | 'gaps' | 'recommendations' | 'insights'>('inventory');
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const navigate = useNavigate();

  const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`;

  useEffect(() => {
    runContentAudit();
  }, []);

  useEffect(() => {
    filterItems();
  }, [auditResults, searchTerm, filters]);

  const runContentAudit = async () => {
    setLoading(true);
    const loadingToast = showToast.loading('🔍 Executando auditoria inteligente de conteúdo...');

    try {
      const { data: { session } } = await (await import('../lib/supabase')).supabase.auth.getSession();
      if (!session) {
        throw new Error('Usuário não autenticado');
      }

      const headers = {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      };

      const response = await fetch(`${apiUrl}/content-audit/analyze`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          days: parseInt(filters.periodo),
          includeUnpublished: true,
          includeMetrics: true
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro na auditoria');
      }

      const data = await response.json();
      setAuditResults(data);
      
      showToast.success('🎯 Auditoria concluída! Insights estratégicos gerados.');
    } catch (error) {
      console.error('Erro na auditoria:', error);
      showToast.error(`Erro: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
      
      // Fallback para dados mock
      setAuditResults(getMockAuditResults());
    } finally {
      showToast.dismiss(loadingToast);
      setLoading(false);
    }
  };

  const filterItems = () => {
    if (!auditResults) return;

    let filtered = auditResults.inventory;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(item => 
        item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.caption.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.hashtags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    // Apply filters
    if (filters.platform) {
      filtered = filtered.filter(item => item.platform === filters.platform);
    }
    if (filters.funcao) {
      filtered = filtered.filter(item => item.funcao === filters.funcao);
    }
    if (filters.desempenho) {
      filtered = filtered.filter(item => item.desempenho === filters.desempenho);
    }
    if (filters.acao) {
      filtered = filtered.filter(item => item.acao_sugerida === filters.acao);
    }
    if (filters.status) {
      filtered = filtered.filter(item => item.status === filters.status);
    }

    setFilteredItems(filtered);
  };

  const createOSFromContent = async (content: ContentItem[], action: 'REPOSTAR' | 'REGRAVAR') => {
    const loadingToast = showToast.loading(`Criando OS para ${action.toLowerCase()}...`);
    
    try {
      const { data: { session } } = await (await import('../lib/supabase')).supabase.auth.getSession();
      if (!session) return;

      const headers = {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      };

      for (const item of content) {
        const osData = {
          titulo: action === 'REPOSTAR' ? 
            `[REPOST] ${item.title}` : 
            `[REGRAVAR] ${item.title}`,
          descricao: `${action} baseado em conteúdo de alta performance.\n\nOriginal: ${item.caption}`,
          marca: 'CRISPIM', // Default
          objetivo: item.funcao === 'VENDA_DIRETA' ? 'CONVERSAO' : 
                   item.funcao === 'NUTRICAO' ? 'NUTRICAO' : 'ATRACAO',
          tipo: 'EDUCATIVO',
          status: action === 'REPOSTAR' ? 'AGENDAMENTO' : 'ROTEIRO',
          prioridade: item.prioridade,
          canais: [item.platform.toUpperCase()],
          gancho: `Hook baseado em: ${item.title}`,
          cta: item.funcao === 'VENDA_DIRETA' ? 'Link na bio!' : 'Salva esse post!',
          raw_media_links: [item.url],
          categorias_criativos: [item.type],
          responsaveis: {
            edicao: 'Vini',
            arte: 'Guto', 
            revisao: 'Crispim'
          }
        };

        const response = await fetch(`${apiUrl}/api/ordens`, {
          method: 'POST',
          headers,
          body: JSON.stringify(osData)
        });

        if (!response.ok) {
          throw new Error(`Erro ao criar OS para ${item.title}`);
        }
      }

      showToast.success(`${content.length} OS criadas com sucesso!`);
      navigate('/kanban');
    } catch (error) {
      showToast.error(`Erro ao criar OS: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    } finally {
      showToast.dismiss(loadingToast);
    }
  };

  const exportToCSV = () => {
    if (!auditResults) return;

    const headers = [
      'ID', 'Plataforma', 'Tipo', 'Título', 'Função', 'Desempenho', 'Repostável', 
      'Ação Sugerida', 'Prioridade', 'Curtidas', 'Comentários', 'Visualizações', 
      'CTR', 'Alcance', 'Data', 'URL', 'Status'
    ];

    const rows = auditResults.inventory.map(item => [
      item.id,
      item.platform.toUpperCase(),
      item.type,
      item.title,
      item.funcao.replace('_', ' '),
      item.desempenho,
      item.repostavel ? 'SIM' : 'NÃO',
      item.acao_sugerida.replace('_', ' '),
      item.prioridade,
      item.metrics.likes,
      item.metrics.comments,
      item.metrics.views,
      item.metrics.ctr ? `${(item.metrics.ctr * 100).toFixed(2)}%` : '-',
      item.metrics.reach || '-',
      new Date(item.publishedAt).toLocaleDateString('pt-BR'),
      item.url,
      item.status
    ]);

    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `auditoria-conteudo-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    showToast.success('📊 Planilha de auditoria exportada com sucesso!');
  };

  const copyStrategicReport = async () => {
    if (!auditResults) return;

    const report = generateStrategicReport(auditResults);
    
    try {
      await navigator.clipboard.writeText(report);
      showToast.success('📋 Relatório estratégico copiado para área de transferência!');
    } catch (error) {
      showToast.error('Erro ao copiar relatório');
    }
  };

  const generateStrategicReport = (results: AuditResults): string => {
    return `
🎯 AUDITORIA ESTRATÉGICA DE CONTEÚDO
Período: Últimos ${filters.periodo} dias | Gerado em: ${new Date().toLocaleString('pt-BR')}

📊 RESUMO EXECUTIVO:
• Total de conteúdos analisados: ${results.summary.totalContent}
• Conteúdos de alta performance: ${results.summary.highPerformance} (${Math.round((results.summary.highPerformance / results.summary.totalContent) * 100)}%)
• Conteúdos reutilizáveis: ${results.summary.reusableContent} (${Math.round((results.summary.reusableContent / results.summary.totalContent) * 100)}%)
• Taxa de engajamento média: ${results.summary.strategicInsights.avgEngagement.toFixed(2)}%
• Taxa de conversão: ${results.summary.strategicInsights.conversionRate.toFixed(2)}%

🎯 DISTRIBUIÇÃO DO FUNIL:
• Venda Direta (Fundo): ${results.summary.funnelCoverage.vendaDireta}%
• Nutrição (Meio): ${results.summary.funnelCoverage.nutricao}%
• Autoridade (Topo): ${results.summary.funnelCoverage.autoridade}%

🔥 TOP PERFORMERS (Para Tráfego Pago):
${results.summary.topPerformers.slice(0, 3).map((item, i) => 
  `${i + 1}. ${item.title} - ${item.platform.toUpperCase()} (${formatNumber(item.metrics.likes)} curtidas, ${formatNumber(item.metrics.views)} views)`
).join('\n')}

📈 INSIGHTS ESTRATÉGICOS:
• Melhores horários: ${results.summary.strategicInsights.bestHours.join(', ')}
• Temas de alta performance: ${results.summary.strategicInsights.topThemes.join(', ')}

🔄 AÇÕES RECOMENDADAS:

📌 REPOSTAR IMEDIATAMENTE (${results.recommendations.repost.length} itens):
${results.recommendations.repost.slice(0, 5).map(item => 
  `• ${item.title} - ${item.platform.toUpperCase()} | ${formatNumber(item.metrics.likes)} curtidas | Trocar gancho e repostar`
).join('\n')}

🎬 REGRAVAR COM PRIORIDADE (${results.recommendations.rerecord.length} itens):
${results.recommendations.rerecord.slice(0, 5).map(item => 
  `• ${item.title} - Boa ideia, melhorar execução | ${item.desempenho} performance`
).join('\n')}

💰 IMPULSIONAR COM TRÁFEGO PAGO (${results.recommendations.paidTraffic.length} itens):
${results.recommendations.paidTraffic.slice(0, 3).map(item => 
  `• ${item.title} - ROI estimado: Alto | Engajamento: ${formatNumber(item.metrics.likes + item.metrics.comments)}`
).join('\n')}

🕳️ LACUNAS CRÍTICAS NO FUNIL:

TOPO - AUTORIDADE (${results.funnelGaps.topo.percentage}% da meta):
${results.funnelGaps.topo.missing.map(gap => `• FALTA: ${gap}`).join('\n')}
CRIAR: ${results.funnelGaps.topo.suggestions.slice(0, 3).join(' | ')}

MEIO - NUTRIÇÃO (${results.funnelGaps.meio.percentage}% da meta):
${results.funnelGaps.meio.missing.map(gap => `• FALTA: ${gap}`).join('\n')}
CRIAR: ${results.funnelGaps.meio.suggestions.slice(0, 3).join(' | ')}

FUNDO - CONVERSÃO (${results.funnelGaps.fundo.percentage}% da meta):
${results.funnelGaps.fundo.missing.map(gap => `• FALTA: ${gap}`).join('\n')}
CRIAR: ${results.funnelGaps.fundo.suggestions.slice(0, 3).join(' | ')}

🎯 PRÓXIMOS PASSOS:
1. Criar ${results.recommendations.repost.length} OS de repostagem (alta prioridade)
2. Agendar ${results.recommendations.rerecord.length} regravações
3. Configurar ${results.recommendations.paidTraffic.length} campanhas pagas
4. Produzir conteúdo para preencher lacunas do funil
5. Monitorar performance dos novos conteúdos

---
Relatório gerado pelo Sistema de Inteligência de Conteúdo
    `.trim();
  };

  const handleBulkAction = async (action: 'REPOSTAR' | 'REGRAVAR' | 'TRAFEGO_PAGO') => {
    if (selectedItems.length === 0) {
      showToast.warning('Selecione pelo menos um item para executar a ação');
      return;
    }

    const selectedContent = auditResults?.inventory.filter(item => 
      selectedItems.includes(item.id)
    ) || [];

    if (action === 'REPOSTAR' || action === 'REGRAVAR') {
      await createOSFromContent(selectedContent, action);
    } else if (action === 'TRAFEGO_PAGO') {
      showToast.info('🚀 Funcionalidade de tráfego pago será implementada em breve');
    }

    setSelectedItems([]);
  };

  const toggleItemSelection = (itemId: string) => {
    setSelectedItems(prev => 
      prev.includes(itemId) 
        ? prev.filter(id => id !== itemId)
        : [...prev, itemId]
    );
  };

  const toggleSelection = (itemId: string) => {
    setSelectedItems(prev => 
      prev.includes(itemId) 
        ? prev.filter(id => id !== itemId)
        : [...prev, itemId]
    );
  };

  const selectAllFiltered = () => {
    const allIds = filteredItems.map(item => item.id);
    setSelectedItems(prev => 
      prev.length === allIds.length ? [] : allIds
    );
  };

  const getFuncaoColor = (funcao: string) => {
    switch (funcao) {
      case 'VENDA_DIRETA': return 'bg-green-100 text-green-700 border-green-200';
      case 'NUTRICAO': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'AUTORIDADE': return 'bg-purple-100 text-purple-700 border-purple-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getDesempenhoColor = (desempenho: string) => {
    switch (desempenho) {
      case 'ALTA': return 'bg-green-100 text-green-700 border-green-200';
      case 'MEDIA': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'BAIXA': return 'bg-red-100 text-red-700 border-red-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getAcaoIcon = (acao: string) => {
    switch (acao) {
      case 'REPOSTAR': return <Repeat className="w-4 h-4" />;
      case 'REGRAVAR': return <RefreshCw className="w-4 h-4" />;
      case 'TRAFEGO_PAGO': return <DollarSign className="w-4 h-4" />;
      case 'MATAR': return <Trash2 className="w-4 h-4" />;
      default: return <Eye className="w-4 h-4" />;
    }
  };

  const getAcaoColor = (acao: string) => {
    switch (acao) {
      case 'REPOSTAR': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'REGRAVAR': return 'bg-orange-100 text-orange-700 border-orange-200';
      case 'TRAFEGO_PAGO': return 'bg-green-100 text-green-700 border-green-200';
      case 'MATAR': return 'bg-red-100 text-red-700 border-red-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getPrioridadeIcon = (prioridade: string) => {
    switch (prioridade) {
      case 'ALTA': return '🔥';
      case 'MEDIA': return '⚠️';
      case 'BAIXA': return '✅';
      default: return '📝';
    }
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const getMockAuditResults = (): AuditResults => {
    const mockContent: ContentItem[] = [
      {
        id: 'ig-001',
        platform: 'instagram',
        type: 'REEL',
        title: 'Como escolher o vestido perfeito para noivado',
        caption: 'Dicas essenciais para noivas! Swipe para ver mais ➡️ #noivado #vestido #casamento #noiva',
        url: 'https://instagram.com/p/mock1',
        publishedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        status: 'PUBLICADO',
        metrics: { reach: 20000, likes: 2450, comments: 189, views: 15600, ctr: 0.12, shares: 45 },
        funcao: 'AUTORIDADE',
        desempenho: 'ALTA',
        repostavel: true,
        acao_sugerida: 'REPOSTAR',
        hashtags: ['#noivado', '#vestido', '#casamento', '#noiva'],
        prioridade: 'ALTA'
      },
      {
        id: 'yt-001',
        platform: 'youtube',
        type: 'VIDEO',
        title: 'Transformação completa: Antes e depois do tratamento facial',
        caption: 'Veja a incrível transformação da nossa cliente Maria após 3 meses de tratamento',
        url: 'https://youtube.com/watch?v=mock1',
        publishedAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
        status: 'PUBLICADO',
        metrics: { likes: 890, comments: 156, views: 12400, ctr: 0.072 },
        funcao: 'NUTRICAO',
        desempenho: 'ALTA',
        repostavel: true,
        acao_sugerida: 'TRAFEGO_PAGO',
        hashtags: ['#transformacao', '#antesedepois', '#resultado'],
        prioridade: 'ALTA'
      },
      {
        id: 'ig-002',
        platform: 'instagram',
        type: 'CARROSSEL',
        title: 'Promoção especial: 50% OFF em todos os tratamentos',
        caption: 'Últimas vagas! Link na bio para garantir',
        url: 'https://instagram.com/p/mock2',
        publishedAt: new Date(Date.now() - 21 * 24 * 60 * 60 * 1000).toISOString(),
        status: 'PUBLICADO',
        metrics: { reach: 8500, likes: 456, comments: 23, views: 3200, ctr: 0.08 },
        funcao: 'VENDA_DIRETA',
        desempenho: 'MEDIA',
        repostavel: false,
        acao_sugerida: 'REGRAVAR',
        hashtags: ['#promocao', '#desconto', '#tratamento'],
        prioridade: 'MEDIA'
      },
      {
        id: 'tt-001',
        platform: 'tiktok',
        type: 'VIDEO',
        title: 'Dica rápida: Cuidados com a pele no inverno',
        caption: 'Inverno chegando! Proteja sua pele ❄️',
        url: 'https://tiktok.com/@mock/video/123',
        publishedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
        status: 'PUBLICADO',
        metrics: { likes: 1200, comments: 67, views: 8900, shares: 234 },
        funcao: 'AUTORIDADE',
        desempenho: 'ALTA',
        repostavel: true,
        acao_sugerida: 'REPOSTAR',
        hashtags: ['#skincare', '#inverno', '#cuidados'],
        prioridade: 'MEDIA'
      }
    ];

    return {
      inventory: mockContent,
      funnelGaps: {
        topo: {
          missing: ['Conteúdo educativo sobre cuidados básicos', 'Mitos vs verdades sobre procedimentos'],
          suggestions: ['Tutorial: Rotina de cuidados diários', 'Desmistificando procedimentos estéticos', 'Guia completo para iniciantes'],
          percentage: 65
        },
        meio: {
          missing: ['Comparação de tratamentos', 'Depoimentos detalhados de clientes'],
          suggestions: ['Comparativo: Laser vs IPL', 'Case completo: Jornada da cliente', 'Antes e depois: 6 meses de tratamento'],
          percentage: 45
        },
        fundo: {
          missing: ['Urgência em promoções', 'Prova social forte', 'Ofertas limitadas'],
          suggestions: ['Últimas vagas: Promoção de verão', 'Resultados reais: 100 clientes transformadas', 'Oferta especial: Apenas 48h'],
          percentage: 30
        }
      },
      recommendations: {
        repost: mockContent.filter(c => c.acao_sugerida === 'REPOSTAR'),
        rerecord: mockContent.filter(c => c.acao_sugerida === 'REGRAVAR'),
        paidTraffic: mockContent.filter(c => c.acao_sugerida === 'TRAFEGO_PAGO'),
        kill: mockContent.filter(c => c.acao_sugerida === 'MATAR')
      },
      summary: {
        totalContent: mockContent.length,
        highPerformance: mockContent.filter(c => c.desempenho === 'ALTA').length,
        reusableContent: mockContent.filter(c => c.repostavel).length,
        funnelCoverage: {
          vendaDireta: 25,
          nutricao: 25,
          autoridade: 50
        },
        topPerformers: mockContent.filter(c => c.desempenho === 'ALTA').slice(0, 3),
        strategicInsights: {
          bestHours: ['11:00', '15:00', '19:00'],
          topThemes: ['noivado', 'transformacao', 'cuidados', 'dicas'],
          avgEngagement: 8.5,
          conversionRate: 3.2
        }
      }
    };
  };

  const tabs = [
    { id: 'inventory', label: 'Inventário', icon: Archive, description: 'Todos os conteúdos analisados' },
    { id: 'gaps', label: 'Lacunas do Funil', icon: Target, description: 'Buracos estratégicos identificados' },
    { id: 'recommendations', label: 'Recomendações', icon: TrendingUp, description: 'Ações sugeridas por categoria' },
    { id: 'insights', label: 'Insights', icon: BarChart3, description: 'Análise estratégica e padrões' },
  ];

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <BarChart3 className="w-8 h-8 text-indigo-600" />
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Inteligência de Conteúdo</h1>
              <p className="text-gray-600">
                Auditoria estratégica • Análise de funil • Reaproveitamento inteligente
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            <select
              value={filters.periodo}
              onChange={(e) => setFilters(prev => ({ ...prev, periodo: e.target.value }))}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-600"
            >
              <option value="30">Últimos 30 dias</option>
              <option value="60">Últimos 60 dias</option>
              <option value="90">Últimos 90 dias</option>
            </select>
            
            <button
              onClick={exportToCSV}
              disabled={!auditResults}
              className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center space-x-2"
            >
              <Download className="w-4 h-4" />
              <span>Exportar</span>
            </button>
            
            <button
              onClick={copyStrategicReport}
              disabled={!auditResults}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center space-x-2"
            >
              <Copy className="w-4 h-4" />
              <span>Relatório</span>
            </button>
            
            <button
              onClick={runContentAudit}
              disabled={loading}
              className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center space-x-2"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              <span>Executar Auditoria</span>
            </button>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      {auditResults && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center">
              <Archive className="w-6 h-6 text-blue-600 mr-2" />
              <div>
                <p className="text-xs text-gray-600">Total</p>
                <p className="text-2xl font-bold text-gray-900">{auditResults.summary.totalContent}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center">
              <TrendingUp className="w-6 h-6 text-green-600 mr-2" />
              <div>
                <p className="text-xs text-gray-600">Alta Performance</p>
                <p className="text-2xl font-bold text-green-600">{auditResults.summary.highPerformance}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center">
              <Repeat className="w-6 h-6 text-purple-600 mr-2" />
              <div>
                <p className="text-xs text-gray-600">Reutilizáveis</p>
                <p className="text-2xl font-bold text-purple-600">{auditResults.summary.reusableContent}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center">
              <Target className="w-6 h-6 text-orange-600 mr-2" />
              <div>
                <p className="text-xs text-gray-600">Engajamento</p>
                <p className="text-2xl font-bold text-orange-600">
                  {auditResults.summary.strategicInsights.avgEngagement.toFixed(1)}%
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center">
              <DollarSign className="w-6 h-6 text-emerald-600 mr-2" />
              <div>
                <p className="text-xs text-gray-600">Conversão</p>
                <p className="text-2xl font-bold text-emerald-600">
                  {auditResults.summary.strategicInsights.conversionRate.toFixed(1)}%
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Actions */}
      {selectedItems.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex items-center justify-between">
            <span className="text-blue-800 font-medium">
              {selectedItems.length} item(s) selecionado(s)
            </span>
            <div className="flex space-x-2">
              <button
                onClick={() => handleBulkAction('REPOSTAR')}
                className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700 flex items-center"
              >
                <Repeat className="w-3 h-3 mr-1" />
                Criar OS Repost
              </button>
              <button
                onClick={() => handleBulkAction('REGRAVAR')}
                className="bg-orange-600 text-white px-3 py-1 rounded text-sm hover:bg-orange-700 flex items-center"
              >
                <RefreshCw className="w-3 h-3 mr-1" />
                Criar OS Regravação
              </button>
              <button
                onClick={() => handleBulkAction('TRAFEGO_PAGO')}
                className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700 flex items-center"
              >
                <DollarSign className="w-3 h-3 mr-1" />
                Tráfego Pago
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-8">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                activeTab === tab.id
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
              title={tab.description}
            >
              <tab.icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          ))}
        </nav>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Analisando conteúdos e identificando oportunidades...</p>
          </div>
        </div>
      ) : (
        <>
          {/* Inventory Tab */}
          {activeTab === 'inventory' && auditResults && (
            <div className="space-y-6">
              {/* Filters */}
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input
                      type="text"
                      placeholder="Buscar por título, legenda ou hashtag..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-600 focus:border-transparent"
                    />
                  </div>
                  
                  <div className="flex gap-3">
                    <select
                      value={filters.platform}
                      onChange={(e) => setFilters(prev => ({ ...prev, platform: e.target.value }))}
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-600"
                    >
                      <option value="">Todas as plataformas</option>
                      <option value="instagram">Instagram</option>
                      <option value="youtube">YouTube</option>
                      <option value="tiktok">TikTok</option>
                    </select>

                    <select
                      value={filters.funcao}
                      onChange={(e) => setFilters(prev => ({ ...prev, funcao: e.target.value }))}
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-600"
                    >
                      <option value="">Todas as funções</option>
                      <option value="VENDA_DIRETA">Venda Direta</option>
                      <option value="NUTRICAO">Nutrição</option>
                      <option value="AUTORIDADE">Autoridade</option>
                    </select>

                    <select
                      value={filters.acao}
                      onChange={(e) => setFilters(prev => ({ ...prev, acao: e.target.value }))}
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-600"
                    >
                      <option value="">Todas as ações</option>
                      <option value="REPOSTAR">Repostar</option>
                      <option value="REGRAVAR">Regravar</option>
                      <option value="TRAFEGO_PAGO">Tráfego Pago</option>
                      <option value="MATAR">Matar</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Content Table */}
              <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                <div className="p-4 border-b border-gray-200 bg-gray-50">
                  <div className="flex items-center justify-between">
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={selectedItems.length === filteredItems.length && filteredItems.length > 0}
                        onChange={selectAllFiltered}
                        className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
                      />
                      <span className="text-sm font-medium text-gray-700">
                        Selecionar todos ({filteredItems.length})
                      </span>
                    </label>
                    <span className="text-sm text-gray-500">
                      {selectedItems.length} selecionado(s)
                    </span>
                  </div>
                </div>
                
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Seleção</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Conteúdo</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Função</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Desempenho</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Métricas</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ação Sugerida</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Data</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {filteredItems.map((item) => (
                        <tr key={item.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4">
                            <input
                              type="checkbox"
                              checked={selectedItems.includes(item.id)}
                              onChange={() => toggleItemSelection(item.id)}
                              className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
                            />
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-start space-x-3">
                              <div className="w-12 h-12 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-lg flex items-center justify-center">
                                <span className="text-lg">
                                  {item.platform === 'instagram' ? '📱' : 
                                   item.platform === 'youtube' ? '▶️' : 
                                   item.platform === 'tiktok' ? '🎵' : '🔗'}
                                </span>
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-900 line-clamp-2">
                                  {getPrioridadeIcon(item.prioridade)} {item.title}
                                </p>
                                <p className="text-xs text-gray-500 mt-1">
                                  {item.type} • {item.platform.toUpperCase()}
                                </p>
                                <div className="flex items-center mt-2 space-x-2">
                                  {item.repostavel && (
                                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                      ✓ Repostável
                                    </span>
                                  )}
                                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                    item.status === 'PUBLICADO' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'
                                  }`}>
                                    {item.status}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getFuncaoColor(item.funcao)}`}>
                              {item.funcao.replace('_', ' ')}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getDesempenhoColor(item.desempenho)}`}>
                              {item.desempenho}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-xs space-y-1">
                              <div className="flex items-center justify-between">
                                <span className="text-gray-600">👍</span>
                                <span className="font-medium">{formatNumber(item.metrics.likes)}</span>
                              </div>
                              <div className="flex items-center justify-between">
                                <span className="text-gray-600">💬</span>
                                <span className="font-medium">{formatNumber(item.metrics.comments)}</span>
                              </div>
                              <div className="flex items-center justify-between">
                                <span className="text-gray-600">👁️</span>
                                <span className="font-medium">{formatNumber(item.metrics.views)}</span>
                              </div>
                              {item.metrics.ctr && (
                                <div className="flex items-center justify-between">
                                  <span className="text-gray-600">CTR</span>
                                  <span className="font-medium">{(item.metrics.ctr * 100).toFixed(1)}%</span>
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getAcaoColor(item.acao_sugerida)}`}>
                              {getAcaoIcon(item.acao_sugerida)}
                              <span className="ml-1">{item.acao_sugerida.replace('_', ' ')}</span>
                            </span>
                          </td>
                          <td className="px-6 py-4 text-xs text-gray-500">
                            {new Date(item.publishedAt).toLocaleDateString('pt-BR')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Gaps Tab */}
          {activeTab === 'gaps' && auditResults && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Topo do Funil */}
                <div className="bg-white rounded-lg border border-purple-200 p-6">
                  <h3 className="text-lg font-semibold text-purple-900 mb-4 flex items-center">
                    <Target className="w-5 h-5 mr-2" />
                    Topo - Autoridade
                    <span className="ml-2 text-sm bg-purple-100 text-purple-700 px-2 py-1 rounded">
                      {auditResults.funnelGaps.topo.percentage}%
                    </span>
                  </h3>
                  
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-medium text-red-700 mb-2 flex items-center">
                        🕳️ Lacunas Críticas:
                      </h4>
                      <ul className="space-y-2">
                        {auditResults.funnelGaps.topo.missing.map((gap, index) => (
                          <li key={index} className="text-sm text-gray-600 flex items-start">
                            <span className="w-2 h-2 bg-red-400 rounded-full mt-2 mr-2 flex-shrink-0"></span>
                            {gap}
                          </li>
                        ))}
                      </ul>
                    </div>
                    
                    <div>
                      <h4 className="font-medium text-green-700 mb-2 flex items-center">
                        💡 Criar Urgente:
                      </h4>
                      <ul className="space-y-2">
                        {auditResults.funnelGaps.topo.suggestions.map((suggestion, index) => (
                          <li key={index} className="text-sm text-gray-600 flex items-start">
                            <span className="w-2 h-2 bg-green-400 rounded-full mt-2 mr-2 flex-shrink-0"></span>
                            {suggestion}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Meio do Funil */}
                <div className="bg-white rounded-lg border border-blue-200 p-6">
                  <h3 className="text-lg font-semibold text-blue-900 mb-4 flex items-center">
                    <Target className="w-5 h-5 mr-2" />
                    Meio - Nutrição
                    <span className="ml-2 text-sm bg-blue-100 text-blue-700 px-2 py-1 rounded">
                      {auditResults.funnelGaps.meio.percentage}%
                    </span>
                  </h3>
                  
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-medium text-red-700 mb-2">🕳️ Lacunas Críticas:</h4>
                      <ul className="space-y-2">
                        {auditResults.funnelGaps.meio.missing.map((gap, index) => (
                          <li key={index} className="text-sm text-gray-600 flex items-start">
                            <span className="w-2 h-2 bg-red-400 rounded-full mt-2 mr-2 flex-shrink-0"></span>
                            {gap}
                          </li>
                        ))}
                      </ul>
                    </div>
                    
                    <div>
                      <h4 className="font-medium text-green-700 mb-2">💡 Criar Urgente:</h4>
                      <ul className="space-y-2">
                        {auditResults.funnelGaps.meio.suggestions.map((suggestion, index) => (
                          <li key={index} className="text-sm text-gray-600 flex items-start">
                            <span className="w-2 h-2 bg-green-400 rounded-full mt-2 mr-2 flex-shrink-0"></span>
                            {suggestion}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Fundo do Funil */}
                <div className="bg-white rounded-lg border border-green-200 p-6">
                  <h3 className="text-lg font-semibold text-green-900 mb-4 flex items-center">
                    <Target className="w-5 h-5 mr-2" />
                    Fundo - Conversão
                    <span className="ml-2 text-sm bg-green-100 text-green-700 px-2 py-1 rounded">
                      {auditResults.funnelGaps.fundo.percentage}%
                    </span>
                  </h3>
                  
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-medium text-red-700 mb-2">🕳️ Lacunas Críticas:</h4>
                      <ul className="space-y-2">
                        {auditResults.funnelGaps.fundo.missing.map((gap, index) => (
                          <li key={index} className="text-sm text-gray-600 flex items-start">
                            <span className="w-2 h-2 bg-red-400 rounded-full mt-2 mr-2 flex-shrink-0"></span>
                            {gap}
                          </li>
                        ))}
                      </ul>
                    </div>
                    
                    <div>
                      <h4 className="font-medium text-green-700 mb-2">💡 Criar Urgente:</h4>
                      <ul className="space-y-2">
                        {auditResults.funnelGaps.fundo.suggestions.map((suggestion, index) => (
                          <li key={index} className="text-sm text-gray-600 flex items-start">
                            <span className="w-2 h-2 bg-green-400 rounded-full mt-2 mr-2 flex-shrink-0"></span>
                            {suggestion}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              </div>

              {/* Funnel Coverage Visualization */}
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-6">📊 Cobertura Estratégica do Funil</h3>
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">Venda Direta (Meta: 20%)</span>
                    <span className="text-sm text-gray-600">{auditResults.summary.funnelCoverage.vendaDireta}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div 
                      className={`h-3 rounded-full transition-all duration-500 ${
                        auditResults.summary.funnelCoverage.vendaDireta >= 20 ? 'bg-green-600' : 'bg-red-500'
                      }`}
                      style={{ width: `${Math.min(auditResults.summary.funnelCoverage.vendaDireta, 100)}%` }}
                    ></div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">Nutrição (Meta: 40%)</span>
                    <span className="text-sm text-gray-600">{auditResults.summary.funnelCoverage.nutricao}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div 
                      className={`h-3 rounded-full transition-all duration-500 ${
                        auditResults.summary.funnelCoverage.nutricao >= 40 ? 'bg-blue-600' : 'bg-yellow-500'
                      }`}
                      style={{ width: `${Math.min(auditResults.summary.funnelCoverage.nutricao, 100)}%` }}
                    ></div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">Autoridade (Meta: 40%)</span>
                    <span className="text-sm text-gray-600">{auditResults.summary.funnelCoverage.autoridade}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div 
                      className={`h-3 rounded-full transition-all duration-500 ${
                        auditResults.summary.funnelCoverage.autoridade >= 40 ? 'bg-purple-600' : 'bg-orange-500'
                      }`}
                      style={{ width: `${Math.min(auditResults.summary.funnelCoverage.autoridade, 100)}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Recommendations Tab */}
          {activeTab === 'recommendations' && auditResults && (
            <div className="space-y-6">
              {/* Quick Actions */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <button
                  onClick={() => createOSFromContent(auditResults.recommendations.repost, 'REPOSTAR')}
                  className="bg-blue-600 text-white p-4 rounded-lg hover:bg-blue-700 transition-colors text-left"
                >
                  <div className="flex items-center justify-between mb-2">
                    <Repeat className="w-6 h-6" />
                    <span className="text-2xl font-bold">{auditResults.recommendations.repost.length}</span>
                  </div>
                  <div className="text-sm">Criar OS Repost</div>
                </button>

                <button
                  onClick={() => createOSFromContent(auditResults.recommendations.rerecord, 'REGRAVAR')}
                  className="bg-orange-600 text-white p-4 rounded-lg hover:bg-orange-700 transition-colors text-left"
                >
                  <div className="flex items-center justify-between mb-2">
                    <RefreshCw className="w-6 h-6" />
                    <span className="text-2xl font-bold">{auditResults.recommendations.rerecord.length}</span>
                  </div>
                  <div className="text-sm">Criar OS Regravação</div>
                </button>

                <div className="bg-green-600 text-white p-4 rounded-lg text-left">
                  <div className="flex items-center justify-between mb-2">
                    <DollarSign className="w-6 h-6" />
                    <span className="text-2xl font-bold">{auditResults.recommendations.paidTraffic.length}</span>
                  </div>
                  <div className="text-sm">Para Tráfego Pago</div>
                </div>

                <div className="bg-red-600 text-white p-4 rounded-lg text-left">
                  <div className="flex items-center justify-between mb-2">
                    <Trash2 className="w-6 h-6" />
                    <span className="text-2xl font-bold">{auditResults.recommendations.kill.length}</span>
                  </div>
                  <div className="text-sm">Matar (Não reaproveitar)</div>
                </div>
              </div>

              {/* Detailed Recommendations */}
              {auditResults.recommendations.repost.length > 0 && (
                <div className="bg-white rounded-lg border border-blue-200 p-6">
                  <h3 className="text-lg font-semibold text-blue-900 mb-4 flex items-center">
                    <Repeat className="w-5 h-5 mr-2" />
                    🔥 Repostar Imediatamente ({auditResults.recommendations.repost.length})
                  </h3>
                  <p className="text-blue-700 mb-4">Conteúdos de alta performance - apenas alterar gancho/legenda</p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {auditResults.recommendations.repost.map((item) => (
                      <div key={item.id} className="border border-blue-200 rounded-lg p-4 bg-blue-50">
                        <h4 className="font-medium text-gray-900 mb-2">{item.title}</h4>
                        <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
                          <span>{item.platform.toUpperCase()}</span>
                          <span>{formatNumber(item.metrics.likes)} curtidas</span>
                        </div>
                        <div className="flex items-center justify-between text-sm mb-2">
                          <span className={`px-2 py-1 rounded text-xs ${getFuncaoColor(item.funcao)}`}>
                            {item.funcao.replace('_', ' ')}
                          </span>
                          <span className="text-blue-600 font-medium">
                            CTR: {item.metrics.ctr ? `${(item.metrics.ctr * 100).toFixed(1)}%` : 'N/A'}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {item.hashtags.slice(0, 3).map((tag, index) => (
                            <span key={index} className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Other recommendation sections... */}
              {auditResults.recommendations.paidTraffic.length > 0 && (
                <div className="bg-white rounded-lg border border-green-200 p-6">
                  <h3 className="text-lg font-semibold text-green-900 mb-4 flex items-center">
                    <DollarSign className="w-5 h-5 mr-2" />
                    💰 Impulsionar com Tráfego Pago ({auditResults.recommendations.paidTraffic.length})
                  </h3>
                  <p className="text-green-700 mb-4">Conteúdos provados no orgânico - ROI garantido</p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {auditResults.recommendations.paidTraffic.map((item) => (
                      <div key={item.id} className="border border-green-200 rounded-lg p-4 bg-green-50">
                        <h4 className="font-medium text-gray-900 mb-2">{item.title}</h4>
                        <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
                          <span>{item.platform.toUpperCase()}</span>
                          <span>{formatNumber(item.metrics.views)} views</span>
                        </div>
                        <div className="text-xs text-green-700 space-y-1">
                          <div>💰 ROI estimado: Alto</div>
                          <div>🎯 Público engajado: {formatNumber(item.metrics.likes + item.metrics.comments)}</div>
                          <div>✅ Conversão provada no orgânico</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Insights Tab */}
          {activeTab === 'insights' && auditResults && (
            <div className="space-y-6">
              {/* Top Performers */}
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <TrendingUp className="w-5 h-5 mr-2 text-yellow-600" />
                  🏆 Top Performers (Benchmarks)
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {auditResults.summary.topPerformers.map((item, index) => (
                    <div key={item.id} className="border border-yellow-200 rounded-lg p-4 bg-yellow-50">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-2xl">🥇</span>
                        <span className="text-xs bg-yellow-200 text-yellow-800 px-2 py-1 rounded">
                          #{index + 1}
                        </span>
                      </div>
                      <h4 className="font-medium text-gray-900 mb-2 line-clamp-2">{item.title}</h4>
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Curtidas:</span>
                          <span className="font-medium">{formatNumber(item.metrics.likes)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Comentários:</span>
                          <span className="font-medium">{formatNumber(item.metrics.comments)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Views:</span>
                          <span className="font-medium">{formatNumber(item.metrics.views)}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Strategic Insights */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">⏰ Melhores Horários</h3>
                  <div className="space-y-3">
                    {auditResults.summary.strategicInsights.bestHours.map((hour, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                        <span className="font-medium text-blue-900">{hour}</span>
                        <span className="text-sm text-blue-600">Alta performance</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-white rounded-lg border border-gray-200 p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">🎯 Temas de Sucesso</h3>
                  <div className="space-y-2">
                    {auditResults.summary.strategicInsights.topThemes.map((theme, index) => (
                      <div key={index} className="flex items-center justify-between p-2 bg-purple-50 rounded">
                        <span className="font-medium text-purple-900">#{theme}</span>
                        <span className="text-xs text-purple-600">Trending</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {!auditResults && !loading && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12">
          <div className="text-center">
            <BarChart3 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              Sistema de Inteligência de Conteúdo
            </h3>
            <p className="text-gray-600 mb-6">
              Execute a auditoria para analisar conteúdos, identificar lacunas do funil e gerar recomendações estratégicas
            </p>
            <button
              onClick={runContentAudit}
              className="bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 flex items-center mx-auto"
            >
              <BarChart3 className="w-5 h-5 mr-2" />
              Executar Primeira Auditoria
            </button>
          </div>
        </div>
      )}
    </div>
  );
}