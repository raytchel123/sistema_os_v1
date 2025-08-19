/**
 * Content Intelligence Engine
 * Sistema avançado de análise e classificação de conteúdo
 */

interface ContentAnalysis {
  sentiment: 'POSITIVE' | 'NEUTRAL' | 'NEGATIVE';
  topics: string[];
  intent: 'EDUCATIONAL' | 'PROMOTIONAL' | 'SOCIAL_PROOF' | 'ENTERTAINMENT';
  complexity: 'BASIC' | 'INTERMEDIATE' | 'ADVANCED';
  urgency: 'LOW' | 'MEDIUM' | 'HIGH';
}

interface PerformanceMetrics {
  engagementRate: number;
  viralityScore: number;
  conversionPotential: number;
  retentionScore: number;
  shareabilityIndex: number;
}

interface ContentDNA {
  hooks: string[];
  structure: string[];
  ctas: string[];
  visualElements: string[];
  audioElements: string[];
}

export class ContentIntelligenceEngine {
  
  /**
   * Análise avançada de conteúdo usando NLP e padrões
   */
  static analyzeContent(title: string, caption: string, hashtags: string[]): ContentAnalysis {
    const fullText = `${title} ${caption} ${hashtags.join(' ')}`.toLowerCase();
    
    return {
      sentiment: this.analyzeSentiment(fullText),
      topics: this.extractTopics(fullText),
      intent: this.classifyIntent(fullText),
      complexity: this.assessComplexity(fullText),
      urgency: this.detectUrgency(fullText)
    };
  }

  /**
   * Cálculo de métricas de performance avançadas
   */
  static calculateAdvancedMetrics(item: any): PerformanceMetrics {
    const { likes, comments, views, reach, shares } = item.metrics;
    
    const engagementRate = reach > 0 ? (likes + comments) / reach : 0;
    const viralityScore = this.calculateViralityScore(likes, comments, shares || 0, views);
    const conversionPotential = this.assessConversionPotential(item);
    const retentionScore = comments > 0 ? comments / likes : 0;
    const shareabilityIndex = shares > 0 ? shares / likes : 0;

    return {
      engagementRate,
      viralityScore,
      conversionPotential,
      retentionScore,
      shareabilityIndex
    };
  }

  /**
   * Extração do DNA do conteúdo para replicação
   */
  static extractContentDNA(item: any): ContentDNA {
    const text = `${item.title} ${item.caption}`;
    
    return {
      hooks: this.extractHooks(text),
      structure: this.analyzeStructure(text),
      ctas: this.extractCTAs(text),
      visualElements: this.identifyVisualElements(item),
      audioElements: this.identifyAudioElements(item)
    };
  }

  /**
   * Predição de performance para novos conteúdos
   */
  static predictPerformance(
    contentType: string, 
    function_: string, 
    historicalData: any[]
  ): { estimatedLikes: number; estimatedViews: number; confidence: number } {
    
    const similarContent = historicalData.filter(item => 
      item.type === contentType && item.funcao === function_
    );

    if (similarContent.length === 0) {
      return { estimatedLikes: 500, estimatedViews: 3000, confidence: 0.3 };
    }

    const avgLikes = similarContent.reduce((sum, item) => sum + item.metrics.likes, 0) / similarContent.length;
    const avgViews = similarContent.reduce((sum, item) => sum + item.metrics.views, 0) / similarContent.length;
    const confidence = Math.min(similarContent.length / 10, 1); // Máximo 100% com 10+ exemplos

    return {
      estimatedLikes: Math.round(avgLikes),
      estimatedViews: Math.round(avgViews),
      confidence
    };
  }

  /**
   * Geração de variações de conteúdo baseadas em alta performance
   */
  static generateContentVariations(topPerformer: any): string[] {
    const dna = this.extractContentDNA(topPerformer);
    const variations: string[] = [];

    // Variação 1: Mesmo hook, novo ângulo
    if (dna.hooks.length > 0) {
      variations.push(`${dna.hooks[0]} - Nova perspectiva sobre o tema`);
    }

    // Variação 2: Estrutura similar, tema diferente
    variations.push(`Aplicar estrutura de "${topPerformer.title}" em novo tema`);

    // Variação 3: Mesmo CTA, novo contexto
    if (dna.ctas.length > 0) {
      variations.push(`Novo conteúdo com CTA: "${dna.ctas[0]}"`);
    }

    return variations;
  }

