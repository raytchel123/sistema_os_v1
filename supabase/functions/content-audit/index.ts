import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, idempotency-key',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
};

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

class ContentIntelligenceSystem {
  private instagramPageId: string;
  private youtubeChannelId: string;
  private tiktokUsername: string;
  private instagramToken: string;
  private youtubeToken: string;
  private tiktokToken: string;
  private supabase: any;

  constructor(supabaseClient: any) {
    // IDs das contas oficiais
    this.instagramPageId = '40666405722';
    this.youtubeChannelId = 'UCzyua2fR6hfgBNWlygaSBw';
    this.tiktokUsername = 'crispim.neto'; // Placeholder
    
    // Tokens de API
    this.instagramToken = Deno.env.get('INSTAGRAM_ACCESS_TOKEN') || '';
    this.youtubeToken = Deno.env.get('YOUTUBE_API_KEY') || '';
    this.tiktokToken = Deno.env.get('TIKTOK_ACCESS_TOKEN') || '';
    
    this.supabase = supabaseClient;
  }

  async runFullAudit(days: number = 60): Promise<AuditResults> {
    console.log(`🎯 Iniciando Inteligência de Conteúdo (${days} dias)...`);

    try {
      // 1. CAPTAÇÃO DE DADOS - Coletar de todas as plataformas
      const [instagramContent, youtubeContent, tiktokContent] = await Promise.all([
        this.captureInstagramContent(days),
        this.captureYouTubeContent(days),
        this.captureTikTokContent(days)
      ]);
      
      // 2. Buscar conteúdos gravados mas não postados (do banco)
      const recordedContent = await this.captureRecordedContent();
      
      // 3. CLASSIFICAÇÃO - Normalizar e classificar todo o inventário
      const allContent = [
        ...this.normalizeInstagramContent(instagramContent, 'PUBLICADO'),
        ...this.normalizeYouTubeContent(youtubeContent, 'PUBLICADO'),
        ...this.normalizeTikTokContent(tiktokContent, 'PUBLICADO'),
        ...recordedContent
      ];
      
      const classifiedContent = this.classifyAndPrioritizeContent(allContent);
      
      // 4. ANÁLISE DE FUNIL - Identificar lacunas estratégicas
      const funnelGaps = this.analyzeFunnelGaps(classifiedContent);
      
      // 5. RECOMENDAÇÕES - Gerar ações específicas
      const recommendations = this.generateStrategicRecommendations(classifiedContent);
      
      // 6. INSIGHTS - Calcular métricas estratégicas
      const summary = this.calculateStrategicSummary(classifiedContent);

      console.log(`✅ Auditoria concluída: ${allContent.length} conteúdos analisados`);
      console.log(`📊 Insights: ${summary.highPerformance} alta performance, ${summary.reusableContent} reutilizáveis`);

      return {
        inventory: classifiedContent,
        funnelGaps,
        recommendations,
        summary
      };
    } catch (error) {
      console.error('❌ Erro na auditoria:', error);
      return this.getMockAuditResults();
    }
  }

  // CAPTAÇÃO DE DADOS
  private async captureInstagramContent(days: number): Promise<any[]> {
    if (!this.instagramToken) {
      console.log('⚠️ Instagram token não configurado, usando mock');
      return this.getMockInstagramData();
    }

    try {
      const since = new Date();
      since.setDate(since.getDate() - days);
      
      const url = `https://graph.facebook.com/v18.0/${this.instagramPageId}/media?fields=id,media_type,caption,timestamp,like_count,comments_count,permalink,insights.metric(reach,impressions,video_views,profile_visits)&limit=50&access_token=${this.instagramToken}`;
      
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Instagram API error: ${response.status}`);
      }

      const data = await response.json();
      return (data.data || []).filter((item: any) => 
        new Date(item.timestamp) >= since
      );
    } catch (error) {
      console.error('Erro Instagram API:', error);
      return this.getMockInstagramData();
    }
  }

  private async captureYouTubeContent(days: number): Promise<any[]> {
    if (!this.youtubeToken) {
      console.log('⚠️ YouTube token não configurado, usando mock');
      return this.getMockYouTubeData();
    }

    try {
      const since = new Date();
      since.setDate(since.getDate() - days);
      
      // Buscar vídeos recentes
      const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=id&channelId=${this.youtubeChannelId}&maxResults=50&order=date&type=video&publishedAfter=${since.toISOString()}&key=${this.youtubeToken}`;
      
      const searchResponse = await fetch(searchUrl);
      if (!searchResponse.ok) throw new Error(`YouTube Search error: ${searchResponse.status}`);
      
      const searchData = await searchResponse.json();
      const videoIds = searchData.items?.map((item: any) => item.id.videoId).join(',') || '';
      
      if (!videoIds) return [];

      // Buscar detalhes dos vídeos
      const videosUrl = `https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics&id=${videoIds}&key=${this.youtubeToken}`;
      
      const videosResponse = await fetch(videosUrl);
      if (!videosResponse.ok) throw new Error(`YouTube Videos error: ${videosResponse.status}`);
      
      const videosData = await videosResponse.json();
      return videosData.items || [];
    } catch (error) {
      console.error('Erro YouTube API:', error);
      return this.getMockYouTubeData();
    }
  }

