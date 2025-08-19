interface MediaAnalysis {
  type: 'video' | 'image' | 'audio' | 'document';
  format?: 'vertical' | 'horizontal' | 'quadrado';
  duration?: string;
  filename: string;
}

interface Briefing {
  resumo: string;
  cortesChave: string[];
  narrativa: string;
  legenda: string;
  cta: string;
}

interface NotificationData {
  titulo: string;
  midiaLinks: string[];
  briefing: string;
  prazo: string;
  responsavel: string;
}

export class IntelligentOSManager {
  
  /**
   * Analisa links de mídia bruta e identifica tipo, formato e duração
   */
  static analyzeMedia(links: string[]): MediaAnalysis[] {
    return links.map(link => {
      const filename = this.extractFilename(link);
      const extension = this.getFileExtension(filename);
      
      let analysis: MediaAnalysis = {
        type: this.getMediaType(extension),
        filename
      };

      // Análise específica para vídeos
      if (analysis.type === 'video') {
        analysis.format = this.detectVideoFormat(filename);
        analysis.duration = this.estimateDuration(filename);
      }

      return analysis;
    });
  }

  /**
   * Gera briefing detalhado baseado na análise da mídia
   */
  static generateBriefing(titulo: string, descricao: string, mediaAnalysis: MediaAnalysis[]): Briefing {
    const videoAnalysis = mediaAnalysis.filter(m => m.type === 'video');
    const hasVerticalVideo = videoAnalysis.some(v => v.format === 'vertical');
    const hasHorizontalVideo = videoAnalysis.some(v => v.format === 'horizontal');

    // Gerar resumo baseado no título e descrição
    const resumo = this.generateContentSummary(titulo, descricao);
    
    // Sugerir cortes baseado no formato dos vídeos
    const cortesChave = this.suggestKeyCuts(videoAnalysis, titulo);
    
    // Propor narrativa
    const narrativa = this.proposeNarrative(titulo, descricao, videoAnalysis);
    
    // Sugerir legenda
    const legenda = this.suggestCaption(titulo, resumo);
    
    // Propor CTA
    const cta = this.proposeCTA(titulo, descricao);

    return {
      resumo,
      cortesChave,
      narrativa,
      legenda,
      cta
    };
  }

  /**
   * Formata briefing para armazenamento
   */
  static formatBriefingForStorage(briefing: Briefing, mediaAnalysis: MediaAnalysis[]): string {
    const mediaInfo = mediaAnalysis.map(m => 
      `• ${m.filename} (${m.type}${m.format ? `, ${m.format}` : ''}${m.duration ? `, ~${m.duration}` : ''})`
    ).join('\n');

    return `
📋 BRIEFING DE EDIÇÃO

🎬 ANÁLISE DA MÍDIA:
${mediaInfo}

📝 RESUMO DO CONTEÚDO:
${briefing.resumo}

✂️ CORTES E TRECHOS-CHAVE:
${briefing.cortesChave.map(corte => `• ${corte}`).join('\n')}

🎭 PROPOSTA DE NARRATIVA:
${briefing.narrativa}

📱 SUGESTÃO DE LEGENDA:
${briefing.legenda}

🎯 CALL TO ACTION:
${briefing.cta}

---
Gerado automaticamente pelo Gestor Inteligente de OS
`.trim();
  }

  /**
   * Cria dados de notificação para cada responsável
   */
  static createNotificationData(
    titulo: string, 
    midiaLinks: string[], 
    briefing: string, 
    prazo: string,
    responsaveis: { edicao: string; arte: string; revisao: string }
  ): NotificationData[] {
    return [
      {
        titulo,
        midiaLinks,
        briefing,
        prazo,
        responsavel: responsaveis.edicao
      },
      {
        titulo,
        midiaLinks,
        briefing,
        prazo,
        responsavel: responsaveis.arte
      },
      {
        titulo,
        midiaLinks,
        briefing,
        prazo,
        responsavel: responsaveis.revisao
      }
    ];
  }