  /**
   * Análise de concorrência e benchmarking
   */
  static benchmarkAgainstIndustry(content: any[]): {
    industryAverage: PerformanceMetrics;
    ourPerformance: PerformanceMetrics;
    competitiveGaps: string[];
    opportunities: string[];
  } {
    // Métricas da indústria (dados de referência)
    const industryBenchmarks = {
      instagram: { engagementRate: 0.045, avgLikes: 800, avgComments: 60 },
      youtube: { engagementRate: 0.025, avgLikes: 400, avgComments: 80 },
      tiktok: { engagementRate: 0.055, avgLikes: 1500, avgComments: 100 }
    };

    const ourMetrics = this.calculateAverageMetrics(content);
    
    return {
      industryAverage: {
        engagementRate: 0.045,
        viralityScore: 0.15,
        conversionPotential: 0.08,
        retentionScore: 0.12,
        shareabilityIndex: 0.06
      },
      ourPerformance: ourMetrics,
      competitiveGaps: this.identifyCompetitiveGaps(ourMetrics),
      opportunities: this.identifyOpportunities(ourMetrics)
    };
  }

  // MÉTODOS AUXILIARES PRIVADOS

  private static analyzeSentiment(text: string): 'POSITIVE' | 'NEUTRAL' | 'NEGATIVE' {
    const positiveWords = ['incrível', 'amazing', 'perfeito', 'ótimo', 'excelente', 'maravilhoso', 'fantástico'];
    const negativeWords = ['ruim', 'péssimo', 'horrível', 'terrível', 'problema', 'erro'];
    
    const positiveCount = positiveWords.reduce((count, word) => 
      count + (text.includes(word) ? 1 : 0), 0);
    const negativeCount = negativeWords.reduce((count, word) => 
      count + (text.includes(word) ? 1 : 0), 0);
    
    if (positiveCount > negativeCount) return 'POSITIVE';
    if (negativeCount > positiveCount) return 'NEGATIVE';
    return 'NEUTRAL';
  }

  private static extractTopics(text: string): string[] {
    const topicKeywords = {
      'beleza': ['beleza', 'makeup', 'maquiagem', 'skincare', 'pele'],
      'casamento': ['casamento', 'noivado', 'noiva', 'vestido', 'cerimonia'],
      'tratamento': ['tratamento', 'procedimento', 'laser', 'botox', 'harmonizacao'],
      'cuidados': ['cuidados', 'rotina', 'dicas', 'tutorial', 'como fazer']
    };

    const topics: string[] = [];
    Object.entries(topicKeywords).forEach(([topic, keywords]) => {
      if (keywords.some(keyword => text.includes(keyword))) {
        topics.push(topic);
      }
    });

    return topics;
  }

  private static classifyIntent(text: string): 'EDUCATIONAL' | 'PROMOTIONAL' | 'SOCIAL_PROOF' | 'ENTERTAINMENT' {
    if (text.includes('como') || text.includes('tutorial') || text.includes('dica')) {
      return 'EDUCATIONAL';
    }
    if (text.includes('promocao') || text.includes('desconto') || text.includes('link na bio')) {
      return 'PROMOTIONAL';
    }
    if (text.includes('resultado') || text.includes('antes e depois') || text.includes('depoimento')) {
      return 'SOCIAL_PROOF';
    }
    return 'ENTERTAINMENT';
  }

  private static assessComplexity(text: string): 'BASIC' | 'INTERMEDIATE' | 'ADVANCED' {
    const complexWords = ['procedimento', 'técnica', 'metodologia', 'protocolo', 'especializado'];
    const complexCount = complexWords.reduce((count, word) => 
      count + (text.includes(word) ? 1 : 0), 0);
    
    if (complexCount >= 2) return 'ADVANCED';
    if (complexCount >= 1) return 'INTERMEDIATE';
    return 'BASIC';
  }

  private static detectUrgency(text: string): 'LOW' | 'MEDIUM' | 'HIGH' {
    const urgencyWords = ['urgente', 'últimas', 'hoje', 'agora', 'rápido', 'limitado'];
    const urgencyCount = urgencyWords.reduce((count, word) => 
      count + (text.includes(word) ? 1 : 0), 0);
    
    if (urgencyCount >= 2) return 'HIGH';
    if (urgencyCount >= 1) return 'MEDIUM';
    return 'LOW';
  }

  private static calculateViralityScore(likes: number, comments: number, shares: number, views: number): number {
    const engagementWeight = (likes + comments * 2 + shares * 3) / Math.max(views, 1);
    return Math.min(engagementWeight * 100, 1); // Normalizar para 0-1
  }