  private async captureTikTokContent(days: number): Promise<any[]> {
    if (!this.tiktokToken) {
      console.log('⚠️ TikTok token não configurado, usando mock');
      return this.getMockTikTokData();
    }

    try {
      // TikTok API implementation would go here
      // For now, return mock data
      return this.getMockTikTokData();
    } catch (error) {
      console.error('Erro TikTok API:', error);
      return this.getMockTikTokData();
    }
  }

  private async captureRecordedContent(): Promise<ContentItem[]> {
    try {
      // Buscar OS finalizadas com mídia mas não postadas
      const { data: recordedOS } = await this.supabase
        .from('ordens_de_servico')
        .select('*')
        .in('status', ['AGENDAMENTO', 'EDICAO', 'REVISAO'])
        .not('final_media_links', 'is', null);

      if (!recordedOS) return [];

      return recordedOS
        .filter((os: any) => os.final_media_links && os.final_media_links.length > 0)
        .map((os: any) => ({
          id: `os-${os.id}`,
          platform: 'instagram' as const,
          type: 'MIXED',
          title: os.titulo,
          caption: os.descricao || '',
          url: os.final_media_links[0] || '',
          publishedAt: os.atualizado_em,
          status: 'GRAVADO' as const,
          metrics: {
            likes: 0,
            comments: 0,
            views: 0
          },
          funcao: this.inferFunctionFromOS(os),
          desempenho: 'MEDIA' as const,
          repostavel: true,
          acao_sugerida: 'REPOSTAR' as const,
          hashtags: [],
          prioridade: os.prioridade || 'MEDIA'
        }));
    } catch (error) {
      console.log('⚠️ Erro ao buscar conteúdo gravado:', error);
      return [];
    }
  }

  // CLASSIFICAÇÃO E PRIORIZAÇÃO
  private classifyAndPrioritizeContent(content: ContentItem[]): ContentItem[] {
    return content.map(item => {
      const classified = {
        ...item,
        funcao: this.classifyFunction(item.title + ' ' + item.caption),
        desempenho: this.classifyPerformance(item),
        repostavel: this.isRepostable(item),
        acao_sugerida: this.suggestAction(item),
        prioridade: this.calculatePriority(item)
      };
      
      return classified;
    }).sort((a, b) => {
      // Ordenar por prioridade e performance
      const priorityOrder = { 'ALTA': 3, 'MEDIA': 2, 'BAIXA': 1 };
      const performanceOrder = { 'ALTA': 3, 'MEDIA': 2, 'BAIXA': 1 };
      
      const aScore = priorityOrder[a.prioridade] + performanceOrder[a.desempenho];
      const bScore = priorityOrder[b.prioridade] + performanceOrder[b.desempenho];
      
      return bScore - aScore;
    });
  }

