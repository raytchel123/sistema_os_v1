import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, idempotency-key',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
};

interface InstagramContent {
  id: string;
  media_type: string;
  caption: string;
  timestamp: string;
  like_count: number;
  comments_count: number;
  permalink: string;
}

interface YouTubeContent {
  id: string;
  snippet: {
    title: string;
    description: string;
    publishedAt: string;
    tags?: string[];
  };
  statistics: {
    viewCount: string;
    likeCount: string;
    commentCount: string;
  };
}

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

class TrendsAnalyzer {
  private instagramPageId: string;
  private youtubeChannelId: string;
  private instagramToken: string;
  private youtubeToken: string;

  constructor() {
    this.instagramPageId = '40666405722';
    this.youtubeChannelId = 'UCzyua2fR6hfgBNWlygaSBw';
    this.instagramToken = Deno.env.get('INSTAGRAM_ACCESS_TOKEN') || '';
    this.youtubeToken = Deno.env.get('YOUTUBE_API_KEY') || '';
  }

  async analyzeContent(): Promise<{
    contentData: ContentData[];
    suggestions: ContentSuggestion[];
    analysis: TrendsAnalysis;
  }> {
    console.log('🔍 Iniciando análise de tendências...');

    try {
      // Fetch content from both platforms
      const [instagramContent, youtubeContent] = await Promise.all([
        this.fetchInstagramContent(),
        this.fetchYouTubeContent()
      ]);

      // Normalize and classify content
      const contentData = [
        ...this.normalizeInstagramContent(instagramContent),
        ...this.normalizeYouTubeContent(youtubeContent)
      ];

      // Analyze patterns and generate insights
      const analysis = this.generateAnalysis(contentData);

      // Generate content suggestions
      const suggestions = this.generateSuggestions(contentData, analysis);

      console.log(`✅ Análise concluída: ${contentData.length} posts analisados`);

      return {
        contentData,
        suggestions,
        analysis
      };
    } catch (error) {
      console.error('❌ Erro na análise:', error);
      
      // Return mock data if APIs fail
      return this.getMockData();
    }
  }

  private async fetchInstagramContent(): Promise<InstagramContent[]> {
    if (!this.instagramToken) {
      console.log('⚠️ Instagram token não configurado, usando dados mock');
      return this.getMockInstagramData();
    }

    try {
      const url = `https://graph.facebook.com/v18.0/${this.instagramPageId}/media?fields=id,media_type,caption,timestamp,like_count,comments_count,permalink&limit=10&access_token=${this.instagramToken}`;
      
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Instagram API error: ${response.status}`);
      }

      const data = await response.json();
      return data.data || [];
    } catch (error) {
      console.error('Erro ao buscar dados do Instagram:', error);
      return this.getMockInstagramData();
    }
  }

  private async fetchYouTubeContent(): Promise<YouTubeContent[]> {
    if (!this.youtubeToken) {
      console.log('⚠️ YouTube token não configurado, usando dados mock');
      return this.getMockYouTubeData();
    }

    try {
      // First, get the latest videos
      const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=id&channelId=${this.youtubeChannelId}&maxResults=10&order=date&type=video&key=${this.youtubeToken}`;
      
      const searchResponse = await fetch(searchUrl);
      
      if (!searchResponse.ok) {
        throw new Error(`YouTube Search API error: ${searchResponse.status}`);
      }

      const searchData = await searchResponse.json();
      const videoIds = searchData.items?.map((item: any) => item.id.videoId).join(',') || '';

      if (!videoIds) {
        return this.getMockYouTubeData();
      }

      // Then get detailed info for those videos
      const videosUrl = `https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics&id=${videoIds}&key=${this.youtubeToken}`;
      
      const videosResponse = await fetch(videosUrl);
      
      if (!videosResponse.ok) {
        throw new Error(`YouTube Videos API error: ${videosResponse.status}`);
      }

      const videosData = await videosResponse.json();
      return videosData.items || [];
    } catch (error) {
      console.error('Erro ao buscar dados do YouTube:', error);
      return this.getMockYouTubeData();
    }
  }