  private static assessConversionPotential(item: any): number {
    let score = 0;
    
    // Função de venda direta
    if (item.funcao === 'VENDA_DIRETA') score += 0.4;
    
    // Alta performance
    if (item.desempenho === 'ALTA') score += 0.3;
    
    // Presença de CTA
    if (item.caption.toLowerCase().includes('link na bio')) score += 0.2;
    
    // Urgência
    const urgencyWords = ['últimas', 'hoje', 'agora', 'limitado'];
    if (urgencyWords.some(word => item.caption.toLowerCase().includes(word))) score += 0.1;
    
    return Math.min(score, 1);
  }

  private static extractHooks(text: string): string[] {
    const sentences = text.split(/[.!?]/);
    return sentences
      .slice(0, 2) // Primeiras 2 frases
      .map(s => s.trim())
      .filter(s => s.length > 10 && s.length < 100);
  }

  private static analyzeStructure(text: string): string[] {
    const structure: string[] = [];
    
    if (text.includes('primeiro') || text.includes('1.')) structure.push('Lista numerada');
    if (text.includes('porque') || text.includes('motivo')) structure.push('Explicação causal');
    if (text.includes('antes') && text.includes('depois')) structure.push('Comparação temporal');
    if (text.includes('dica') || text.includes('segredo')) structure.push('Revelação de informação');
    
    return structure;
  }

  private static extractCTAs(text: string): string[] {
    const ctaPatterns = [
      /link na bio/gi,
      /comenta.*embaixo/gi,
      /salva.*post/gi,
      /compartilha/gi,
      /marca.*amig/gi
    ];

    const ctas: string[] = [];
    ctaPatterns.forEach(pattern => {
      const matches = text.match(pattern);
      if (matches) {
        ctas.push(...matches);
      }
    });

    return [...new Set(ctas)]; // Remove duplicatas
  }

  private static identifyVisualElements(item: any): string[] {
    const elements: string[] = [];
    
    if (item.type === 'VIDEO' || item.type === 'REEL') {
      elements.push('Movimento dinâmico');
    }
    if (item.type === 'CAROUSEL_ALBUM') {
      elements.push('Múltiplas imagens');
    }
    if (item.caption.includes('antes') && item.caption.includes('depois')) {
      elements.push('Comparação visual');
    }
    
    return elements;
  }

  private static identifyAudioElements(item: any): string[] {
    const elements: string[] = [];
    
    if (item.type === 'VIDEO' || item.type === 'REEL') {
      elements.push('Áudio original');
      
      // Detectar tipo de áudio baseado no conteúdo
      if (item.caption.includes('música') || item.caption.includes('som')) {
        elements.push('Música de fundo');
      }
      if (item.caption.includes('fala') || item.caption.includes('explica')) {
        elements.push('Narração');
      }
    }
    
    return elements;
  }

  private static calculateAverageMetrics(content: any[]): PerformanceMetrics {
    if (content.length === 0) {
      return {
        engagementRate: 0,
        viralityScore: 0,
        conversionPotential: 0,
        retentionScore: 0,
        shareabilityIndex: 0
      };
    }

    const totals = content.reduce((acc, item) => {
      const metrics = this.calculateAdvancedMetrics(item);
      acc.engagementRate += metrics.engagementRate;
      acc.viralityScore += metrics.viralityScore;
      acc.conversionPotential += metrics.conversionPotential;
      acc.retentionScore += metrics.retentionScore;
      acc.shareabilityIndex += metrics.shareabilityIndex;
      return acc;
    }, {
      engagementRate: 0,
      viralityScore: 0,
      conversionPotential: 0,
      retentionScore: 0,
      shareabilityIndex: 0
    });

    const count = content.length;
    return {
      engagementRate: totals.engagementRate / count,
      viralityScore: totals.viralityScore / count,
      conversionPotential: totals.conversionPotential / count,
      retentionScore: totals.retentionScore / count,
      shareabilityIndex: totals.shareabilityIndex / count
    };
  }

  private static identifyCompetitiveGaps(ourMetrics: PerformanceMetrics): string[] {
    const gaps: string[] = [];
    
    if (ourMetrics.engagementRate < 0.04) {
      gaps.push('Taxa de engajamento abaixo da média da indústria');
    }
    if (ourMetrics.viralityScore < 0.1) {
      gaps.push('Baixo potencial viral - melhorar hooks');
    }
    if (ourMetrics.conversionPotential < 0.05) {
      gaps.push('CTAs fracos - otimizar chamadas para ação');
    }
    if (ourMetrics.shareabilityIndex < 0.03) {
      gaps.push('Conteúdo pouco compartilhável - aumentar valor');
    }

    return gaps;
  }