  private classifyFunction(text: string): 'VENDA_DIRETA' | 'NUTRICAO' | 'AUTORIDADE' {
    const lowerText = text.toLowerCase();
    
    // Venda Direta - palavras de conversão
    const vendaKeywords = [
      'compre', 'adquira', 'promocao', 'desconto', 'oferta', 'link na bio', 
      'garanta', 'últimas vagas', 'aproveite', 'agendamento', 'consulta',
      'whatsapp', 'dm', 'contato', 'agende', 'reserve'
    ];
    if (vendaKeywords.some(keyword => lowerText.includes(keyword))) {
      return 'VENDA_DIRETA';
    }
    
    // Autoridade - conteúdo educativo
    const autoridadeKeywords = [
      'como', 'tutorial', 'dica', 'aprenda', 'descubra', 'saiba', 'guia', 
      'passo a passo', 'segredo', 'método', 'técnica', 'estratégia',
      'mitos', 'verdades', 'cuidados', 'tratamento'
    ];
    if (autoridadeKeywords.some(keyword => lowerText.includes(keyword))) {
      return 'AUTORIDADE';
    }
    
    // Nutrição - relacionamento e prova social
    return 'NUTRICAO';
  }

  private classifyPerformance(item: ContentItem): 'ALTA' | 'MEDIA' | 'BAIXA' {
    const { likes, comments, views, reach, ctr } = item.metrics;
    
    // Calcular score de engajamento
    const engagementRate = reach ? (likes + comments) / reach : 0;
    const totalEngagement = likes + comments;
    const viewsNormalized = views / 1000; // Normalizar views
    
    // Critérios de alta performance (ajustados por plataforma)
    if (item.platform === 'instagram') {
      if (engagementRate > 0.08 || totalEngagement > 1500 || likes > 1000) {
        return 'ALTA';
      }
      if (engagementRate < 0.03 || totalEngagement < 200 || likes < 100) {
        return 'BAIXA';
      }
    } else if (item.platform === 'youtube') {
      if (views > 15000 || likes > 800 || comments > 150) {
        return 'ALTA';
      }
      if (views < 2000 || likes < 100 || comments < 20) {
        return 'BAIXA';
      }
    } else if (item.platform === 'tiktok') {
      if (views > 20000 || likes > 2000 || comments > 200) {
        return 'ALTA';
      }
      if (views < 3000 || likes < 300 || comments < 30) {
        return 'BAIXA';
      }
    }
    
    return 'MEDIA';
  }

  private isRepostable(item: ContentItem): boolean {
    const { likes, comments, views } = item.metrics;
    const totalEngagement = likes + comments;
    
    // Critérios de repostagem por plataforma
    if (item.platform === 'instagram') {
      return likes > 500 || comments > 50 || totalEngagement > 600;
    } else if (item.platform === 'youtube') {
      return views > 5000 || likes > 200 || comments > 50;
    } else if (item.platform === 'tiktok') {
      return views > 10000 || likes > 1000 || comments > 100;
    }
    
    return false;
  }

  private suggestAction(item: ContentItem): 'MATAR' | 'REPOSTAR' | 'REGRAVAR' | 'TRAFEGO_PAGO' {
    const { likes, comments, views } = item.metrics;
    const totalEngagement = likes + comments;
    const isConversion = item.funcao === 'VENDA_DIRETA';
    
    // Alta performance + conversão = Tráfego pago
    if (item.desempenho === 'ALTA' && isConversion && totalEngagement > 1000) {
      return 'TRAFEGO_PAGO';
    }
    
    // Alta performance = Repostar
    if (item.desempenho === 'ALTA' || item.repostavel) {
      return 'REPOSTAR';
    }
    
    // Performance média com boa ideia = Regravar
    if (item.desempenho === 'MEDIA' && this.hasGoodConcept(item)) {
      return 'REGRAVAR';
    }
    
    // Baixa performance = Matar
    return 'MATAR';
  }

  private calculatePriority(item: ContentItem): 'ALTA' | 'MEDIA' | 'BAIXA' {
    // Prioridade baseada em performance + função + repostabilidade
    if (item.desempenho === 'ALTA' && item.repostavel) {
      return 'ALTA';
    }
    
    if (item.funcao === 'VENDA_DIRETA' && item.desempenho !== 'BAIXA') {
      return 'ALTA';
    }
    
    if (item.desempenho === 'MEDIA' || item.acao_sugerida === 'REGRAVAR') {
      return 'MEDIA';
    }
    
    return 'BAIXA';
  }

