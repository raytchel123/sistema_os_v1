import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, idempotency-key',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
};

interface PlanningRequest {
  brand: string;
  startDate: string;
  endDate: string;
  postsPerDay?: number;
}

interface PostSuggestion {
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
  brand_code: string;
  status: 'SUGGESTION';
  ai_generated: boolean;
}

class PlanningAI {
  private supabase: any;
  private openaiApiKey: string;

  constructor(supabaseClient: any) {
    this.supabase = supabaseClient;
    this.openaiApiKey = Deno.env.get('OPENAI_API_KEY') || '';
  }

  async generateWeeklyPlan(request: PlanningRequest, orgId?: string): Promise<PostSuggestion[]> {
    console.log('🎯 Gerando plano semanal para:', request.brand);

    try {
      // Buscar contexto da marca
      const brandContext = await this.fetchBrandContext(request.brand);
      
      // Buscar token personalizado da organização
      const customApiKey = await this.getCustomOpenAIKey(orgId);
      const apiKey = customApiKey || this.openaiApiKey;

      let suggestions: PostSuggestion[];

      if (!apiKey) {
        console.log('⚠️ OpenAI API key não disponível, usando geração heurística');
        suggestions = this.generateHeuristicPlan(request, brandContext);
      } else {
        // Gerar sugestões com IA
        suggestions = await this.generateAIPlan(request, brandContext, apiKey);
      }
      
      // Salvar sugestões no banco de dados
      await this.saveSuggestionsToDatabase(suggestions, orgId);
      
      console.log(`✅ Plano gerado e salvo: ${suggestions.length} postagens`);
      return suggestions;
    } catch (error) {
      console.error('❌ Erro na geração do plano:', error);
      const fallbackSuggestions = this.generateHeuristicPlan(request, null);
      await this.saveSuggestionsToDatabase(fallbackSuggestions, orgId);
      return fallbackSuggestions;
    }
  }

  private async saveSuggestionsToDatabase(suggestions: PostSuggestion[], orgId?: string): Promise<void> {
    try {
      // Primeiro, limpar sugestões existentes para a mesma semana e marca
      if (suggestions.length > 0) {
        const firstDate = suggestions[0].scheduled_date;
        const lastDate = suggestions[suggestions.length - 1].scheduled_date;
        const brandCode = suggestions[0].brand_code;

        await this.supabase
          .from('post_suggestions')
          .delete()
          .eq('org_id', orgId || null)
          .eq('brand_code', brandCode)
          .gte('scheduled_date', firstDate)
          .lte('scheduled_date', lastDate);
      }

      // Inserir novas sugestões
      const suggestionsData = suggestions.map(suggestion => ({
        org_id: orgId || null,
        brand_code: suggestion.brand_code,
        scheduled_date: suggestion.scheduled_date,
        scheduled_time: suggestion.scheduled_time,
        post_type: suggestion.post_type,
        title: suggestion.title,
        description: suggestion.description,
        hook: suggestion.hook,
        development: suggestion.development,
        cta: suggestion.cta,
        copy_final: suggestion.copy_final,
        hashtags: suggestion.hashtags,
        visual_elements: suggestion.visual_elements,
        soundtrack: suggestion.soundtrack,
        thumbnail_url: suggestion.thumbnail_url,
        status: 'SUGGESTION',
        ai_generated: suggestion.ai_generated
      }));

      const { error } = await this.supabase
        .from('post_suggestions')
        .insert(suggestionsData);

      if (error) {
        console.error('❌ Erro ao salvar sugestões:', error);
        throw error;
      } else {
        console.log('✅ Sugestões salvas no banco de dados');
      }
    } catch (error) {
      console.error('❌ Erro ao salvar sugestões:', error);
      throw error;
    }
  }

