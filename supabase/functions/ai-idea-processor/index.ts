import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, idempotency-key',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
};

interface IdeaInput {
  input: string;
  input_type: 'text';
  marca: string;
  content_type: 'pauta' | 'cronograma';
  quantidade?: number;
  context?: {
    user_preferences?: {
      default_brand?: string;
      preferred_channels?: string[];
      content_style?: string;
    };
  };
}

interface GeneratedPauta {
  titulo: string;
  descricao: string;
  marca: string;
  objetivo: 'ATRACAO' | 'NUTRICAO' | 'CONVERSAO';
  tipo: 'EDUCATIVO' | 'HISTORIA' | 'CONVERSAO';
  prioridade: 'LOW' | 'MEDIUM' | 'HIGH';
  gancho: string;
  cta: string;
  script_text: string;
  legenda: string;
  canais: string[];
  categorias_criativos: string[];
  data_publicacao_prevista?: string;
  responsaveis: {
    edicao: string;
    arte: string;
    revisao: string;
  };
  prazo: string;
}

interface GeneratedCronograma {
  items: GeneratedPauta[];
  summary: {
    total: number;
    por_objetivo: {
      ATRACAO: number;
      NUTRICAO: number;
      CONVERSAO: number;
    };
    por_tipo: {
      EDUCATIVO: number;
      HISTORIA: number;
      CONVERSAO: number;
    };
  };
}
class AIIdeaProcessor {
  private openaiApiKey: string;
  private model: string;
  private supabase: any;

  constructor(supabaseClient: any) {
    this.openaiApiKey = Deno.env.get('OPENAI_API_KEY') || '';
    this.model = 'gpt-4o';
    this.supabase = supabaseClient;
  }

  async processIdea(input: IdeaInput): Promise<GeneratedPauta | GeneratedCronograma> {
    console.log('🤖 Processando ideia com OpenAI GPT-4...');
    console.log('💡 Ideia recebida:', input.input.substring(0, 100) + '...');
    console.log('🏷️ Marca selecionada:', input.marca);
    console.log('📊 Tipo de conteúdo:', input.content_type);
    console.log('🔢 Quantidade:', input.quantidade);
    
    if (!this.openaiApiKey) {
      console.log('⚠️ OpenAI API key não configurada, usando processamento heurístico');
      if (input.content_type === 'cronograma') {
        return this.generateHeuristicCronograma(input);
      } else {
        return this.processWithHeuristics(input);
      }
    }

    try {
      // Buscar usuários para sugerir responsáveis
      const [users, brandContext] = await Promise.all([
        this.fetchUsers(),
        this.fetchBrandContext(input.marca)
      ]);
      
      const prompt = input.content_type === 'cronograma' 
        ? this.buildCronogramaPrompt(input, users, brandContext)
        : this.buildPrompt(input, users, brandContext);
        
      const response = await this.callOpenAI(prompt);
      
      if (input.content_type === 'cronograma') {
        const cronograma = this.parseCronogramaResponse(response, input, users);
        console.log('✅ Cronograma gerado com sucesso via OpenAI');
        console.log('📊 Total de pautas:', cronograma.items.length);
        return cronograma;
      } else {
        const pauta = this.parseOpenAIResponse(response, input, users);
        console.log('✅ Pauta gerada com sucesso via OpenAI');
        console.log('📋 Título gerado:', pauta.titulo);
        console.log('🎯 Objetivo classificado:', pauta.objetivo);
        return pauta;
      }
      
    } catch (error) {
      console.error('❌ Erro na OpenAI, fallback para heurísticas:', error);
      if (input.content_type === 'cronograma') {
        return this.generateHeuristicCronograma(input);
      } else {
        return this.processWithHeuristics(input);
      }
    }
  }

  private async fetchUsers(): Promise<any[]> {
    try {
      const { data: users } = await this.supabase
        .from('users')
        .select('id, nome, papel')
        .order('nome');
      
      return users || [];
    } catch (error) {
      console.log('⚠️ Erro ao buscar usuários:', error);
      return [];
    }
  }

  private async fetchBrandContext(brandCode: string): Promise<any> {
    try {
      const { data: brand } = await this.supabase
        .from('brands')
        .select('*')
        .eq('code', brandCode)
        .eq('is_active', true)
        .single();
      
      return brand || null;
    } catch (error) {
      console.log('⚠️ Erro ao buscar contexto da marca:', error);
      return null;
    }
  }