  private normalizeInstagramContent(content: InstagramContent[]): ContentData[] {
    return content.map(item => ({
      id: item.id,
      platform: 'instagram' as const,
      type: item.media_type || 'IMAGE',
      title: this.extractTitle(item.caption || ''),
      caption: item.caption || '',
      hashtags: this.extractHashtags(item.caption || ''),
      publishedAt: item.timestamp,
      metrics: {
        likes: item.like_count || 0,
        comments: item.comments_count || 0,
        views: 0
      },
      funnelStage: this.classifyFunnelStage(item.caption || ''),
      url: item.permalink || ''
    }));
  }

  private normalizeYouTubeContent(content: YouTubeContent[]): ContentData[] {
    return content.map(item => ({
      id: item.id,
      platform: 'youtube' as const,
      type: 'VIDEO',
      title: item.snippet.title,
      caption: item.snippet.description,
      hashtags: item.snippet.tags || [],
      publishedAt: item.snippet.publishedAt,
      metrics: {
        likes: parseInt(item.statistics.likeCount || '0'),
        comments: parseInt(item.statistics.commentCount || '0'),
        views: parseInt(item.statistics.viewCount || '0')
      },
      funnelStage: this.classifyFunnelStage(item.snippet.title + ' ' + item.snippet.description),
      url: `https://youtube.com/watch?v=${item.id}`
    }));
  }

  private extractTitle(caption: string): string {
    const lines = caption.split('\n');
    const firstLine = lines[0] || '';
    return firstLine.length > 60 ? firstLine.substring(0, 60) + '...' : firstLine;
  }

  private extractHashtags(text: string): string[] {
    const hashtagRegex = /#[\w\u00C0-\u017F]+/g;
    return text.match(hashtagRegex) || [];
  }

  private classifyFunnelStage(text: string): 'TOPO' | 'MEIO' | 'FUNDO' {
    const lowerText = text.toLowerCase();
    
    // Palavras-chave para cada etapa do funil
    const topoKeywords = ['dica', 'como', 'tutorial', 'aprenda', 'descubra', 'saiba', 'conheca'];
    const meioKeywords = ['beneficio', 'vantagem', 'diferenca', 'comparacao', 'porque', 'motivo'];
    const fundoKeywords = ['compre', 'adquira', 'garanta', 'promocao', 'desconto', 'oferta', 'link na bio'];

    const topoScore = topoKeywords.reduce((score, keyword) => 
      score + (lowerText.includes(keyword) ? 1 : 0), 0);
    const meioScore = meioKeywords.reduce((score, keyword) => 
      score + (lowerText.includes(keyword) ? 1 : 0), 0);
    const fundoScore = fundoKeywords.reduce((score, keyword) => 
      score + (lowerText.includes(keyword) ? 1 : 0), 0);

    if (fundoScore > topoScore && fundoScore > meioScore) return 'FUNDO';
    if (meioScore > topoScore) return 'MEIO';
    return 'TOPO';
  }

  private generateAnalysis(contentData: ContentData[]): TrendsAnalysis {
    if (contentData.length === 0) {
      return {
        topPerformingThemes: [],
        bestPostTypes: [],
        optimalPostTimes: [],
        engagementPatterns: { avgLikes: 0, avgComments: 0, avgViews: 0 },
        funnelDistribution: { topo: 0, meio: 0, fundo: 0 }
      };
    }

    // Calculate engagement patterns
    const totalLikes = contentData.reduce((sum, item) => sum + (item.metrics.likes || 0), 0);
    const totalComments = contentData.reduce((sum, item) => sum + (item.metrics.comments || 0), 0);
    const totalViews = contentData.reduce((sum, item) => sum + (item.metrics.views || 0), 0);

    // Analyze funnel distribution
    const funnelCounts = contentData.reduce((acc, item) => {
      acc[item.funnelStage.toLowerCase() as keyof typeof acc]++;
      return acc;
    }, { topo: 0, meio: 0, fundo: 0 });

    const total = contentData.length;

    // Extract themes from titles
    const themes = this.extractThemes(contentData);
    
    // Analyze post types
    const postTypes = this.analyzePostTypes(contentData);

    return {
      topPerformingThemes: themes.slice(0, 5),
      bestPostTypes: postTypes.slice(0, 3),
      optimalPostTimes: ['11:00', '15:00', '19:00'], // Mock data - would need more analysis
      engagementPatterns: {
        avgLikes: Math.round(totalLikes / total),
        avgComments: Math.round(totalComments / total),
        avgViews: Math.round(totalViews / total)
      },
      funnelDistribution: {
        topo: Math.round((funnelCounts.topo / total) * 100),
        meio: Math.round((funnelCounts.meio / total) * 100),
        fundo: Math.round((funnelCounts.fundo / total) * 100)
      }
    };
  }