  private hasGoodConcept(item: ContentItem): boolean {
    const text = (item.title + ' ' + item.caption).toLowerCase();
    
    // Verificar se tem conceito interessante mesmo com baixa execução
    const goodConcepts = [
      'antes e depois', 'transformacao', 'resultado', 'dica', 'segredo',
      'tutorial', 'passo a passo', 'como fazer', 'mito', 'verdade'
    ];
    
    return goodConcepts.some(concept => text.includes(concept));
  }

  // ANÁLISE DE LACUNAS DO FUNIL
  private analyzeFunnelGaps(content: ContentItem[]): FunnelGaps {
    const funnelCounts = content.reduce((acc, item) => {
      acc[item.funcao] = (acc[item.funcao] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const total = content.length;
    
    // Metas ideais do funil
    const idealDistribution = { 
      AUTORIDADE: 40,    // 40% - Topo
      NUTRICAO: 40,      // 40% - Meio  
      VENDA_DIRETA: 20   // 20% - Fundo
    };

    const currentDistribution = {
      autoridade: total > 0 ? Math.round((funnelCounts.AUTORIDADE || 0) / total * 100) : 0,
      nutricao: total > 0 ? Math.round((funnelCounts.NUTRICAO || 0) / total * 100) : 0,
      vendaDireta: total > 0 ? Math.round((funnelCounts.VENDA_DIRETA || 0) / total * 100) : 0
    };

    return {
      topo: {
        missing: this.identifyTopoGaps(content),
        suggestions: this.generateTopoSuggestions(content),
        percentage: Math.round((currentDistribution.autoridade / idealDistribution.AUTORIDADE) * 100)
      },
      meio: {
        missing: this.identifyMeioGaps(content),
        suggestions: this.generateMeioSuggestions(content),
        percentage: Math.round((currentDistribution.nutricao / idealDistribution.NUTRICAO) * 100)
      },
      fundo: {
        missing: this.identifyFundoGaps(content),
        suggestions: this.generateFundoSuggestions(content),
        percentage: Math.round((currentDistribution.vendaDireta / idealDistribution.VENDA_DIRETA) * 100)
      }
    };
  }

  private identifyTopoGaps(content: ContentItem[]): string[] {
    const gaps: string[] = [];
    const autoridadeContent = content.filter(c => c.funcao === 'AUTORIDADE');
    
    const requiredThemes = [
      { theme: 'tutorial', label: 'Tutoriais práticos' },
      { theme: 'dicas', label: 'Dicas de especialista' },
      { theme: 'cuidados', label: 'Cuidados básicos' },
      { theme: 'mitos', label: 'Mitos vs verdades' },
      { theme: 'guia', label: 'Guias completos' }
    ];
    
    requiredThemes.forEach(({ theme, label }) => {
      const hasTheme = autoridadeContent.some(c => 
        c.title.toLowerCase().includes(theme) || c.caption.toLowerCase().includes(theme)
      );
      if (!hasTheme) {
        gaps.push(label);
      }
    });

    return gaps;
  }

  private identifyMeioGaps(content: ContentItem[]): string[] {
    const gaps: string[] = [];
    const nutricaoContent = content.filter(c => c.funcao === 'NUTRICAO');
    
    const requiredThemes = [
      { theme: 'antes e depois', label: 'Transformações visuais' },
      { theme: 'resultado', label: 'Casos de sucesso' },
      { theme: 'depoimento', label: 'Depoimentos detalhados' },
      { theme: 'comparacao', label: 'Comparativos de tratamentos' },
      { theme: 'jornada', label: 'Jornada do cliente' }
    ];
    
    requiredThemes.forEach(({ theme, label }) => {
      const hasTheme = nutricaoContent.some(c => 
        c.title.toLowerCase().includes(theme) || c.caption.toLowerCase().includes(theme)
      );
      if (!hasTheme) {
        gaps.push(label);
      }
    });

    return gaps;
  }

  private identifyFundoGaps(content: ContentItem[]): string[] {
    const gaps: string[] = [];
    const vendaContent = content.filter(c => c.funcao === 'VENDA_DIRETA');
    
    const requiredThemes = [
      { theme: 'urgencia', label: 'Senso de urgência' },
      { theme: 'promocao', label: 'Promoções atrativas' },
      { theme: 'desconto', label: 'Ofertas especiais' },
      { theme: 'prova social', label: 'Prova social forte' },
      { theme: 'garantia', label: 'Garantias e benefícios' }
    ];
    
    requiredThemes.forEach(({ theme, label }) => {
      const hasTheme = vendaContent.some(c => 
        c.title.toLowerCase().includes(theme) || c.caption.toLowerCase().includes(theme)
      );
      if (!hasTheme) {
        gaps.push(label);
      }
    });

    return gaps;
  }

  // GERAÇÃO DE SUGESTÕES
  private generateTopoSuggestions(content: ContentItem[]): string[] {
    return [
      'Tutorial: Rotina de cuidados diários em 5 passos',
      'Mitos vs Verdades: O que realmente funciona',
      'Guia completo: Escolhendo o tratamento ideal',
      'Dicas de especialista: Cuidados por idade',
      'Segredos profissionais: Técnicas caseiras'
    ];
  }

  private generateMeioSuggestions(content: ContentItem[]): string[] {
    return [
      'Antes e depois: 6 meses de transformação',
      'Case completo: Jornada da cliente Maria',
      'Comparativo: Laser vs IPL - qual escolher?',
      'Depoimento real: Como mudou minha autoestima',
      'Resultados comprovados: 100 clientes satisfeitas'
    ];
  }

  private generateFundoSuggestions(content: ContentItem[]): string[] {
    return [
      'Últimas vagas: Promoção de verão (48h)',
      'Oferta especial: 50% OFF apenas hoje',
      'Garanta já: Apenas 10 vagas restantes',
      'Prova social: +500 clientes transformadas',
      'Bônus exclusivo: Consulta + tratamento'
    ];
  }

  // RECOMENDAÇÕES ESTRATÉGICAS
  private generateStrategicRecommendations(content: ContentItem[]): AuditResults['recommendations'] {
    return {
      repost: content
        .filter(c => c.acao_sugerida === 'REPOSTAR')
        .sort((a, b) => (b.metrics.likes + b.metrics.comments) - (a.metrics.likes + a.metrics.comments))
        .slice(0, 10),
      rerecord: content
        .filter(c => c.acao_sugerida === 'REGRAVAR')
        .sort((a, b) => {
          const aScore = this.hasGoodConcept(a) ? 1 : 0;
          const bScore = this.hasGoodConcept(b) ? 1 : 0;
          return bScore - aScore;
        })
        .slice(0, 8),
      paidTraffic: content
        .filter(c => c.acao_sugerida === 'TRAFEGO_PAGO')
        .sort((a, b) => (b.metrics.likes + b.metrics.comments) - (a.metrics.likes + a.metrics.comments))
        .slice(0, 5),
      kill: content
        .filter(c => c.acao_sugerida === 'MATAR')
        .slice(0, 20)
    };
  }

  // CÁLCULO DE MÉTRICAS ESTRATÉGICAS
  private calculateStrategicSummary(content: ContentItem[]): AuditResults['summary'] {
    const total = content.length;
    const highPerformance = content.filter(c => c.desempenho === 'ALTA').length;
    const reusable = content.filter(c => c.repostavel).length;
    
    const funnelCounts = content.reduce((acc, item) => {
      acc[item.funcao] = (acc[item.funcao] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Top performers
    const topPerformers = content
      .filter(c => c.desempenho === 'ALTA')
      .sort((a, b) => (b.metrics.likes + b.metrics.comments + b.metrics.views/100) - 
                     (a.metrics.likes + a.metrics.comments + a.metrics.views/100))
      .slice(0, 3);

    // Calcular insights estratégicos
    const totalLikes = content.reduce((sum, item) => sum + item.metrics.likes, 0);
    const totalViews = content.reduce((sum, item) => sum + item.metrics.views, 0);
    const avgEngagement = totalViews > 0 ? (totalLikes / totalViews) * 100 : 0;
    
    const conversionContent = content.filter(c => c.funcao === 'VENDA_DIRETA');
    const conversionRate = conversionContent.length > 0 ? 
      (conversionContent.filter(c => c.desempenho === 'ALTA').length / conversionContent.length) * 100 : 0;

    return {
      totalContent: total,
      highPerformance,
      reusableContent: reusable,
      funnelCoverage: {
        vendaDireta: total > 0 ? Math.round((funnelCounts.VENDA_DIRETA || 0) / total * 100) : 0,
        nutricao: total > 0 ? Math.round((funnelCounts.NUTRICAO || 0) / total * 100) : 0,
        autoridade: total > 0 ? Math.round((funnelCounts.AUTORIDADE || 0) / total * 100) : 0
      },
      topPerformers,
      strategicInsights: {
        bestHours: this.analyzeBestPostingTimes(content),
        topThemes: this.extractTopThemes(content),
        avgEngagement,
        conversionRate
      }
    };
  }

  private analyzeBestPostingTimes(content: ContentItem[]): string[] {
    // Analisar horários dos posts de alta performance
    const highPerformanceContent = content.filter(c => c.desempenho === 'ALTA');
    
    const hourCounts = highPerformanceContent.reduce((acc, item) => {
      const hour = new Date(item.publishedAt).getHours();
      acc[hour] = (acc[hour] || 0) + 1;
      return acc;
    }, {} as Record<number, number>);

    return Object.entries(hourCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .map(([hour]) => `${hour}:00`);
  }

  private extractTopThemes(content: ContentItem[]): string[] {
    const themes = new Map<string, number>();
    
    content.forEach(item => {
      const text = (item.title + ' ' + item.caption).toLowerCase();
      const words = text.split(/\s+/)
        .filter(word => word.length > 4 && !word.startsWith('#') && !word.startsWith('@'))
        .slice(0, 10);
      
      words.forEach(word => {
        themes.set(word, (themes.get(word) || 0) + (item.desempenho === 'ALTA' ? 3 : 1));
      });
    });

    return Array.from(themes.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([theme]) => theme);
  }

  // NORMALIZAÇÃO DE DADOS
  private normalizeInstagramContent(content: any[], status: 'PUBLICADO' | 'GRAVADO'): ContentItem[] {
    return content.map(item => ({
      id: item.id,
      platform: 'instagram' as const,
      type: item.media_type || 'IMAGE',
      title: this.extractTitle(item.caption || ''),
      caption: item.caption || '',
      url: item.permalink || '',
      publishedAt: item.timestamp,
      status,
      metrics: {
        reach: item.insights?.data?.find((i: any) => i.name === 'reach')?.values?.[0]?.value || 0,
        likes: item.like_count || 0,
        comments: item.comments_count || 0,
        views: item.insights?.data?.find((i: any) => i.name === 'video_views')?.values?.[0]?.value || 0,
        clicks: item.insights?.data?.find((i: any) => i.name === 'profile_visits')?.values?.[0]?.value || 0,
        ctr: this.calculateCTR(item.like_count, item.insights?.data?.find((i: any) => i.name === 'reach')?.values?.[0]?.value)
      },
      funcao: 'NUTRICAO', // Will be reclassified
      desempenho: 'MEDIA', // Will be reclassified
      repostavel: false, // Will be reclassified
      acao_sugerida: 'MATAR', // Will be reclassified
      hashtags: this.extractHashtags(item.caption || ''),
      prioridade: 'MEDIA' // Will be reclassified
    }));
  }

  private normalizeYouTubeContent(content: any[], status: 'PUBLICADO' | 'GRAVADO'): ContentItem[] {
    return content.map(item => ({
      id: item.id,
      platform: 'youtube' as const,
      type: 'VIDEO',
      title: item.snippet.title,
      caption: item.snippet.description,
      url: `https://youtube.com/watch?v=${item.id}`,
      publishedAt: item.snippet.publishedAt,
      status,
      metrics: {
        likes: parseInt(item.statistics.likeCount || '0'),
        comments: parseInt(item.statistics.commentCount || '0'),
        views: parseInt(item.statistics.viewCount || '0'),
        ctr: this.calculateYouTubeCTR(item.statistics)
      },
      funcao: 'NUTRICAO', // Will be reclassified
      desempenho: 'MEDIA', // Will be reclassified
      repostavel: false, // Will be reclassified
      acao_sugerida: 'MATAR', // Will be reclassified
      hashtags: item.snippet.tags || [],
      prioridade: 'MEDIA' // Will be reclassified
    }));
  }

  private normalizeTikTokContent(content: any[], status: 'PUBLICADO' | 'GRAVADO'): ContentItem[] {
    return content.map(item => ({
      id: item.id || `tt-${Date.now()}`,
      platform: 'tiktok' as const,
      type: 'VIDEO',
      title: item.title || 'TikTok Video',
      caption: item.description || '',
      url: item.share_url || '',
      publishedAt: item.create_time || new Date().toISOString(),
      status,
      metrics: {
        likes: item.statistics?.like_count || 0,
        comments: item.statistics?.comment_count || 0,
        views: item.statistics?.view_count || 0,
        shares: item.statistics?.share_count || 0
      },
      funcao: 'NUTRICAO', // Will be reclassified
      desempenho: 'MEDIA', // Will be reclassified
      repostavel: false, // Will be reclassified
      acao_sugerida: 'MATAR', // Will be reclassified
      hashtags: [],
      prioridade: 'MEDIA' // Will be reclassified
    }));
  }

  // MÉTODOS AUXILIARES
  private extractTitle(caption: string): string {
    const lines = caption.split('\n');
    const firstLine = lines[0] || '';
    return firstLine.length > 80 ? firstLine.substring(0, 80) + '...' : firstLine;
  }

  private extractHashtags(text: string): string[] {
    const hashtagRegex = /#[\w\u00C0-\u017F]+/g;
    return text.match(hashtagRegex) || [];
  }

  private calculateCTR(likes: number, reach?: number): number {
    if (!reach || reach === 0) return 0;
    return likes / reach;
  }

  private calculateYouTubeCTR(statistics: any): number {
    const views = parseInt(statistics.viewCount || '0');
    const likes = parseInt(statistics.likeCount || '0');
    return views > 0 ? likes / views : 0;
  }

  private inferFunctionFromOS(os: any): 'VENDA_DIRETA' | 'NUTRICAO' | 'AUTORIDADE' {
    return os.objetivo === 'CONVERSAO' ? 'VENDA_DIRETA' : 
           os.objetivo === 'NUTRICAO' ? 'NUTRICAO' : 'AUTORIDADE';
  }

  // DADOS MOCK PARA DEMONSTRAÇÃO
  private getMockInstagramData(): any[] {
    return [
      {
        id: 'mock-ig-1',
        media_type: 'VIDEO',
        caption: 'Como escolher o vestido perfeito para noivado! Dicas essenciais 💍 #noivado #vestido #casamento #noiva #dicas',
        timestamp: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        like_count: 2450,
        comments_count: 189,
        permalink: 'https://instagram.com/p/mock1',
        insights: {
          data: [
            { name: 'reach', values: [{ value: 20000 }] },
            { name: 'video_views', values: [{ value: 15600 }] },
            { name: 'profile_visits', values: [{ value: 234 }] }
          ]
        }
      },
      {
        id: 'mock-ig-2',
        media_type: 'CAROUSEL_ALBUM',
        caption: 'Promoção especial: 50% OFF em todos os tratamentos! Últimas vagas disponíveis. Link na bio para agendar! #promocao #desconto #tratamento #oferta',
        timestamp: new Date(Date.now() - 21 * 24 * 60 * 60 * 1000).toISOString(),
        like_count: 456,
        comments_count: 23,
        permalink: 'https://instagram.com/p/mock2',
        insights: {
          data: [
            { name: 'reach', values: [{ value: 8500 }] },
            { name: 'profile_visits', values: [{ value: 67 }] }
          ]
        }
      }
    ];
  }

  private getMockYouTubeData(): any[] {
    return [
      {
        id: 'mock-yt-1',
        snippet: {
          title: 'Transformação completa: Antes e depois do tratamento facial',
          description: 'Veja a incrível transformação da nossa cliente Maria após 3 meses de tratamento. Resultados reais e comprovados.',
          publishedAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
          tags: ['transformacao', 'antesedepois', 'resultado', 'tratamento']
        },
        statistics: {
          viewCount: '12400',
          likeCount: '890',
          commentCount: '156'
        }
      }
    ];
  }

  private getMockTikTokData(): any[] {
    return [
      {
        id: 'mock-tt-1',
        title: 'Dica rápida: Cuidados com a pele no inverno',
        description: 'Inverno chegando! Proteja sua pele com essas dicas simples ❄️ #skincare #inverno #cuidados',
        create_time: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
        share_url: 'https://tiktok.com/@mock/video/123',
        statistics: {
          like_count: 1200,
          comment_count: 67,
          view_count: 8900,
          share_count: 234
        }
      }
    ];
  }

  private getMockAuditResults(): AuditResults {
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
      },
      {
        id: 'os-gravado-1',
        platform: 'instagram',
        type: 'REEL',
        title: 'Tutorial: Maquiagem para noivas',
        caption: 'Passo a passo completo para o dia especial',
        url: 'https://drive.google.com/file/d/mock',
        publishedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
        status: 'GRAVADO',
        metrics: { likes: 0, comments: 0, views: 0 },
        funcao: 'AUTORIDADE',
        desempenho: 'MEDIA',
        repostavel: true,
        acao_sugerida: 'REPOSTAR',
        hashtags: [],
        prioridade: 'ALTA'
      }
    ];

    return {
      inventory: mockContent,
      funnelGaps: {
        topo: {
          missing: ['Tutoriais básicos', 'Mitos vs verdades', 'Guias para iniciantes'],
          suggestions: ['Tutorial: Rotina de cuidados diários', 'Desmistificando procedimentos estéticos', 'Guia: Escolhendo o primeiro tratamento'],
          percentage: 65
        },
        meio: {
          missing: ['Comparação de tratamentos', 'Cases detalhados', 'Jornada do cliente'],
          suggestions: ['Comparativo: Laser vs IPL', 'Case completo: 6 meses de transformação', 'Jornada: Do primeiro contato ao resultado'],
          percentage: 45
        },
        fundo: {
          missing: ['Urgência real', 'Prova social forte', 'Ofertas irresistíveis'],
          suggestions: ['Últimas 24h: Promoção especial', 'Resultados: 500+ clientes satisfeitas', 'Oferta única: Bônus exclusivo'],
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
          vendaDireta: 20,
          nutricao: 40,
          autoridade: 40
        },
        topPerformers: mockContent.filter(c => c.desempenho === 'ALTA').slice(0, 3),
        strategicInsights: {
          bestHours: ['11:00', '15:00', '19:00'],
          topThemes: ['noivado', 'transformacao', 'cuidados', 'dicas', 'tratamento'],
          avgEngagement: 8.5,
          conversionRate: 3.2
        }
      }
    };
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    const url = new URL(req.url);
    const path = url.pathname;

    // POST /content-audit/analyze - Executar auditoria completa
    if (path.endsWith('/analyze') && req.method === 'POST') {
      const body = await req.json();
      const days = body.days || 60;
      
      console.log(`🎯 Iniciando auditoria de ${days} dias...`);
      
      const intelligence = new ContentIntelligenceSystem(supabaseClient);
      const results = await intelligence.runFullAudit(days);

      console.log(`✅ Auditoria concluída: ${results.inventory.length} conteúdos`);

      return new Response(
        JSON.stringify(results),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // GET /content-audit/inventory - Apenas inventário
    if (path.endsWith('/inventory') && req.method === 'GET') {
      const intelligence = new ContentIntelligenceSystem(supabaseClient);
      const results = await intelligence.runFullAudit(60);

      return new Response(
        JSON.stringify(results.inventory),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // GET /content-audit/recommendations - Apenas recomendações
    if (path.endsWith('/recommendations') && req.method === 'GET') {
      const intelligence = new ContentIntelligenceSystem(supabaseClient);
      const results = await intelligence.runFullAudit(60);

      return new Response(
        JSON.stringify(results.recommendations),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // GET /content-audit/gaps - Apenas lacunas do funil
    if (path.endsWith('/gaps') && req.method === 'GET') {
      const intelligence = new ContentIntelligenceSystem(supabaseClient);
      const results = await intelligence.runFullAudit(60);

      return new Response(
        JSON.stringify(results.funnelGaps),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Endpoint não encontrado' }),
      {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Erro no Content Intelligence:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});