  private buildPrompt(input: IdeaInput, users: any[], brandContext: any): string {
    const { input: idea, marca } = input;
    
    // Mapear usuários por papel
    const usersByRole = users.reduce((acc, user) => {
      if (!acc[user.papel]) acc[user.papel] = [];
      acc[user.papel].push(user);
      return acc;
    }, {} as Record<string, any[]>);

    const editorSuggestion = usersByRole.EDITOR?.[0]?.nome || 'Editor padrão';
    const videoSuggestion = usersByRole.VIDEO?.[0]?.nome || 'Equipe de vídeo';
    const revisorSuggestion = usersByRole.REVISOR?.[0]?.nome || 'Revisor padrão';

    // Contexto da marca do banco de dados
    const brandInfo = brandContext ? {
      name: brandContext.name,
      description: brandContext.description,
      about: brandContext.about
    } : {
      name: marca,
      description: 'Marca não encontrada no banco',
      about: 'Contexto não disponível'
    };

    return `
Você é um especialista em criação de conteúdo para redes sociais e marketing digital. Sua tarefa é INTERPRETAR a ideia fornecida e criar um POST ORIGINAL e CRIATIVO.

CONTEXTO DA MARCA ${brandInfo.name.toUpperCase()}:
Nome: ${brandInfo.name}
Descrição: ${brandInfo.description || 'Não informado'}
Sobre: ${brandInfo.about || 'Não informado'}

TAREFA CRÍTICA: 
1. INTERPRETE a ideia fornecida (não copie literalmente)
2. CRIE um post original e criativo baseado nessa interpretação

MARCA: ${brandInfo.name}

FORMATO OBRIGATÓRIO - Responda EXATAMENTE neste formato:

{
  "titulo": "DATA (DIA DA SEMANA) - PLATAFORMA - Título criativo e original inspirado na ideia",
  "descricao": "--- PLATAFORMA ---\\nHorário: HH:MM\\nTema: Tipo - Título único e criativo\\nGancho: \\"Frase de impacto original\\" (Texto na tela: TEXTO_CHAMATIVO)\\nDesenvolvimento: Descrição criativa do formato, elementos visuais únicos, abordagem inovadora para ${brandInfo.name}\\nCTA: \\"Call to action criativo mencionando ${brandInfo.name}! Link na bio.\\"",
  "marca": "${marca}",
  "objetivo": "ATRACAO|NUTRICAO|CONVERSAO",
  "tipo": "EDUCATIVO|HISTORIA|CONVERSAO", 
  "prioridade": "MEDIUM",
  "gancho": "Frase de impacto ORIGINAL e criativa que desperte curiosidade sobre o tema",
  "cta": "Call to action criativo e específico mencionando ${brandInfo.name} e link na bio",
  "script_text": "Copy Final:\\n\\nTexto ORIGINAL e envolvente sobre o tema, contextualizado para ${brandInfo.name}, com abordagem única, benefícios específicos, storytelling envolvente e call to action forte.\\n\\nStatus: Precisa Gravar\\nTarefas para Edição: Descrição criativa das tarefas de edição\\nSugestão de Trilha Sonora: Tipo de música adequada ao tom do conteúdo",
  "legenda": "Copy final ORIGINAL e criativa para redes sociais com:\\n- Texto único e envolvente\\n- Abordagem inovadora do tema\\n- Storytelling específico para ${brandInfo.name}\\n- Call to action criativo\\n- Hashtags relevantes incluindo #${brandInfo.name.replace(/\\s+/g, '')}",
  "canais": ["Instagram"],
  "categorias_criativos": ["Instagram Feed"],
  "responsaveis": {
    "edicao": "${editorSuggestion}",
    "arte": "${videoSuggestion}",
    "revisao": "${revisorSuggestion}"
  },
  "prazo": "2025-01-20"
}

EXEMPLO PERFEITO (baseado na ideia "demonstrar velocidade de resposta"):
"titulo": "16 DE AGOSTO DE 2025 (SÁBADO) - INSTAGRAM FEED - O Teste dos 3 Segundos que Vai Te Surpreender"
"descricao": "--- INSTAGRAM FEED ---\\nHorário: 10:00\\nTema: Educativo - O Teste dos 3 Segundos que Vai Te Surpreender\\nGancho: \\"Cronômetro na mão: será que conseguimos responder em 3 segundos?\\" (Texto na tela: TESTE DOS 3 SEGUNDOS)\\nDesenvolvimento: Vídeo dinâmico mostrando perguntas sendo feitas e respostas instantâneas da ${brandInfo.name}, com cronômetro na tela, música acelerada e transições rápidas\\nCTA: \\"Quer testar a velocidade da ${brandInfo.name}? Link na bio para teste gratuito!\\""

DIRETRIZES OBRIGATÓRIAS:
1. SEJA CRIATIVO - NÃO copie a ideia literalmente
2. INTERPRETE o conceito e crie algo ORIGINAL e ENVOLVENTE
3. TÍTULO deve ser chamativo e despertar curiosidade (não apenas repetir a ideia)
4. GANCHO deve ser uma pergunta ou afirmação impactante
5. DESENVOLVIMENTO deve ser específico sobre formato, elementos visuais e execução
6. CTA deve ser criativo e específico para ${brandInfo.name}
7. SCRIPT_TEXT deve ter copy final ORIGINAL e envolvente
8. Use o contexto da marca: ${brandInfo.about || brandInfo.description}
9. Crie conteúdo que ENGAJE e CONVERTA, não apenas informe

Responda APENAS com o JSON válido, sem explicações adicionais.
`;
  }