  async fetchSuggestions(brandCode: string, startDate: string, endDate: string, orgId?: string): Promise<PostSuggestion[]> {
    try {
      const { data: suggestions, error } = await this.supabase
        .from('post_suggestions')
        .select('*')
        .eq('org_id', orgId || null)
        .eq('brand_code', brandCode)
        .gte('scheduled_date', startDate)
        .lte('scheduled_date', endDate)
        .order('scheduled_date')
        .order('scheduled_time');

      if (error) {
        console.error('❌ Erro ao buscar sugestões:', error);
        return [];
      }

      return suggestions || [];
    } catch (error) {
      console.error('❌ Erro ao buscar sugestões:', error);
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

  private async getCustomOpenAIKey(orgId?: string): Promise<string | null> {
    if (!orgId) return null;

    try {
      // Buscar token OpenAI da organização
      const { data: token } = await this.supabase
        .from('api_tokens')
        .select('token_key')
        .eq('org_id', orgId)
        .eq('provider', 'OPENAI')
        .eq('is_active', true)
        .single();

      return token?.token_key || null;
    } catch (error) {
      console.log('⚠️ Token personalizado não encontrado:', error);
      return null;
    }
  }

  private async generateAIPlan(request: PlanningRequest, brandContext: any, apiKey: string): Promise<PostSuggestion[]> {
    const prompt = this.buildPlanningPrompt(request, brandContext);
    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: 'Você é um especialista em planejamento de conteúdo para redes sociais. Crie sugestões criativas e originais baseadas no contexto da marca.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.8,
        max_tokens: 3000,
        response_format: { type: 'json_object' }
      })
    });

    if (!response.ok) {
      throw new Error(`OpenAI API Error: ${response.status}`);
    }

    const data = await response.json();
    const result = JSON.parse(data.choices[0]?.message?.content || '{}');
    
    return this.parseAIResponse(result, request);
  }

  private buildPlanningPrompt(request: PlanningRequest, brandContext: any): string {
    const brandInfo = brandContext ? {
      name: brandContext.name,
      description: brandContext.description,
      about: brandContext.about
    } : {
      name: request.brand,
      description: 'Contexto não disponível',
      about: 'Contexto não disponível'
    };

    const startDate = new Date(request.startDate);
    const endDate = new Date(request.endDate);
    const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;

    return `
Você é um especialista em planejamento de conteúdo para redes sociais. Crie um plano semanal ORIGINAL e CRIATIVO para a marca ${brandInfo.name}.

CONTEXTO DA MARCA:
Nome: ${brandInfo.name}
Descrição: ${brandInfo.description}
Sobre: ${brandInfo.about}

TAREFA: Criar ${days * 2} sugestões de postagens ÚNICAS e CRIATIVAS para ${days} dias, variando tipos e abordagens.

DIRETRIZES OBRIGATÓRIAS:
1. SEJA CRIATIVO - Não use temas genéricos
2. VARIE os tipos: Post, Story, Reels
3. VARIE os objetivos: Atração, Nutrição, Conversão
4. CADA post deve ser ÚNICO e ORIGINAL
5. Use o contexto da marca: ${brandInfo.about}
6. Crie títulos IMPACTANTES e CURIOSOS
7. Ganchos que PRENDEM a atenção
8. CTAs específicos para ${brandInfo.name}

FORMATO OBRIGATÓRIO:
{
  "posts": [
    {
      "scheduled_date": "${request.startDate}",
      "scheduled_time": "10:00",
      "post_type": "POST|STORY|REELS",
      "title": "Título CRIATIVO e IMPACTANTE (não genérico)",
      "description": "--- INSTAGRAM FEED ---\\nHorário: 10:00\\nTema: Tipo - Título único\\nGancho: \\"Pergunta ou afirmação impactante\\" (Texto na tela: TEXTO_CHAMATIVO)\\nDesenvolvimento: Formato específico, elementos visuais únicos, abordagem inovadora\\nCTA: \\"Call to action criativo para ${brandInfo.name}! Link na bio.\\"",
      "hook": "Pergunta ou afirmação ORIGINAL que desperte curiosidade",
      "development": "Descrição detalhada do formato, elementos visuais e execução",
      "cta": "Call to action criativo e específico para ${brandInfo.name}",
      "copy_final": "Copy final ORIGINAL e envolvente para redes sociais com storytelling, benefícios e hashtags",
      "hashtags": ["#${brandInfo.name.replace(/\\s+/g, '')}", "#tema", "#categoria"],
      "visual_elements": ["Elemento visual 1", "Elemento visual 2"],
      "soundtrack": "Tipo de música adequada",
      "thumbnail_url": "https://images.pexels.com/photos/3184291/pexels-photo-3184291.jpeg?auto=compress&cs=tinysrgb&w=400&h=400&fit=crop"
    }
  ]
}

EXEMPLOS DE TÍTULOS CRIATIVOS (NÃO copie, use como inspiração):
- "O Teste dos 3 Segundos que Mudou Tudo"
- "A Descoberta que Ninguém Esperava"
- "O Segredo que 99% das Pessoas Não Conhece"
- "A Transformação que Aconteceu em 24h"

IMPORTANTE: Cada post deve ser ÚNICO, CRIATIVO e ESPECÍFICO para ${brandInfo.name}!

Responda APENAS com o JSON válido.
`;
  }

  private parseAIResponse(result: any, request: PlanningRequest): PostSuggestion[] {
    // Handle both single post and array of posts
    let posts = [];
    if (result.post) {
      // Single post response
      posts = [result.post];
    } else if (result.posts && Array.isArray(result.posts)) {
      // Multiple posts response
      posts = result.posts;
    } else {
      throw new Error('Resposta inválida da IA');
    }

    return posts.map((post: any, index: number) => ({
      scheduled_date: post.scheduled_date || request.startDate,
      scheduled_time: post.scheduled_time || '10:00',
      post_type: post.post_type || 'POST',
      title: post.title || `Post ${index + 1}`,
      description: post.description || '',
      hook: post.hook || '',
      development: post.development || '',
      cta: post.cta || '',
      copy_final: post.copy_final || '',
      hashtags: Array.isArray(post.hashtags) ? post.hashtags : [],
      visual_elements: Array.isArray(post.visual_elements) ? post.visual_elements : [],
      soundtrack: post.soundtrack,
      thumbnail_url: post.thumbnail_url || this.generateThumbnailUrl(post.post_type, request.brand),
      brand_code: request.brand,
      status: 'SUGGESTION' as const,
      ai_generated: true
    }));
  }

  private generateHeuristicPlan(request: PlanningRequest, brandContext: any): PostSuggestion[] {
    const suggestions: PostSuggestion[] = [];
    const startDate = new Date(request.startDate);
    const endDate = request.endDate ? new Date(request.endDate) : new Date(startDate.getTime() + 6 * 24 * 60 * 60 * 1000);
    
    const themes = [
      'Dicas de produtividade',
      'Bastidores do trabalho',
      'Tutorial rápido',
      'Mitos vs verdades',
      'Resultados surpreendentes',
      'Transformação real',
      'Segredos profissionais'
    ];
    
    const postTypes: ('POST' | 'STORY' | 'REELS')[] = ['POST', 'STORY', 'REELS'];
    
    let currentDate = new Date(startDate);
    let dayIndex = 0;
    
    while (currentDate <= endDate) {
      // Gerar 1-2 posts por dia
      const postsPerDay = Math.random() > 0.3 ? 2 : 1;
      
      for (let i = 0; i < postsPerDay; i++) {
        const theme = themes[dayIndex % themes.length];
        const postType = postTypes[dayIndex % postTypes.length];
        const time = i === 0 ? '10:00' : '15:00';
        
        suggestions.push({
          scheduled_date: currentDate.toISOString().split('T')[0],
          scheduled_time: time,
          post_type: postType,
          title: `${theme} - ${brandContext?.name || request.brand}`,
          description: `--- INSTAGRAM FEED ---\nHorário: ${time}\nTema: Educativo - ${theme}\nGancho: "Você sabia que ${theme.toLowerCase()} pode transformar seus resultados?" (Texto na tela: ${theme.toUpperCase()})\nDesenvolvimento: Conteúdo sobre ${theme.toLowerCase()} para ${brandContext?.name || request.brand}\nCTA: "Descubra mais sobre ${brandContext?.name || request.brand}! Link na bio."`,
          hook: `Você sabia que ${theme.toLowerCase()} pode transformar seus resultados?`,
          development: `Desenvolvimento criativo sobre ${theme.toLowerCase()}`,
          cta: `Descubra mais sobre ${brandContext?.name || request.brand}! Link na bio.`,
          copy_final: `${theme} que vai mudar sua perspectiva! #${(brandContext?.name || request.brand).toLowerCase()}`,
          hashtags: [`#${(brandContext?.name || request.brand).toLowerCase()}`, '#conteudo', '#dicas'],
          visual_elements: ['Texto na tela', 'Elementos gráficos'],
          soundtrack: 'Música inspiradora',
          thumbnail_url: this.generateThumbnailUrl(postType, request.brand),
          brand_code: request.brand,
          status: 'SUGGESTION',
          ai_generated: false
        });
        
        dayIndex++;
      }
      
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    return suggestions;
  }

  async generateSingleDayPlan(brand: string, date: string, orgId?: string): Promise<PostSuggestion> {
    console.log('🎯 Gerando sugestão para dia único:', { brand, date });

    try {
      // Buscar contexto da marca
      const brandContext = await this.fetchBrandContext(brand);
      
      // Buscar token personalizado da organização
      const customApiKey = await this.getCustomOpenAIKey(orgId);
      const apiKey = customApiKey || this.openaiApiKey;

      let suggestion: PostSuggestion;

      if (!apiKey) {
        console.log('⚠️ OpenAI API key não disponível, usando geração heurística');
        suggestion = this.generateHeuristicSingleDay(brand, date, brandContext);
      } else {
        // Gerar sugestão com IA
        suggestion = await this.generateAISingleDay(brand, date, brandContext, apiKey);
      }
      
      // Salvar sugestão no banco de dados
      await this.saveSuggestionsToDatabase([suggestion], orgId);
      
      console.log(`✅ Sugestão gerada e salva para ${date}`);
      return suggestion;
    } catch (error) {
      console.error('❌ Erro na geração da sugestão:', error);
      const fallbackSuggestion = this.generateHeuristicSingleDay(brand, date, null);
      await this.saveSuggestionsToDatabase([fallbackSuggestion], orgId);
      return fallbackSuggestion;
    }
  }

  private async generateAISingleDay(brand: string, date: string, brandContext: any, apiKey: string): Promise<PostSuggestion> {
    const prompt = this.buildSingleDayPlanningPrompt(brand, date, brandContext);
    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: 'Você é um especialista em planejamento de conteúdo para redes sociais. Crie uma sugestão criativa e original baseada no contexto da marca.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.8,
        max_tokens: 1500,
        response_format: { type: 'json_object' }
      })
    });

    if (!response.ok) {
      throw new Error(`OpenAI API Error: ${response.status}`);
    }

    const data = await response.json();
    const result = JSON.parse(data.choices[0]?.message?.content || '{}');
    
    // Parse single post response
    const parsedPosts = this.parseAIResponse(result, { brand, startDate: date, endDate: date });
    return parsedPosts[0] || this.generateHeuristicSingleDay(brand, date, brandContext);
  }

  private buildSingleDayPlanningPrompt(brand: string, date: string, brandContext: any): string {
    const brandInfo = brandContext ? {
      name: brandContext.name,
      description: brandContext.description,
      about: brandContext.about
    } : {
      name: brand,
      description: 'Contexto não disponível',
      about: 'Contexto não disponível'
    };

    return `
Você é um especialista em planejamento de conteúdo para redes sociais. Crie UMA sugestão de postagem ORIGINAL e CRIATIVA para a marca ${brandInfo.name} para o dia ${date}.

CONTEXTO DA MARCA:
Nome: ${brandInfo.name}
Descrição: ${brandInfo.description}
Sobre: ${brandInfo.about}

TAREFA: Criar 1 sugestão de postagem ÚNICA e CRIATIVA para ${date}.

DIRETRIZES OBRIGATÓRIAS:
1. SEJA CRIATIVO - Não use temas genéricos
2. VARIE os tipos: Post, Story, Reels
3. VARIE os objetivos: Atração, Nutrição, Conversão
4. O post deve ser ÚNICO e ORIGINAL
5. Use o contexto da marca: ${brandInfo.about}
6. Crie título IMPACTANTE e CURIOSO
7. Gancho que PRENDE a atenção
8. CTA específico para ${brandInfo.name}

FORMATO OBRIGATÓRIO:
{
  "post": {
    "scheduled_date": "${date}",
    "scheduled_time": "10:00",
    "post_type": "POST|STORY|REELS",
    "title": "Título CRIATIVO e IMPACTANTE (não genérico)",
    "description": "--- INSTAGRAM FEED ---\\nHorário: 10:00\\nTema: Tipo - Título único\\nGancho: \\"Pergunta ou afirmação impactante\\" (Texto na tela: TEXTO_CHAMATIVO)\\nDesenvolvimento: Formato específico, elementos visuais únicos, abordagem inovadora\\nCTA: \\"Call to action criativo para ${brandInfo.name}! Link na bio.\\"",
    "hook": "Pergunta ou afirmação ORIGINAL que desperte curiosidade",
    "development": "Descrição detalhada do formato, elementos visuais e execução",
    "cta": "Call to action criativo e específico para ${brandInfo.name}",
    "copy_final": "Copy final ORIGINAL e envolvente para redes sociais com storytelling, benefícios e hashtags",
    "hashtags": ["#${brandInfo.name.replace(/\\s+/g, '')}", "#tema", "#categoria"],
    "visual_elements": ["Elemento visual 1", "Elemento visual 2"],
    "soundtrack": "Tipo de música adequada",
    "thumbnail_url": "https://images.pexels.com/photos/3184291/pexels-photo-3184291.jpeg?auto=compress&cs=tinysrgb&w=400&h=400&fit=crop"
  }
}

IMPORTANTE: A postagem deve ser ÚNICA, CRIATIVA e ESPECÍFICA para ${brandInfo.name}!

Responda APENAS com o JSON válido.
`;
  }

  private generateHeuristicSingleDay(brand: string, date: string, brandContext: any): PostSuggestion {
    const themes = [
      'Dica exclusiva',
      'Bastidores únicos',
      'Tutorial especial',
      'Verdade revelada',
      'Resultado impressionante',
      'Transformação real',
      'Segredo profissional'
    ];
    
    const postTypes: ('POST' | 'STORY' | 'REELS')[] = ['POST', 'STORY', 'REELS'];
    const randomTheme = themes[Math.floor(Math.random() * themes.length)];
    const randomType = postTypes[Math.floor(Math.random() * postTypes.length)];
    
    return {
      scheduled_date: date,
      scheduled_time: '10:00',
      post_type: randomType,
      title: `${randomTheme} - ${brandContext?.name || brand}`,
      description: `--- INSTAGRAM FEED ---\nHorário: 10:00\nTema: Educativo - ${randomTheme}\nGancho: "Você sabia que ${randomTheme.toLowerCase()} pode transformar seus resultados?" (Texto na tela: ${randomTheme.toUpperCase()})\nDesenvolvimento: Conteúdo sobre ${randomTheme.toLowerCase()} para ${brandContext?.name || brand}\nCTA: "Descubra mais sobre ${brandContext?.name || brand}! Link na bio."`,
      hook: `Você sabia que ${randomTheme.toLowerCase()} pode transformar seus resultados?`,
      development: `Desenvolvimento criativo sobre ${randomTheme.toLowerCase()}`,
      cta: `Descubra mais sobre ${brandContext?.name || brand}! Link na bio.`,
      copy_final: `${randomTheme} que vai mudar sua perspectiva! #${(brandContext?.name || brand).toLowerCase()}`,
      hashtags: [`#${(brandContext?.name || brand).toLowerCase()}`, '#conteudo', '#dicas'],
      visual_elements: ['Texto na tela', 'Elementos gráficos'],
      soundtrack: 'Música inspiradora',
      thumbnail_url: this.generateThumbnailUrl(randomType, brand),
      brand_code: brand,
      status: 'SUGGESTION',
      ai_generated: false
    };
  }

  private generateThumbnailUrl(postType: string, brand: string): string {
    // Using Pexels for placeholder images
    const imageIds = {
      'POST': '3184291',
      'STORY': '3184292', 
      'REELS': '3184293'
    };
    
    const imageId = imageIds[postType as keyof typeof imageIds] || imageIds['POST'];
    return `https://images.pexels.com/photos/${imageId}/pexels-photo-${imageId}.jpeg?auto=compress&cs=tinysrgb&w=400&h=400&fit=crop`;
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
    const pathParts = path.split('/').filter(Boolean);

    // Get user context
    const authHeader = req.headers.get('Authorization');
    let currentUser = null;
    
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
            .select('*')
            .eq('email', user.email)
            .single();
          currentUser = userData;
        }
      } catch (err) {
        console.log('Error getting user:', err);
      }
    }

    // POST /planning-ai/generate-week - Generate and save suggestions
    if (path.endsWith('/generate-week') && req.method === 'POST') {
      const body = await req.json() as PlanningRequest;
      
      if (!body.brand) {
        return new Response(
          JSON.stringify({ error: 'Campo "brand" é obrigatório' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Calculate end date if not provided (7 days from start)
      if (!body.endDate && body.startDate) {
        const start = new Date(body.startDate);
        const end = new Date(start.getTime() + 6 * 24 * 60 * 60 * 1000);
        body.endDate = end.toISOString().split('T')[0];
      }

      console.log(`🎯 Gerando plano semanal para ${body.brand}...`);
      
      const planningAI = new PlanningAI(supabaseClient);
      const suggestions = await planningAI.generateWeeklyPlan(body, currentUser?.org_id);
      
      console.log(`✅ Plano gerado e salvo: ${suggestions.length} sugestões`);

      return new Response(
        JSON.stringify({ suggestions }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // GET /planning-ai/suggestions - Fetch saved suggestions
    if (path.endsWith('/suggestions') && req.method === 'GET') {
      const params = url.searchParams;
      const brandCode = params.get('brand_code');
      const startDate = params.get('start_date');
      const endDate = params.get('end_date');

      if (!brandCode || !startDate || !endDate) {
        return new Response(
          JSON.stringify({ error: 'Parâmetros brand_code, start_date e end_date são obrigatórios' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const planningAI = new PlanningAI(supabaseClient);
      const suggestions = await planningAI.fetchSuggestions(brandCode, startDate, endDate, currentUser?.org_id);

      console.log(`📊 Buscando sugestões: brand=${brandCode}, start=${startDate}, end=${endDate}, org=${currentUser?.org_id}`);
      console.log(`📊 Sugestões encontradas: ${suggestions.length}`);
      return new Response(
        JSON.stringify({ suggestions }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // PATCH /planning-ai/suggestions/:id - Update suggestion
    if (path.includes('/suggestions/') && req.method === 'PATCH') {
      const suggestionId = pathParts[pathParts.length - 1];
      const body = await req.json();

      const { data: updatedSuggestion, error } = await supabaseClient
        .from('post_suggestions')
        .update({
          ...body,
          updated_at: new Date().toISOString()
        })
        .eq('id', suggestionId)
        .eq('org_id', currentUser?.org_id || null)
        .select()
        .single();

      if (error) {
        return new Response(
          JSON.stringify({ error: error.message }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify(updatedSuggestion),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // DELETE /planning-ai/suggestions/:id - Delete suggestion
    if (path.includes('/suggestions/') && req.method === 'DELETE') {
      const suggestionId = pathParts[pathParts.length - 1];

      const { error } = await supabaseClient
        .from('post_suggestions')
        .delete()
        .eq('id', suggestionId)
        .eq('org_id', currentUser?.org_id || null);

      if (error) {
        return new Response(
          JSON.stringify({ error: error.message }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Endpoint não encontrado' }),
      { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Planning AI Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

async function generateAndSaveWeek(brand: string, startDate: string) {
  try {
    // Gerar sugestões
    const suggestions = await generateWeekSuggestionsInternal(brand, startDate);
    
    // Salvar no banco
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Buscar org_id do contexto JWT (simulado para admin)
    const orgId = 'your-org-id'; // TODO: Pegar do JWT real
    
    const suggestionsToSave = suggestions.map(suggestion => ({
      org_id: orgId,
      brand_code: brand,
      scheduled_date: suggestion.date,
      scheduled_time: suggestion.time,
      post_type: suggestion.type,
      title: suggestion.title,
      description: suggestion.description,
      hook: suggestion.hook,
      development: suggestion.development,
      cta: suggestion.cta,
      copy_final: suggestion.copyFinal,
      hashtags: suggestion.hashtags,
      visual_elements: suggestion.visualElements,
      soundtrack: suggestion.soundtrack,
      thumbnail_url: suggestion.thumbnailUrl,
      status: 'SUGGESTION',
      ai_generated: true
    }));

    const { error } = await supabaseAdmin
      .from('post_suggestions')
      .insert(suggestionsToSave);

    if (error) throw error;

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Sugestões salvas com sucesso',
        count: suggestions.length 
      }),
      { 
        headers: { 
          'Content-Type': 'application/json',
          ...corsHeaders 
        } 
      }
    );
  } catch (error) {
    console.error('Erro ao gerar e salvar semana:', error);
    return new Response(
      JSON.stringify({ error: 'Erro ao gerar e salvar sugestões' }),
      { 
        status: 500, 
        headers: { 
          'Content-Type': 'application/json',
          ...corsHeaders 
        } 
      }
    );
  }
}

async function generateAndSaveSingleDay(brand: string, date: string) {
  try {
    // Gerar sugestão para um dia
    const suggestion = await generateSingleDaySuggestion(brand, date);
    
    // Salvar no banco
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const orgId = 'your-org-id'; // TODO: Pegar do JWT real
    
    const suggestionToSave = {
      org_id: orgId,
      brand_code: brand,
      scheduled_date: suggestion.date,
      scheduled_time: suggestion.time,
      post_type: suggestion.type,
      title: suggestion.title,
      description: suggestion.description,
      hook: suggestion.hook,
      development: suggestion.development,
      cta: suggestion.cta,
      copy_final: suggestion.copyFinal,
      hashtags: suggestion.hashtags,
      visual_elements: suggestion.visualElements,
      soundtrack: suggestion.soundtrack,
      thumbnail_url: suggestion.thumbnailUrl,
      status: 'SUGGESTION',
      ai_generated: true
    };

    const { error } = await supabaseAdmin
      .from('post_suggestions')
      .insert([suggestionToSave]);

    if (error) throw error;

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Sugestão salva com sucesso' 
      }),
      { 
        headers: { 
          'Content-Type': 'application/json',
          ...corsHeaders 
        } 
      }
    );
  } catch (error) {
    console.error('Erro ao gerar e salvar dia:', error);
    return new Response(
      JSON.stringify({ error: 'Erro ao gerar e salvar sugestão' }),
      { 
        status: 500, 
        headers: { 
          'Content-Type': 'application/json',
          ...corsHeaders 
        } 
      }
    );
  }
}

async function generateWeekSuggestions(brand: string, startDate: string) {
  const suggestions = await generateWeekSuggestionsInternal(brand, startDate);
  
  return new Response(
    JSON.stringify({ suggestions }),
    { 
      headers: { 
        'Content-Type': 'application/json',
        ...corsHeaders 
      } 
    }
  );
}

async function generateWeekSuggestionsInternal(brand: string, startDate: string) {
  try {
  }
}