  private extractThemes(contentData: ContentData[]): string[] {
    const themes = new Map<string, number>();
    
    contentData.forEach(item => {
      const words = (item.title + ' ' + item.caption)
        .toLowerCase()
        .split(/\s+/)
        .filter(word => word.length > 4 && !word.startsWith('#') && !word.startsWith('@'));
      
      words.forEach(word => {
        themes.set(word, (themes.get(word) || 0) + 1);
      });
    });

    return Array.from(themes.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([theme]) => theme);
  }

  private analyzePostTypes(contentData: ContentData[]): string[] {
    const typeCounts = new Map<string, number>();
    
    contentData.forEach(item => {
      typeCounts.set(item.type, (typeCounts.get(item.type) || 0) + 1);
    });

    return Array.from(typeCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([type]) => type);
  }

  private generateSuggestions(contentData: ContentData[], analysis: TrendsAnalysis): ContentSuggestion[] {
    const suggestions: ContentSuggestion[] = [];
    
    // Generate 5 suggestions based on analysis
    const suggestionTemplates = [
      {
        type: 'REEL' as const,
        funnelStage: 'TOPO' as const,
        title: 'Tutorial prático sobre [tema trending]',
        hook: 'Você não vai acreditar como é fácil fazer isso!',
        content: 'Passo a passo simples e visual mostrando uma técnica ou dica valiosa',
        cta: 'Salva esse post e compartilha com quem precisa!',
        soundtrack: 'Trending audio do momento'
      },
      {
        type: 'CARROSSEL' as const,
        funnelStage: 'MEIO' as const,
        title: 'Benefícios que você precisa conhecer',
        hook: 'Swipe para descobrir os segredos que mudaram minha vida →',
        content: 'Lista de benefícios ou comparações que educam o público',
        cta: 'Qual desses benefícios mais te chamou atenção? Comenta aí!',
        soundtrack: undefined
      },
      {
        type: 'STORY' as const,
        funnelStage: 'FUNDO' as const,
        title: 'Oferta especial por tempo limitado',
        hook: '🚨 ÚLTIMAS HORAS! Não perca essa oportunidade',
        content: 'Apresentação da oferta com senso de urgência e prova social',
        cta: 'Link na bio para garantir já!',
        soundtrack: undefined
      },
      {
        type: 'REEL' as const,
        funnelStage: 'TOPO' as const,
        title: 'Mitos vs Verdades sobre [nicho]',
        hook: 'Isso que você acredita pode estar te prejudicando...',
        content: 'Desmistificação de conceitos errados no seu nicho',
        cta: 'Conta nos comentários: qual mito você acreditava?',
        soundtrack: 'Audio dramático para impacto'
      },
      {
        type: 'CARROSSEL' as const,
        funnelStage: 'MEIO' as const,
        title: 'Antes e depois: transformação real',
        hook: 'A transformação que você vai ver vai te inspirar ✨',
        content: 'Case de sucesso ou transformação relacionada ao seu produto/serviço',
        cta: 'Quer uma transformação assim? Manda DM!',
        soundtrack: undefined
      }
    ];

    suggestionTemplates.forEach((template, index) => {
      const topTheme = analysis.topPerformingThemes[index % analysis.topPerformingThemes.length] || 'marketing';
      
      suggestions.push({
        id: `suggestion-${index + 1}`,
        type: template.type,
        title: template.title.replace('[tema trending]', topTheme).replace('[nicho]', 'marketing digital'),
        hook: template.hook,
        content: template.content,
        cta: template.cta,
        soundtrack: template.soundtrack,
        funnelStage: template.funnelStage,
        hashtags: this.generateHashtags(template.funnelStage, topTheme),
        estimatedEngagement: Math.round(Math.random() * 15 + 5) // 5-20% estimated engagement
      });
    });

    return suggestions;
  }