  /**
   * Classifica criativos prontos por categoria
   */
  static classifyCreatives(links: string[]): string[] {
    const categories: string[] = [];
    
    links.forEach(link => {
      const filename = this.extractFilename(link).toLowerCase();
      
      if (filename.includes('stories') || filename.includes('story')) {
        categories.push('Stories');
      } else if (filename.includes('feed') || filename.includes('post')) {
        categories.push('Feed');
      } else if (filename.includes('youtube') || filename.includes('yt')) {
        categories.push('YouTube');
      } else if (filename.includes('tiktok') || filename.includes('tt')) {
        categories.push('TikTok');
      } else if (filename.includes('reels') || filename.includes('reel')) {
        categories.push('Reels');
      } else if (filename.includes('vertical') || filename.includes('9x16')) {
        categories.push('Stories');
      } else if (filename.includes('horizontal') || filename.includes('16x9')) {
        categories.push('YouTube');
      } else {
        categories.push('Feed'); // Default
      }
    });

    return [...new Set(categories)]; // Remove duplicatas
  }

  // Métodos auxiliares privados
  private static extractFilename(url: string): string {
    try {
      const urlObj = new URL(url);
      const pathname = urlObj.pathname;
      return pathname.split('/').pop() || url.split('/').pop() || 'arquivo';
    } catch {
      return url.split('/').pop() || 'arquivo';
    }
  }

  private static getFileExtension(filename: string): string {
    return filename.split('.').pop()?.toLowerCase() || '';
  }

  private static getMediaType(extension: string): 'video' | 'image' | 'audio' | 'document' {
    const videoExts = ['mp4', 'mov', 'avi', 'mkv', 'webm', 'm4v'];
    const imageExts = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'];
    const audioExts = ['mp3', 'wav', 'aac', 'm4a', 'ogg'];
    
    if (videoExts.includes(extension)) return 'video';
    if (imageExts.includes(extension)) return 'image';
    if (audioExts.includes(extension)) return 'audio';
    return 'document';
  }

  private static detectVideoFormat(filename: string): 'vertical' | 'horizontal' | 'quadrado' {
    const lower = filename.toLowerCase();
    
    if (lower.includes('vertical') || lower.includes('9x16') || lower.includes('stories') || lower.includes('reels')) {
      return 'vertical';
    }
    if (lower.includes('horizontal') || lower.includes('16x9') || lower.includes('youtube')) {
      return 'horizontal';
    }
    if (lower.includes('quadrado') || lower.includes('1x1') || lower.includes('square')) {
      return 'quadrado';
    }
    
    // Default baseado no contexto
    if (lower.includes('feed') || lower.includes('post')) return 'quadrado';
    if (lower.includes('story') || lower.includes('tiktok')) return 'vertical';
    
    return 'horizontal'; // Default
  }

  private static estimateDuration(filename: string): string {
    const lower = filename.toLowerCase();
    
    // Procurar por indicadores de duração no nome
    const durationMatch = lower.match(/(\d+)(min|seg|s|m)/);
    if (durationMatch) {
      const num = durationMatch[1];
      const unit = durationMatch[2];
      if (unit.includes('min') || unit === 'm') return `${num} minutos`;
      return `${num} segundos`;
    }
    
    // Estimativas baseadas no tipo de conteúdo
    if (lower.includes('stories') || lower.includes('reels')) return '15-30 segundos';
    if (lower.includes('tiktok')) return '30-60 segundos';
    if (lower.includes('youtube')) return '5-15 minutos';
    
    return 'A definir';
  }