  private static identifyOpportunities(ourMetrics: PerformanceMetrics): string[] {
    const opportunities: string[] = [];
    
    if (ourMetrics.engagementRate > 0.06) {
      opportunities.push('Alta taxa de engajamento - expandir para tráfego pago');
    }
    if (ourMetrics.retentionScore > 0.15) {
      opportunities.push('Boa retenção - criar série de conteúdos');
    }
    if (ourMetrics.viralityScore > 0.2) {
      opportunities.push('Alto potencial viral - replicar formato');
    }

    return opportunities;
  }

  /**
   * Sistema de recomendação baseado em IA
   */
  static generateAIRecommendations(
    gaps: any, 
    topPerformers: any[], 
    currentTrends: string[]
  ): string[] {
    const recommendations: string[] = [];

    // Recomendações baseadas em lacunas
    if (gaps.topo.percentage < 70) {
      recommendations.push('🎯 URGENTE: Criar mais conteúdo educativo (autoridade)');
    }
    if (gaps.fundo.percentage < 50) {
      recommendations.push('💰 CRÍTICO: Aumentar conteúdo de conversão');
    }

    // Recomendações baseadas em top performers
    topPerformers.forEach((performer, index) => {
      if (index < 2) { // Top 2
        const dna = this.extractContentDNA(performer);
        recommendations.push(`🔥 Replicar sucesso: "${performer.title}" - ${dna.hooks[0] || 'Mesmo formato'}`);
      }
    });

    // Recomendações baseadas em tendências
    currentTrends.slice(0, 2).forEach(trend => {
      recommendations.push(`📈 Surfar tendência: Criar conteúdo sobre "${trend}"`);
    });

    return recommendations.slice(0, 8); // Máximo 8 recomendações
  }

  /**
   * Otimização de timing baseada em dados históricos
   */
  static optimizePostingSchedule(content: any[]): {
    bestDays: string[];
    bestHours: string[];
    worstTimes: string[];
    seasonalPatterns: string[];
  } {
    const highPerformanceContent = content.filter(c => c.desempenho === 'ALTA');
    
    // Analisar dias da semana
    const dayPerformance = this.analyzeDayPerformance(highPerformanceContent);
    
    // Analisar horários
    const hourPerformance = this.analyzeHourPerformance(highPerformanceContent);
    
    return {
      bestDays: dayPerformance.slice(0, 3),
      bestHours: hourPerformance.slice(0, 3),
      worstTimes: this.identifyWorstTimes(content),
      seasonalPatterns: this.identifySeasonalPatterns(content)
    };
  }

  private static analyzeDayPerformance(content: any[]): string[] {
    const dayNames = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
    const dayCounts = content.reduce((acc, item) => {
      const day = new Date(item.publishedAt).getDay();
      acc[day] = (acc[day] || 0) + 1;
      return acc;
    }, {} as Record<number, number>);

    return Object.entries(dayCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .map(([day]) => dayNames[parseInt(day)]);
  }

  private static analyzeHourPerformance(content: any[]): string[] {
    const hourCounts = content.reduce((acc, item) => {
      const hour = new Date(item.publishedAt).getHours();
      acc[hour] = (acc[hour] || 0) + 1;
      return acc;
    }, {} as Record<number, number>);

    return Object.entries(hourCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .map(([hour]) => `${hour}:00`);
  }

  private static identifyWorstTimes(content: any[]): string[] {
    const lowPerformanceContent = content.filter(c => c.desempenho === 'BAIXA');
    
    if (lowPerformanceContent.length === 0) return [];
    
    const hourCounts = lowPerformanceContent.reduce((acc, item) => {
      const hour = new Date(item.publishedAt).getHours();
      acc[hour] = (acc[hour] || 0) + 1;
      return acc;
    }, {} as Record<number, number>);

    return Object.entries(hourCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 2)
      .map(([hour]) => `${hour}:00`);
  }

  private static identifySeasonalPatterns(content: any[]): string[] {
    const patterns: string[] = [];
    
    // Analisar por mês
    const monthPerformance = content.reduce((acc, item) => {
      const month = new Date(item.publishedAt).getMonth();
      if (!acc[month]) acc[month] = { total: 0, high: 0 };
      acc[month].total++;
      if (item.desempenho === 'ALTA') acc[month].high++;
      return acc;
    }, {} as Record<number, { total: number; high: number }>);

    const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    
    Object.entries(monthPerformance).forEach(([month, data]) => {
      const successRate = data.high / data.total;
      if (successRate > 0.6) {
        patterns.push(`${monthNames[parseInt(month)]}: Alta performance (${Math.round(successRate * 100)}%)`);
      }
    });

    return patterns;
  }
}