  private generateHashtags(funnelStage: string, theme: string): string[] {
    const baseHashtags = ['#marketing', '#digitalmarketing', '#empreendedorismo', '#negociosonline'];
    
    const stageHashtags = {
      TOPO: ['#dicas', '#tutorial', '#aprendizado', '#conhecimento'],
      MEIO: ['#beneficios', '#vantagens', '#comparacao', '#escolha'],
      FUNDO: ['#promocao', '#oferta', '#garantejá', '#linkbio']
    };

    const themeHashtags = [`#${theme}`, `#${theme}digital`, `#${theme}online`];

    return [
      ...baseHashtags,
      ...stageHashtags[funnelStage as keyof typeof stageHashtags] || [],
      ...themeHashtags
    ].slice(0, 8);
  }

  // Mock data methods for when APIs are not available
  private getMockData() {
    const mockContentData: ContentData[] = [
      {
        id: 'mock-1',
        platform: 'instagram',
        type: 'REEL',
        title: 'Como aumentar vendas em 30 dias',
        caption: 'Dica incrível para empreendedores! #marketing #vendas #empreendedorismo',
        hashtags: ['#marketing', '#vendas', '#empreendedorismo'],
        publishedAt: new Date(Date.now() - 86400000).toISOString(),
        metrics: { likes: 1250, comments: 89, views: 15600 },
        funnelStage: 'TOPO',
        url: 'https://instagram.com/p/mock1'
      },
      {
        id: 'mock-2',
        platform: 'youtube',
        type: 'VIDEO',
        title: 'Estratégias de Marketing Digital que Funcionam',
        caption: 'Neste vídeo, mostro as melhores estratégias para alavancar seu negócio online',
        hashtags: ['#marketingdigital', '#estrategias', '#negociosonline'],
        publishedAt: new Date(Date.now() - 172800000).toISOString(),
        metrics: { likes: 456, comments: 67, views: 8900 },
        funnelStage: 'MEIO',
        url: 'https://youtube.com/watch?v=mock2'
      }
    ];

    const mockAnalysis: TrendsAnalysis = {
      topPerformingThemes: ['marketing', 'vendas', 'empreendedorismo', 'digital', 'estrategias'],
      bestPostTypes: ['REEL', 'VIDEO', 'CARROSSEL'],
      optimalPostTimes: ['11:00', '15:00', '19:00'],
      engagementPatterns: {
        avgLikes: 853,
        avgComments: 78,
        avgViews: 12250
      },
      funnelDistribution: {
        topo: 60,
        meio: 30,
        fundo: 10
      }
    };

    const mockSuggestions: ContentSuggestion[] = [
      {
        id: 'suggestion-1',
        type: 'REEL',
        title: 'Tutorial: Como criar conteúdo viral',
        hook: 'Você não vai acreditar como é fácil viralizar!',
        content: 'Passo a passo para criar conteúdo que engaja e converte',
        cta: 'Salva esse post e marca um amigo!',
        soundtrack: 'Audio trending do momento',
        funnelStage: 'TOPO',
        hashtags: ['#viral', '#conteudo', '#marketing', '#dicas'],
        estimatedEngagement: 12
      }
    ];

    return {
      contentData: mockContentData,
      suggestions: mockSuggestions,
      analysis: mockAnalysis
    };
  }

  private getMockInstagramData(): InstagramContent[] {
    return [
      {
        id: 'mock-ig-1',
        media_type: 'VIDEO',
        caption: 'Como aumentar suas vendas em 30 dias! Dica incrível para empreendedores 🚀 #marketing #vendas #empreendedorismo #dicas',
        timestamp: new Date(Date.now() - 86400000).toISOString(),
        like_count: 1250,
        comments_count: 89,
        permalink: 'https://instagram.com/p/mock1'
      }
    ];
  }

  private getMockYouTubeData(): YouTubeContent[] {
    return [
      {
        id: 'mock-yt-1',
        snippet: {
          title: 'Estratégias de Marketing Digital que Realmente Funcionam em 2024',
          description: 'Neste vídeo, mostro as melhores estratégias para alavancar seu negócio online',
          publishedAt: new Date(Date.now() - 172800000).toISOString(),
          tags: ['marketing digital', 'estratégias', 'negócios online']
        },
        statistics: {
          viewCount: '8900',
          likeCount: '456',
          commentCount: '67'
        }
      }
    ];
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const path = url.pathname;

    // POST /trends-analyzer/analyze
    if (path.endsWith('/analyze') && req.method === 'POST') {
      const analyzer = new TrendsAnalyzer();
      const result = await analyzer.analyzeContent();

      return new Response(
        JSON.stringify(result),
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
    console.error('Erro no Trends Analyzer:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});