  private static generateContentSummary(titulo: string, descricao: string): string {
    const keywords = this.extractKeywords(titulo + ' ' + descricao);
    
    if (keywords.some(k => ['dica', 'tutorial', 'como'].includes(k.toLowerCase()))) {
      return `Conteúdo educativo sobre ${titulo.toLowerCase()}. Foco em ensinar e agregar valor ao público.`;
    }
    
    if (keywords.some(k => ['história', 'experiência', 'relato'].includes(k.toLowerCase()))) {
      return `Narrativa pessoal/empresarial sobre ${titulo.toLowerCase()}. Conteúdo de conexão emocional.`;
    }
    
    if (keywords.some(k => ['produto', 'serviço', 'oferta'].includes(k.toLowerCase()))) {
      return `Conteúdo promocional sobre ${titulo.toLowerCase()}. Objetivo de conversão e vendas.`;
    }
    
    return `Conteúdo sobre ${titulo.toLowerCase()}. ${descricao.substring(0, 100)}...`;
  }

  private static suggestKeyCuts(videoAnalysis: MediaAnalysis[], titulo: string): string[] {
    const cuts: string[] = [];
    
    // Cortes padrão baseados no formato
    if (videoAnalysis.some(v => v.format === 'vertical')) {
      cuts.push('Abertura impactante (primeiros 3 segundos)');
      cuts.push('Hook principal (segundos 3-8)');
      cuts.push('Desenvolvimento do conteúdo');
      cuts.push('CTA final (últimos 3 segundos)');
    }
    
    if (videoAnalysis.some(v => v.format === 'horizontal')) {
      cuts.push('Introdução e contextualização');
      cuts.push('Desenvolvimento principal do tema');
      cuts.push('Exemplos práticos ou demonstrações');
      cuts.push('Conclusão e call to action');
    }
    
    // Cortes específicos baseados no título
    if (titulo.toLowerCase().includes('tutorial')) {
      cuts.push('Passo a passo detalhado');
      cuts.push('Dicas extras e observações importantes');
    }
    
    return cuts.length > 0 ? cuts : ['Analisar conteúdo completo', 'Identificar momentos-chave', 'Criar narrativa fluida'];
  }

  private static proposeNarrative(titulo: string, descricao: string, videoAnalysis: MediaAnalysis[]): string {
    const hasVertical = videoAnalysis.some(v => v.format === 'vertical');
    
    if (hasVertical) {
      return `Narrativa dinâmica para formato vertical:
1. Hook imediato nos primeiros segundos
2. Desenvolvimento rápido e objetivo
3. Elementos visuais chamativos
4. Ritmo acelerado para manter atenção
5. CTA claro e direto`;
    }
    
    return `Narrativa estruturada:
1. Introdução clara do tema
2. Desenvolvimento lógico do conteúdo
3. Exemplos práticos quando aplicável
4. Conclusão que reforce a mensagem principal
5. Chamada para ação específica`;
  }

  private static suggestCaption(titulo: string, resumo: string): string {
    return `${titulo}

${resumo}

Qual sua opinião sobre isso? Comenta aqui embaixo! 👇

#conteudo #socialmedia #marketing`;
  }

  private static proposeCTA(titulo: string, descricao: string): string {
    if (descricao.toLowerCase().includes('produto') || descricao.toLowerCase().includes('serviço')) {
      return 'Acesse o link na bio para saber mais!';
    }
    
    if (titulo.toLowerCase().includes('dica') || titulo.toLowerCase().includes('tutorial')) {
      return 'Salva esse post e compartilha com quem precisa ver!';
    }
    
    return 'Comenta aqui embaixo o que achou! 💬';
  }

  private static extractKeywords(text: string): string[] {
    return text.toLowerCase()
      .split(/\s+/)
      .filter(word => word.length > 3)
      .slice(0, 10);
  }

  /**
   * Simula envio de notificações (stub)
   */
  static async sendNotifications(notifications: NotificationData[]): Promise<void> {
    console.log('📧 Enviando notificações para a equipe:');
    
    notifications.forEach(notification => {
      console.log(`
👤 ${notification.responsavel}
📋 ${notification.titulo}
⏰ Prazo: ${notification.prazo}
🔗 Links: ${notification.midiaLinks.length} arquivo(s)
📝 Briefing: ${notification.briefing.substring(0, 100)}...
      `);
    });
    
    // Aqui seria integração real com Slack, email, etc.
    // Exemplo: await slackAPI.sendMessage(...)
  }
}