  private buildCronogramaPrompt(input: IdeaInput, users: any[], brandContext: any): string {
    const { input: idea, marca, quantidade } = input;
    
    // Mapear usuários por papel
    const usersByRole = users.reduce((acc, user) => {
      if (!acc[user.papel]) acc[user.papel] = [];
      acc[user.papel].push(user);
      return acc;
    }, {} as Record<string, any[]>);

    const editorSuggestion = usersByRole.EDITOR?.[0]?.nome || 'Editor padrão';
    const videoSuggestion = usersByRole.VIDEO?.[0]?.nome || 'Equipe de vídeo';
    const revisorSuggestion = usersByRole.REVISOR?.[0]?.nome || 'Revisor padrão';

    // Contexto da marca do banco de dados
    const brandInfo = brandContext ? {
      name: brandContext.name,
      description: brandContext.description,
      about: brandContext.about
    } : {
      name: marca,
      description: 'Marca não encontrada no banco',
      about: 'Contexto não disponível'
    };

    return `
Você é um especialista em criação de cronogramas de conteúdo para redes sociais. Sua tarefa é INTERPRETAR o tema fornecido e criar ${quantidade} POSTS ORIGINAIS e CRIATIVOS.

CONTEXTO DA MARCA ${brandInfo.name.toUpperCase()}:
Nome: ${brandInfo.name}
Descrição: ${brandInfo.description || 'Não informado'}
Sobre: ${brandInfo.about || 'Não informado'}

TAREFA CRÍTICA: 
1. INTERPRETE o tema "${idea}" (não copie literalmente)
2. CRIE ${quantidade} posts ÚNICOS e CRIATIVOS inspirados nesse tema
3. VARIE formatos, abordagens e ângulos
4. DESENVOLVA conteúdo específico para ${brandInfo.name}
5. CADA post deve ser ORIGINAL e ENVOLVENTE

TEMA PARA INTERPRETAR: "${idea}"

IMPORTANTE: NÃO repita o tema literalmente. Use-o como INSPIRAÇÃO para criar posts únicos e criativos.
FORMATO OBRIGATÓRIO para cada post - siga EXATAMENTE este padrão:

{
  "items": [
    {
      "titulo": "DATA (DIA DA SEMANA) - PLATAFORMA - Título criativo e original inspirado no tema",
      "descricao": "--- PLATAFORMA ---\\nHorário: HH:MM\\nTema: Tipo - Título único e envolvente\\nGancho: \\"Pergunta ou afirmação impactante\\" (Texto na tela: TEXTO_CHAMATIVO)\\nDesenvolvimento: Formato criativo (vídeo/carrossel/story), elementos visuais específicos, abordagem inovadora para ${brandInfo.name}\\nCTA: \\"Call to action criativo e específico para ${brandInfo.name}! Link na bio.\\"",
      "marca": "${marca}",
      "objetivo": "ATRACAO|NUTRICAO|CONVERSAO",
      "tipo": "EDUCATIVO|HISTORIA|CONVERSAO",
      "prioridade": "MEDIUM",
      "gancho": "Pergunta ou afirmação ORIGINAL que desperte curiosidade sobre o tema",
      "cta": "Call to action criativo e específico mencionando ${brandInfo.name} e link na bio",
      "script_text": "Copy Final:\\n\\nTexto ORIGINAL e envolvente inspirado no tema, contextualizado para ${brandInfo.name}, com abordagem única, storytelling criativo, benefícios específicos e call to action forte.\\n\\nStatus: Precisa Gravar\\nTarefas para Edição: Descrição criativa e específica das tarefas de edição\\nSugestão de Trilha Sonora: Tipo de música adequada ao tom e energia do conteúdo",
      "legenda": "Copy final ORIGINAL e criativa inspirada no tema para ${brandInfo.name}, com texto único, abordagem inovadora, storytelling envolvente, call to action criativo e hashtags relevantes incluindo #${brandInfo.name.replace(/\\s+/g, '')}",
      "canais": ["Instagram"],
      "categorias_criativos": ["Instagram Feed"],
      "responsaveis": {
        "edicao": "${editorSuggestion}",
        "arte": "${videoSuggestion}",
        "revisao": "${revisorSuggestion}"
      },
      "prazo": "2025-01-20"
    }
  ],
  "summary": {
    "total": ${quantidade},
    "por_objetivo": {
      "ATRACAO": 0,
      "NUTRICAO": 0,
      "CONVERSAO": 0
    },
    "por_tipo": {
      "EDUCATIVO": 0,
      "HISTORIA": 0,
      "CONVERSAO": 0
    }
  }
}

EXEMPLO PERFEITO (tema "velocidade de resposta" → post criativo):
- CADA post deve ter abordagem DIFERENTE e ORIGINAL
- NÃO repita palavras ou frases da ideia original
- SEJA CRIATIVO com títulos, ganchos e desenvolvimento
- Varie datas, horários e formatos
- Use contexto da ${brandInfo.name}: ${brandInfo.about || brandInfo.description}
- Copy final deve ser ORIGINAL e ENVOLVENTE
- Inclua sempre status, tarefas criativas e trilha sonora no script_text

Responda APENAS com o JSON válido, sem explicações adicionais.
`;
  }

  private async callOpenAI(prompt: string): Promise<string> {
    console.log('🔄 Chamando OpenAI API...');
    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.openaiApiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        messages: [
          {
            role: 'system',
            content: 'Você é um especialista em criação de conteúdo para redes sociais e marketing digital. Responda sempre com JSON válido e completo.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.8,
        max_tokens: 2000,
        response_format: { type: 'json_object' }
      })
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('❌ OpenAI API Error:', error);
      throw new Error(`OpenAI API Error: ${error.error?.message || response.statusText}`);
    }

    const data = await response.json();
    console.log('✅ OpenAI response received');
    console.log('📊 Tokens used:', data.usage);
    
    return data.choices[0]?.message?.content || '';
  }

  private parseOpenAIResponse(response: string, input: IdeaInput, users: any[]): GeneratedPauta {
    try {
      console.log('🔍 Parsing OpenAI response...');
      const parsed = JSON.parse(response);
      
      // Validar campos obrigatórios
      const required = ['titulo', 'descricao', 'gancho', 'cta', 'script_text', 'legenda'];
      for (const field of required) {
        if (!parsed[field]) {
          throw new Error(`Campo obrigatório ausente: ${field}`);
        }
      }

      // Mapear responsáveis por nome para ID
      const responsaveis = this.mapResponsaveis(parsed.responsaveis || {}, users);

      // Gerar prazo padrão se não fornecido
      const prazo = parsed.prazo || this.generateDefaultDeadline();

      const result: GeneratedPauta = {
        titulo: parsed.titulo,
        descricao: parsed.descricao,
        marca: input.marca,
        objetivo: this.validateEnum(parsed.objetivo, ['ATRACAO', 'NUTRICAO', 'CONVERSAO'], 'ATRACAO'),
        tipo: this.validateEnum(parsed.tipo, ['EDUCATIVO', 'HISTORIA', 'CONVERSAO'], 'EDUCATIVO'),
        prioridade: this.validateEnum(parsed.prioridade, ['LOW', 'MEDIUM', 'HIGH'], 'MEDIUM'),
        gancho: parsed.gancho,
        cta: parsed.cta,
        script_text: parsed.script_text,
        legenda: parsed.legenda,
        canais: Array.isArray(parsed.canais) ? parsed.canais : ['Instagram', 'Reels'],
        categorias_criativos: Array.isArray(parsed.categorias_criativos) ? parsed.categorias_criativos : ['Instagram Reels'],
        responsaveis,
        prazo
      };

      console.log('✅ Pauta parseada com sucesso:', {
        titulo: result.titulo,
        objetivo: result.objetivo,
        tipo: result.tipo,
        responsaveis: result.responsaveis
      });

      return result;
    } catch (error) {
      console.error('❌ Erro ao parsear resposta da OpenAI:', error);
      console.log('📄 Raw response:', response);
      throw new Error('Resposta da IA inválida - usando fallback');
    }
  }

  private mapResponsaveis(responsaveisNomes: any, users: any[]): { edicao: string; arte: string; revisao: string } {
    const findUserByRole = (role: string) => {
      return users.find(u => u.papel === role)?.id || '';
    };

    const findUserByName = (name: string) => {
      return users.find(u => u.nome.toLowerCase().includes(name.toLowerCase()))?.id || '';
    };

    return {
      edicao: findUserByRole('EDITOR') || findUserByName(responsaveisNomes.edicao || '') || '',
      arte: findUserByRole('VIDEO') || findUserByName(responsaveisNomes.arte || '') || '',
      revisao: findUserByRole('REVISOR') || findUserByName(responsaveisNomes.revisao || '') || ''
    };
  }

  private generateDefaultDeadline(): string {
    const deadline = new Date();
    deadline.setDate(deadline.getDate() + 5); // 5 dias a partir de hoje
    return deadline.toISOString().split('T')[0];
  }

  private validateEnum<T extends string>(value: any, validValues: T[], defaultValue: T): T {
    return validValues.includes(value) ? value : defaultValue;
  }

  // Fallback heurístico quando OpenAI não está disponível
  private async processWithHeuristics(input: IdeaInput): Promise<GeneratedPauta> {
    const { input: idea, marca } = input;
    
    console.log('🔧 Processando com heurísticas (OpenAI indisponível)...');

    // Buscar contexto da marca do banco de dados
    const brandContext = await this.fetchBrandContext(marca);
    console.log('🏷️ Contexto da marca carregado:', brandContext?.name || 'Não encontrado');

    // Análise básica do texto
    const lowerIdea = idea.toLowerCase();
    const brandDescription = brandContext?.description?.toLowerCase() || '';
    const brandAbout = brandContext?.about?.toLowerCase() || '';
    
    // Classificar objetivo baseado na ideia E no contexto da marca
    let objetivo: 'ATRACAO' | 'NUTRICAO' | 'CONVERSAO' = 'ATRACAO';
    if (lowerIdea.includes('venda') || lowerIdea.includes('compra') || lowerIdea.includes('promocao') || lowerIdea.includes('desconto')) {
      objetivo = 'CONVERSAO';
    } else if (lowerIdea.includes('beneficio') || lowerIdea.includes('vantagem') || lowerIdea.includes('resultado') || lowerIdea.includes('antes e depois')) {
      objetivo = 'NUTRICAO';
    } else if (brandDescription.includes('educativo') || brandAbout.includes('ensinar') || brandAbout.includes('educar')) {
      objetivo = 'ATRACAO'; // Manter como atração para marcas educativas
    }

    // Classificar tipo baseado na ideia E no contexto da marca
    let tipo: 'EDUCATIVO' | 'HISTORIA' | 'CONVERSAO' = 'EDUCATIVO';
    if (lowerIdea.includes('historia') || lowerIdea.includes('experiencia') || lowerIdea.includes('caso') || lowerIdea.includes('relato')) {
      tipo = 'HISTORIA';
    } else if (objetivo === 'CONVERSAO') {
      tipo = 'CONVERSAO';
    } else if (brandAbout.includes('tutorial') || brandAbout.includes('ensino') || brandAbout.includes('educacao')) {
      tipo = 'EDUCATIVO'; // Reforçar tipo educativo para marcas educacionais
    }

    // Gerar título no formato de cronograma
    const titulo = this.generateCronogramaTitle(idea, brandContext);
    
    // Gerar descrição no formato de cronograma
    const descricao = this.generateCronogramaDescription(idea, brandContext);
    
    // Gerar gancho específico
    const gancho = this.generateSpecificHook(idea, brandContext);
    
    // Gerar CTA específico
    const cta = this.generateSpecificCTA(idea, brandContext);
    
    // Gerar script no formato completo
    const script_text = this.generateCompleteScript(idea, brandContext);
    
    // Gerar legenda final
    const legenda = this.generateFinalLegenda(idea, brandContext);

    // Canais baseados na marca
    const canais = this.getChannelsForBrand(marca, brandContext);
    
    // Categorias baseadas nos canais
    const categorias_criativos = this.getCategoriesForChannels(canais);

    return {
      titulo,
      descricao,
      marca,
      objetivo,
      tipo,
      prioridade: 'MEDIUM',
      gancho,
      cta,
      script_text,
      legenda,
      canais,
      categorias_criativos,
      responsaveis: {
        edicao: 'Editor padrão',
        arte: 'Equipe de vídeo',
        revisao: 'Revisor padrão'
      },
      prazo: this.generateDefaultDeadline()
    };
  }

  private generateCronogramaTitle(idea: string, brandContext?: any): string {
    const today = new Date();
    const targetDate = new Date(today.getTime() + 3 * 24 * 60 * 60 * 1000); // 3 dias
    const dayNames = ['DOMINGO', 'SEGUNDA', 'TERÇA', 'QUARTA', 'QUINTA', 'SEXTA', 'SÁBADO'];
    const dayName = dayNames[targetDate.getDay()];
    const day = targetDate.getDate().toString().padStart(2, '0');
    const month = (targetDate.getMonth() + 1).toString().padStart(2, '0');
    const year = targetDate.getFullYear();
    const dateStr = `${day} DE ${month} DE ${year}`;
    
    // Criar título criativo baseado na ideia, não copiá-la
    const creativeTitles = [
      'O Segredo que Vai Mudar Sua Perspectiva',
      'O Teste que Todo Mundo Deveria Fazer',
      'A Descoberta que Surpreendeu a Todos',
      'O Método que Está Revolucionando',
      'A Verdade que Poucos Conhecem'
    ];
    
    const randomTitle = creativeTitles[Math.floor(Math.random() * creativeTitles.length)];
    return `${dateStr} (${dayName}) - INSTAGRAM FEED - ${randomTitle}`;
  }

  private generateCronogramaDescription(idea: string, brandContext?: any): string {
    const brandName = brandContext?.name || 'nossa marca';
    const time = '10:00';
    
    // Criar desenvolvimento criativo baseado na ideia
    const creativeApproaches = [
      `Vídeo dinâmico com demonstração prática, mostrando como a ${brandName} resolve o problema de forma inovadora`,
      `Carrossel explicativo com infográficos coloridos, revelando insights únicos sobre o tema`,
      `Story interativo com enquetes e perguntas, engajando o público sobre o assunto`,
      `Vídeo com depoimentos reais e resultados surpreendentes da ${brandName}`,
      `Tutorial passo a passo com dicas exclusivas e abordagem diferenciada`
    ];
    
    const randomApproach = creativeApproaches[Math.floor(Math.random() * creativeApproaches.length)];
    
    return `--- INSTAGRAM FEED ---
Horário: ${time}
Tema: Educativo - Revelação Surpreendente
Gancho: "Você não vai acreditar no que descobrimos!" (Texto na tela: DESCOBERTA INCRÍVEL)
Desenvolvimento: ${randomApproach}
CTA: "Quer descobrir mais? Teste a ${brandName} gratuitamente! Link na bio."`;
  }

  private generateSpecificHook(idea: string, brandContext?: any): string {
    const brandName = brandContext?.name || 'nossa marca';
    
    const creativeHooks = [
      `Você não vai acreditar no que descobrimos sobre isso!`,
      `O teste que fizemos vai te surpreender...`,
      `A verdade que ninguém te conta sobre esse assunto`,
      `O segredo que mudou tudo para nossos clientes`,
      `O resultado que nem nós esperávamos!`
    ];
    
    return creativeHooks[Math.floor(Math.random() * creativeHooks.length)];
  }

  private generateSpecificCTA(idea: string, brandContext?: any): string {
    const brandName = brandContext?.name || 'nossa marca';
    
    const creativeCTAs = [
      `Quer testar isso na prática? Experimente a ${brandName} gratuitamente! Link na bio.`,
      `Pronto para descobrir mais? Teste a ${brandName} agora! Link na bio.`,
      `Curioso para saber como funciona? Faça seu teste gratuito da ${brandName}! Link na bio.`,
      `Quer ver isso em ação? Comece seu teste gratuito! Link na bio.`,
      `Interessado em experimentar? Teste a ${brandName} sem compromisso! Link na bio.`
    ];
    
    return creativeCTAs[Math.floor(Math.random() * creativeCTAs.length)];
  }

  private generateCompleteScript(idea: string, brandContext?: any): string {
    const brandName = brandContext?.name || 'nossa marca';
    const brandAbout = brandContext?.about || 'nosso contexto';
    
    // Criar copy específica baseada na ideia + contexto da marca
    let intro = `${idea} - vamos falar sobre isso!`;
    
    if (brandAbout) {
      if (brandAbout.includes('beleza') || brandAbout.includes('estetica')) {
        intro = `${idea} - e como isso se relaciona com sua jornada de beleza e autoestima!`;
      } else if (brandAbout.includes('negocio') || brandAbout.includes('empreend')) {
        intro = `${idea} - e como isso pode impactar seu negócio!`;
      } else if (brandAbout.includes('rural') || brandAbout.includes('agricultura')) {
        intro = `${idea} - a realidade do campo que você precisa conhecer!`;
      } else if (brandAbout.includes('lifestyle') || brandAbout.includes('moda')) {
        intro = `${idea} - e como isso pode elevar seu estilo!`;
      } else {
        intro = `${idea} - vamos explorar isso juntos!`;
      }
    }
    
    return `Copy Final:

${intro}

${brandAbout ? `Na ${brandName}, ${brandAbout}` : `A ${brandName} está aqui para ajudar você!`}

${this.generateContextualCTA(brandAbout, brandName)}

#${brandName.replace(/\s+/g, '')} #Inovacao #Transformacao #ResultadosReais #TesteGratuito

Status: Precisa Gravar
Tarefas para Edição: Criação de conteúdo visual adequado ao universo da ${brandName}
Sugestão de Trilha Sonora: Música adequada ao tom da ${brandName}`;
  }

  private generateFinalLegenda(idea: string, brandContext?: any): string {
    const brandName = brandContext?.name || 'nossa marca';
    const brandAbout = brandContext?.about || '';
    
    // Combinar ideia com contexto específico da marca
    let opener = `${idea} ✨`;
    
    if (brandAbout) {
      if (brandAbout.includes('beleza') || brandAbout.includes('estetica')) {
        opener = `${idea} - e como isso pode transformar sua autoestima! ✨`;
      } else if (brandAbout.includes('negocio') || brandAbout.includes('empreend')) {
        opener = `${idea} - estratégia que pode mudar seu negócio! 🚀`;
      } else if (brandAbout.includes('rural') || brandAbout.includes('agricultura')) {
        opener = `${idea} - a realidade do campo! 🌱`;
      } else {
        opener = `${idea} - vamos falar sobre isso! ✨`;
      }
    }
    
    return `${opener}

${brandAbout ? `Na ${brandName}, ${brandAbout}` : `A ${brandName} está aqui para você!`}

${this.generateContextualCTA(brandAbout, brandName)}

#${brandName.replace(/\s+/g, '')} #Inovacao #Transformacao #ResultadosReais #TesteGratuito`;
  }

  private generateDescription(idea: string, brandContext?: any): string {
    // Usar contexto específico da marca para adaptar a descrição
    const brandName = brandContext?.name || 'nossa marca';
    const brandAbout = brandContext?.about || '';
    
    if (brandAbout) {
      // Adaptar a ideia ao contexto específico da marca
      return `${idea} - Conteúdo desenvolvido especificamente para o universo da ${brandName}, considerando: ${brandAbout}`;
    }
    
    return `${idea} - Conteúdo criado para o público da ${brandName}.`;
  }

  private generateHook(idea: string, tipo: string, brandContext?: any): string {
    const brandName = brandContext?.name || 'nossa marca';
    const brandAbout = brandContext?.about?.toLowerCase() || '';
    const lowerIdea = idea.toLowerCase();
    
    // Gerar gancho específico baseado na ideia + contexto da marca
    if (brandAbout) {
      // Usar contexto específico da marca para criar gancho relevante
      if (brandAbout.includes('beleza') || brandAbout.includes('estetica')) {
        return `Você sabia que ${lowerIdea} pode transformar sua autoestima?`;
      } else if (brandAbout.includes('negocio') || brandAbout.includes('empreend')) {
        return `Como ${lowerIdea} pode revolucionar seu negócio?`;
      } else if (brandAbout.includes('rural') || brandAbout.includes('agricultura')) {
        return `${idea} - a realidade que todo produtor rural precisa conhecer!`;
      } else if (brandAbout.includes('lifestyle') || brandAbout.includes('moda')) {
        return `${idea} - o segredo de estilo que vai elevar seu look!`;
      } else {
        return `${idea} - você precisa saber disso!`;
      }
    }
    
    // Fallback genérico baseado na ideia
    return `${idea} - você precisa saber disso!`;
  }

  private generateCTA(objetivo: string, brandContext?: any): string {
    const brandAbout = brandContext?.about?.toLowerCase() || '';
    const brandName = brandContext?.name || 'nossa marca';
    
    // Gerar CTA específico baseado no contexto da marca
    if (brandAbout) {
      if (brandAbout.includes('consulta') || brandAbout.includes('agendamento')) {
        return objetivo === 'CONVERSAO' 
          ? 'Acesse o link na bio e agende sua consulta!'
          : 'Comenta aqui embaixo suas dúvidas que eu respondo!';
      } else if (brandAbout.includes('curso') || brandAbout.includes('ensino')) {
        return objetivo === 'CONVERSAO'
          ? 'Link na bio para saber mais sobre nossos cursos!'
          : 'Salva esse post e compartilha com quem está estudando!';
      } else if (brandAbout.includes('produto') || brandAbout.includes('venda')) {
        return objetivo === 'CONVERSAO'
          ? 'Link na bio para conhecer nossos produtos!'
          : 'Marca uma amiga que precisa saber disso!';
      } else if (brandAbout.includes('rural') || brandAbout.includes('agricultura')) {
        return 'Comenta aqui: como é isso na sua região?';
      } else if (brandAbout.includes('beleza') || brandAbout.includes('estetica')) {
        return objetivo === 'CONVERSAO'
          ? 'DM para agendar sua avaliação!'
          : 'Marca aquela amiga que precisa ver isso!';
      }
    }
    
    // Fallback baseado no objetivo
    return objetivo === 'CONVERSAO'
      ? 'Link na bio para saber mais!'
      : 'Comenta aqui embaixo o que achou!';
  }

  private generateScript(titulo: string, idea: string, gancho: string, cta: string, brandContext?: any): string {
    const brandName = brandContext?.name || 'nossa empresa';
    const brandAbout = brandContext?.about || 'nosso contexto';
    
    // Desenvolvimento baseado na ideia + contexto da marca
    const desenvolvimento = `${idea}

Desenvolva este tema considerando o contexto específico da ${brandName}: ${brandAbout}

Use linguagem adequada ao público da marca e abordagem coerente com o universo descrito no contexto.`;

    return `GANCHO (0-3s):
${gancho}

DESENVOLVIMENTO (3-25s):
${desenvolvimento}

Use linguagem adequada ao contexto da ${brandName} e exemplos relevantes ao universo da marca.

CTA (25-30s):
${cta}`;
  }

  private generateLegenda(titulo: string, idea: string, marca: string, brandContext?: any): string {
    const brandName = brandContext?.name || marca;
    const brandAbout = brandContext?.about || '';
    const hashtags = this.generateHashtagsForBrand(marca, brandContext);
    const emoji = this.getEmojiForBrand(marca);
    
    // Combinar ideia com contexto da marca
    let legendaText = `${idea} ${emoji}`;
    
    // Adicionar contexto da marca se disponível
    if (brandAbout) {
      legendaText += `\n\nNa ${brandName}, ${brandAbout.substring(0, 100)}...`;
    }
    
    // Pergunta de engajamento baseada no contexto da marca
    let perguntaEngajamento = 'O que você achou? Comenta aqui embaixo! 👇';
    
    if (brandAbout) {
      if (brandAbout.includes('beleza') || brandAbout.includes('estetica')) {
        perguntaEngajamento = 'Qual sua experiência com isso? Conta aqui! 💄👇';
      } else if (brandAbout.includes('negocio') || brandAbout.includes('empreend')) {
        perguntaEngajamento = 'Como você aplica isso no seu negócio? Compartilha! 🚀👇';
      } else if (brandAbout.includes('rural') || brandAbout.includes('agricultura')) {
        perguntaEngajamento = 'Como é isso na sua região? Conta pra gente! 🌱👇';
      } else if (brandAbout.includes('lifestyle') || brandAbout.includes('moda')) {
        perguntaEngajamento = 'Qual seu estilo favorito? Mostra nos comentários! ✨👇';
      }
    }
    
    return `${legendaText}

${perguntaEngajamento}

${hashtags}`;
  }

  private generateHashtagsForBrand(marca: string, brandContext?: any): string {
    // Hashtags baseadas no campo 'about' da marca
    if (brandContext?.about) {
      const about = brandContext.about.toLowerCase();
      let customHashtags = `#${brandContext.name.toLowerCase().replace(/\s+/g, '')} `;
      
      // Extrair hashtags relevantes do contexto 'about' da marca
      if (about.includes('beleza')) customHashtags += '#beleza #estetica #autoestima ';
      if (about.includes('skincare')) customHashtags += '#skincare #cuidados #pele ';
      if (about.includes('negocio')) customHashtags += '#empreendedorismo #negocios #sucesso ';
      if (about.includes('marketing')) customHashtags += '#marketing #vendas #digital ';
      if (about.includes('rural')) customHashtags += '#rural #agricultura #sustentabilidade ';
      if (about.includes('lifestyle')) customHashtags += '#lifestyle #moda #estilo ';
      if (about.includes('harmonizacao')) customHashtags += '#harmonizacaofacial #procedimentos ';
      if (about.includes('curso')) customHashtags += '#educacao #aprendizado #curso ';
      if (about.includes('consultoria')) customHashtags += '#consultoria #mentoria #estrategia ';
      
      return customHashtags.trim();
    }
    
    // Fallback para hashtags padrão por marca
    const brandHashtags = {
      'RAYTCHEL': '#raytchel #beleza #estetica #harmonizacaofacial #skincare #autoestima #cuidados',
      'ZAFFIRA': '#zaffira #lifestyle #moda #beleza #premium #sofisticacao #estilo',
      'ZAFF': '#zaff #jovem #lifestyle #tendencias #moda #descontraido #vibes',
      'CRISPIM': '#crispim #empreendedorismo #negocios #marketing #vendas #sucesso #dicas',
      'FAZENDA': '#fazenda #rural #sustentabilidade #agricultura #vidanocampo #natureza'
    };
    
    return brandHashtags[marca as keyof typeof brandHashtags] || '#conteudo #socialmedia #marketing';
  }

  private getEmojiForBrand(marca: string): string {
    const brandEmojis = {
      'RAYTCHEL': '✨',
      'ZAFFIRA': '💎',
      'ZAFF': '🌟',
      'CRISPIM': '🚀',
      'FAZENDA': '🌱'
    };
    
    return brandEmojis[marca as keyof typeof brandEmojis] || '✨';
  }

  private getChannelsForBrand(marca: string, brandContext?: any): string[] {
    // Canais baseados no campo 'about' da marca
    if (brandContext?.about) {
      const about = brandContext.about.toLowerCase();
      const channels: string[] = ['Instagram']; // Base para todas
      
      if (about.includes('jovem') || about.includes('tiktok')) channels.push('TikTok');
      if (about.includes('profissional') || about.includes('negocio')) channels.push('LinkedIn');
      if (about.includes('video') || about.includes('tutorial')) channels.push('YouTube');
      if (about.includes('b2b') || about.includes('empresarial')) channels.push('LinkedIn');
      if (about.includes('educativo') || about.includes('curso')) channels.push('YouTube');
      if (about.includes('stories')) channels.push('Stories');
      if (about.includes('reels')) channels.push('Reels');
      
      return channels.length > 1 ? channels : ['Instagram', 'Reels', 'Stories'];
    }
    
    // Fallback para canais padrão por marca
    const brandChannels = {
      'RAYTCHEL': ['Instagram', 'Reels', 'Stories', 'TikTok'],
      'ZAFFIRA': ['Instagram', 'Stories', 'LinkedIn', 'Pinterest'],
      'ZAFF': ['Instagram', 'TikTok', 'Reels', 'Stories'],
      'CRISPIM': ['Instagram', 'LinkedIn', 'YouTube', 'Stories'],
      'FAZENDA': ['Instagram', 'Facebook', 'YouTube', 'Stories']
    };
    
    return brandChannels[marca as keyof typeof brandChannels] || ['Instagram', 'Reels', 'Stories'];
  }

  private getCategoriesForChannels(canais: string[]): string[] {
    const categories: string[] = [];
    
    canais.forEach(canal => {
      switch (canal) {
        case 'Instagram':
          categories.push('Instagram Feed');
          break;
        case 'Reels':
          categories.push('Instagram Reels');
          break;
        case 'Stories':
          categories.push('Instagram Stories');
          break;
        case 'TikTok':
          categories.push('TikTok');
          break;
        case 'YouTube':
          categories.push('YouTube');
          break;
        case 'LinkedIn':
          categories.push('LinkedIn');
          break;
        default:
          categories.push(canal);
      }
    });
    
    return [...new Set(categories)];
  }

  private generateContextualCTA(brandAbout: string, brandName: string): string {
    if (!brandAbout) return 'Link na bio para saber mais!';
    
    if (brandAbout.includes('consulta') || brandAbout.includes('agendamento')) {
      return 'Quer saber mais? Link na bio para agendar sua consulta!';
    } else if (brandAbout.includes('curso') || brandAbout.includes('ensino')) {
      return 'Interessado? Link na bio para conhecer nossos cursos!';
    } else if (brandAbout.includes('produto') || brandAbout.includes('venda')) {
      return 'Conheça nossos produtos! Link na bio.';
    } else if (brandAbout.includes('consultoria') || brandAbout.includes('mentoria')) {
      return 'Precisa de ajuda? Link na bio para nossa consultoria!';
    } else {
      return 'Quer saber mais? Link na bio!';
    }
  }

  private generateHeuristicCronograma(input: IdeaInput): GeneratedCronograma {
    const quantidade = input.quantidade || 5;
    const items: GeneratedPauta[] = [];
    
    // Templates de variação para cronograma
    const templates = [
      'Como fazer',
      'Dicas para',
      'Tutorial de',
      'Segredos de',
      'Guia completo de',
      'Passo a passo para',
      'Erros comuns em',
      'Benefícios de',
      'Antes e depois de',
      'Experiência com'
    ];
    
    const objetivos: ('ATRACAO' | 'NUTRICAO' | 'CONVERSAO')[] = ['ATRACAO', 'NUTRICAO', 'CONVERSAO'];
    const tipos: ('EDUCATIVO' | 'HISTORIA' | 'CONVERSAO')[] = ['EDUCATIVO', 'HISTORIA', 'CONVERSAO'];
    
    for (let i = 0; i < quantidade; i++) {
      const template = templates[i % templates.length];
      const objetivo = objetivos[Math.floor(Math.random() * objetivos.length)];
      const tipo = tipos[Math.floor(Math.random() * tipos.length)];
      
      // Criar variação da ideia original
      const ideaVariacao = `${template} ${input.input.toLowerCase()}`;
      
      const pauta = this.processWithHeuristics({
        ...input,
        input: ideaVariacao
      });
      
      // Personalizar com base no template
      pauta.titulo = `${template} ${input.input}`.substring(0, 80);
      pauta.objetivo = objetivo;
      pauta.tipo = tipo;
      pauta.prioridade = i < 2 ? 'HIGH' : i < quantidade * 0.7 ? 'MEDIUM' : 'LOW';
      
      // Ajustar prazo baseado na prioridade
      const deadline = new Date();
      deadline.setDate(deadline.getDate() + (i + 3));
      pauta.prazo = deadline.toISOString().split('T')[0];
      
      items.push(pauta);
    }
    
    // Calcular estatísticas
    const summary = {
      total: items.length,
      por_objetivo: {
        ATRACAO: items.filter(p => p.objetivo === 'ATRACAO').length,
        NUTRICAO: items.filter(p => p.objetivo === 'NUTRICAO').length,
        CONVERSAO: items.filter(p => p.objetivo === 'CONVERSAO').length,
      },
      por_tipo: {
        EDUCATIVO: items.filter(p => p.tipo === 'EDUCATIVO').length,
        HISTORIA: items.filter(p => p.tipo === 'HISTORIA').length,
        CONVERSAO: items.filter(p => p.tipo === 'CONVERSAO').length,
      }
    };
    
    return { items, summary };
  }

  private parseCronogramaResponse(response: string, input: IdeaInput, users: any[]): GeneratedCronograma {
    try {
      const parsed = JSON.parse(response);
      
      if (!parsed.items || !Array.isArray(parsed.items)) {
        throw new Error('Resposta inválida: items não encontrado');
      }
      
      const items: GeneratedPauta[] = parsed.items.map((item: any) => {
        const responsaveis = this.mapResponsaveis(item.responsaveis || {}, users);
        
        return {
          titulo: item.titulo || 'Título gerado',
          descricao: item.descricao || 'Descrição gerada',
          marca: input.marca,
          objetivo: this.validateEnum(item.objetivo, ['ATRACAO', 'NUTRICAO', 'CONVERSAO'], 'ATRACAO'),
          tipo: this.validateEnum(item.tipo, ['EDUCATIVO', 'HISTORIA', 'CONVERSAO'], 'EDUCATIVO'),
          prioridade: this.validateEnum(item.prioridade, ['LOW', 'MEDIUM', 'HIGH'], 'MEDIUM'),
          gancho: item.gancho || 'Gancho gerado',
          cta: item.cta || 'CTA gerado',
          script_text: item.script_text || 'Roteiro gerado',
          legenda: item.legenda || 'Legenda gerada',
          canais: Array.isArray(item.canais) ? item.canais : ['Instagram', 'Reels'],
          categorias_criativos: Array.isArray(item.categorias_criativos) ? item.categorias_criativos : ['Instagram Reels'],
          responsaveis,
          prazo: item.prazo || this.generateDefaultDeadline()
        };
      });
      
      // Calcular estatísticas
      const summary = {
        total: items.length,
        por_objetivo: {
          ATRACAO: items.filter(p => p.objetivo === 'ATRACAO').length,
          NUTRICAO: items.filter(p => p.objetivo === 'NUTRICAO').length,
          CONVERSAO: items.filter(p => p.objetivo === 'CONVERSAO').length,
        },
        por_tipo: {
          EDUCATIVO: items.filter(p => p.tipo === 'EDUCATIVO').length,
          HISTORIA: items.filter(p => p.tipo === 'HISTORIA').length,
          CONVERSAO: items.filter(p => p.tipo === 'CONVERSAO').length,
        }
      };
      
      return { items, summary };
      
    } catch (error) {
      console.error('❌ Erro ao parsear cronograma da OpenAI:', error);
      throw new Error('Resposta da IA inválida para cronograma');
    }
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

    // POST /ai-idea-processor - Transform idea into complete OS
    if (req.method === 'POST') {
      const body = await req.json() as IdeaInput;
      
      // Get user context for API key lookup
      const authHeader = req.headers.get('Authorization');
      let userOrgId = null;
      
      if (authHeader?.startsWith('Bearer ')) {
        try {
          const userClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_ANON_KEY') ?? '',
            {
              global: { headers: { Authorization: authHeader } },
              auth: { autoRefreshToken: false, persistSession: false }
            }
          );
          
          const { data: { user } } = await userClient.auth.getUser();
          if (user) {
            const { data: userData } = await supabaseClient
              .from('users')
              .select('org_id')
              .eq('email', user.email)
              .single();
            userOrgId = userData?.org_id;
          }
        } catch (err) {
          console.log('Error getting user org:', err);
        }
      }

      // Add org context to input
      body.context = {
        ...body.context,
        user_preferences: {
          ...body.context?.user_preferences,
          org_id: userOrgId
        }
      };

      if (!body.input || typeof body.input !== 'string') {
        return new Response(
          JSON.stringify({ error: 'Campo "input" é obrigatório' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (!body.marca) {
        return new Response(
          JSON.stringify({ error: 'Campo "marca" é obrigatório' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log(`🎯 Processando ${body.content_type} para marca ${body.marca}: "${body.input.substring(0, 50)}..."`);
      
      const processor = new AIIdeaProcessor(supabaseClient);
      const result = await processor.processIdea(body);
      
      if (body.content_type === 'cronograma') {
        console.log(`✅ Cronograma completo gerado: ${result.summary?.total || 0} pautas`);
      } else {
        console.log(`✅ Pauta completa gerada: "${result.titulo}"`);
      }

      // Log da geração para auditoria
      try {
        await supabaseClient.from('logs_evento').insert({
          os_id: null,
          user_id: null,
          acao: 'AI_IDEA_GENERATED',
          detalhe: body.content_type === 'cronograma' 
            ? `Cronograma gerado: ${result.summary?.total || 0} pautas (${body.marca})`
            : `Ideia transformada em pauta: ${result.titulo} (${body.marca})`,
          timestamp: new Date().toISOString()
        });
      } catch (logError) {
        console.log('⚠️ Erro ao criar log (não crítico):', logError);
      }

      return new Response(
        JSON.stringify(result),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Método não suportado' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('AI Idea Processor Error:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        fallback: 'Sistema funcionando com processamento heurístico'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});