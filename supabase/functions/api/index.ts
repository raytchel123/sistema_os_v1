import { createClient } from 'npm:@supabase/supabase-js@2';
import { patchMove, postApprove, postReject, postSchedule, deleteOS, postSlaRecalc, postSaveTokens, getSavedTokens, postSaveTokensBulk, getSavedTokensBulk } from './ordensHandlers.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, idempotency-key',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
};

interface ParsedOS {
  titulo: string;
  descricao: string;
  marca: string;
  objetivo: 'ATRACAO' | 'NUTRICAO' | 'CONVERSAO';
  tipo: 'EDUCATIVO' | 'HISTORIA' | 'CONVERSAO';
  prioridade: 'LOW' | 'MEDIUM' | 'HIGH';
  data_publicacao_prevista?: string;
  canais: string[];
  gancho?: string;
  cta?: string;
  script_text?: string;
  legenda?: string;
  prazo?: string;
  raw_media_links: string[];
}

class OSParser {
  static parseText(text: string, brandDefault: string = 'RAYTCHEL'): ParsedOS[] {
    const items: ParsedOS[] = [];
    
    // Split by common separators
    const sections = text.split(/(?:IDEIA \d+:|ITEM \d+:|OS \d+:|---|\n\n\n)/i)
      .filter(section => section.trim().length > 20);

    sections.forEach((section, index) => {
      const lines = section.trim().split('\n').filter(line => line.trim());
      if (lines.length < 2) return;

      // Extract title (first meaningful line)
      const titulo = this.extractTitle(lines);
      if (!titulo) return;

      // Extract description
      const descricao = this.extractDescription(lines, titulo);

      // Extract other fields
      const gancho = this.extractField(section, ['gancho', 'hook']);
      const cta = this.extractField(section, ['cta', 'call to action', 'chamada']);
      const script = this.extractField(section, ['roteiro', 'script', 'texto']);
      const legenda = this.extractField(section, ['legenda', 'caption', 'copy']);
      const prazo = this.extractField(section, ['prazo', 'deadline', 'data']);
      const dataPublicacao = this.extractField(section, ['data de publicacao', 'data publicacao', 'publicacao']);

      // Classify based on content
      const objetivo = this.classifyObjective(titulo + ' ' + descricao);
      const tipo = this.classifyType(titulo + ' ' + descricao);
      const prioridade = this.classifyPriority(titulo + ' ' + descricao);

      // Extract media links
      const mediaLinks = this.extractMediaLinks(section);

      // Default channels based on brand
      const canais = this.getDefaultChannels(brandDefault);

      items.push({
        titulo,
        descricao,
        marca: brandDefault,
        objetivo,
        tipo,
        prioridade,
        canais,
        gancho,
        cta,
        script_text: script,
        legenda,
        prazo,
        data_publicacao_prevista: dataPublicacao,
        raw_media_links: mediaLinks
      });
    });

    return items;
  }

  private static extractTitle(lines: string[]): string {
    // Look for title patterns
    for (const line of lines) {
      const cleaned = line.trim();
      if (cleaned.length > 10 && cleaned.length < 100) {
        // Remove common prefixes
        const title = cleaned
          .replace(/^(título|title|nome|ideia|item|os):\s*/i, '')
          .replace(/^\d+\.\s*/, '')
          .trim();
        
        if (title.length > 5) {
          return title;
        }
      }
    }
    return lines[0]?.trim() || 'Título não identificado';
  }

  private static extractDescription(lines: string[], titulo: string): string {
    const titleLine = lines.findIndex(line => line.includes(titulo));
    const remainingLines = lines.slice(titleLine + 1);
    
    // Look for description patterns
    for (const line of remainingLines) {
      const cleaned = line.trim();
      if (cleaned.length > 20) {
        return cleaned
          .replace(/^(descrição|description|desc):\s*/i, '')
          .trim();
      }
    }
    
    return remainingLines.join(' ').trim() || 'Descrição não identificada';
  }

  private static extractField(text: string, keywords: string[]): string | undefined {
    for (const keyword of keywords) {
      const regex = new RegExp(`${keyword}:\\s*(.+?)(?:\\n|$)`, 'i');
      const match = text.match(regex);
      if (match) {
        return match[1].trim();
      }
    }
    return undefined;
  }

  private static extractMediaLinks(text: string): string[] {
    const urlRegex = /https?:\/\/[^\s]+/g;
    const matches = text.match(urlRegex) || [];
    return matches.filter(url => 
      url.includes('drive.google.com') || 
      url.includes('dropbox.com') || 
      url.includes('wetransfer.com') ||
      url.includes('onedrive.com')
    );
  }

  private static classifyObjective(text: string): 'ATRACAO' | 'NUTRICAO' | 'CONVERSAO' {
    const lowerText = text.toLowerCase();
    
    const conversaoKeywords = ['compre', 'adquira', 'promocao', 'desconto', 'oferta', 'venda'];
    const nutricaoKeywords = ['beneficio', 'vantagem', 'porque', 'resultado', 'transformacao'];
    
    if (conversaoKeywords.some(keyword => lowerText.includes(keyword))) {
      return 'CONVERSAO';
    }
    if (nutricaoKeywords.some(keyword => lowerText.includes(keyword))) {
      return 'NUTRICAO';
    }
    return 'ATRACAO';
  }

  private static classifyType(text: string): 'EDUCATIVO' | 'HISTORIA' | 'CONVERSAO' {
    const lowerText = text.toLowerCase();
    
    const educativoKeywords = ['como', 'tutorial', 'dica', 'aprenda', 'passo a passo'];
    const historiaKeywords = ['historia', 'experiencia', 'relato', 'jornada', 'caso'];
    
    if (educativoKeywords.some(keyword => lowerText.includes(keyword))) {
      return 'EDUCATIVO';
    }
    if (historiaKeywords.some(keyword => lowerText.includes(keyword))) {
      return 'HISTORIA';
    }
    return 'CONVERSAO';
  }

  private static classifyPriority(text: string): 'LOW' | 'MEDIUM' | 'HIGH' {
    const lowerText = text.toLowerCase();
    
    const highKeywords = ['urgente', 'importante', 'critico', 'prioritario', 'alta', 'high'];
    const lowKeywords = ['opcional', 'futuro', 'quando possivel', 'baixa', 'low'];
    const mediumKeywords = ['media', 'medium'];
    
    if (highKeywords.some(keyword => lowerText.includes(keyword))) {
      return 'HIGH';
    }
    if (lowKeywords.some(keyword => lowerText.includes(keyword))) {
      return 'LOW';
    }
    if (mediumKeywords.some(keyword => lowerText.includes(keyword))) {
      return 'MEDIUM';
    }
    return 'MEDIUM';
  }

  private static getDefaultChannels(brand: string): string[] {
    const channelMap: Record<string, string[]> = {
      'RAYTCHEL': ['Instagram', 'Reels', 'Stories'],
      'ZAFFIRA': ['Instagram', 'TikTok'],
      'ZAFF': ['Instagram', 'Stories'],
      'CRISPIM': ['YouTube', 'Instagram'],
      'FAZENDA': ['Instagram', 'Facebook']
    };
    return channelMap[brand] || ['Instagram'];
  }
}
interface Database {
  public: {
    Tables: {
      ordens_de_servico: {
        Row: {
          id: string;
          titulo: string;
          descricao: string | null;
          marca: string;
          objetivo: string;
          tipo: string;
          status: string;
          data_publicacao_prevista: string | null;
          canais: string[];
          responsavel_atual: string | null;
          sla_atual: string | null;
          prioridade: string;
          gancho: string | null;
          cta: string | null;
          criado_em: string;
          atualizado_em: string;
          aprovado_interno: boolean;
          aprovado_crispim: boolean;
          midia_bruta_links: string[];
          criativos_prontos_links: string[];
          categorias_criativos: string[];
          responsaveis: any;
          prazo: string | null;
          script_text: string | null;
          legenda: string | null;
          org_id: string | null;
          created_by: string | null;
        };
        Insert: {
          titulo: string;
          descricao?: string | null;
          marca: string;
          objetivo: string;
          tipo: string;
          status?: string;
          data_publicacao_prevista?: string | null;
          canais?: string[];
          responsavel_atual?: string | null;
          sla_atual?: string | null;
          prioridade?: string;
          gancho?: string | null;
          cta?: string | null;
          midia_bruta_links?: string[];
          criativos_prontos_links?: string[];
          categorias_criativos?: string[];
          responsaveis?: any;
          prazo?: string | null;
          script_text?: string | null;
          legenda?: string | null;
          org_id?: string | null;
          created_by?: string | null;
        };
      };
      users: {
        Row: {
          id: string;
          nome: string;
          email: string;
          papel: string;
          pode_aprovar: boolean;
          criado_em: string;
          org_id: string | null;
        };
        Insert: {
          nome: string;
          email: string;
          papel: string;
          pode_aprovar?: boolean;
          senha_hash: string;
          org_id?: string | null;
        };
      };
    };
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient<Database>(
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
    const effectivePath = url.pathname.replace(/^\/api/, '') || '/';
    const pathParts = effectivePath.split('/').filter(Boolean);

    // Get user from JWT token
    const authHeader = req.headers.get('Authorization');
    let currentUser = null;
    
    if (authHeader?.startsWith('Bearer ')) {
      try {
        const token = authHeader.substring(7);
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

    // GET / - Get current user info
    if (effectivePath === '/' && req.method === 'GET') {
      if (!currentUser) {
        return new Response(
          JSON.stringify({ error: 'Usuário não encontrado' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify(currentUser),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // GET /ordens - List all OS with filters
    if (effectivePath === '/ordens' && req.method === 'GET') {
      const url = new URL(req.url);
      const marca = url.searchParams.get('marca');
      const status = url.searchParams.get('status');
      const prioridade = url.searchParams.get('prioridade');
      const data_inicio = url.searchParams.get('data_inicio');
      const data_fim = url.searchParams.get('data_fim');

      let query = supabaseClient
        .from('ordens_de_servico')
        .select(`
          *,
          responsavel:users!ordens_de_servico_responsavel_atual_fkey(id, nome, papel)
        `)
        .order('criado_em', { ascending: false });

      // Apply filters
      if (marca) {
        query = query.eq('marca', marca);
      }
      if (status) {
        query = query.eq('status', status);
      }
      if (prioridade) {
        query = query.eq('prioridade', prioridade);
      }
      
      // Date filters using prazo field
      if (data_inicio && data_fim) {
        query = query
          .not('prazo', 'is', null)
          .gte('prazo', data_inicio)
          .lte('prazo', data_fim);
      }

      const { data: ordens, error } = await query;

      if (error) {
        return new Response(
          JSON.stringify({ error: error.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify(ordens || []),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // GET /ordens/:id - Get single OS
    if (effectivePath.startsWith('/ordens/') && req.method === 'GET' && pathParts.length === 2) {
      const osId = pathParts[1];
      
      const { data: ordem, error } = await supabaseClient
        .from('ordens_de_servico')
        .select(`
          *,
          responsavel:users!ordens_de_servico_responsavel_atual_fkey(id, nome, papel)
        `)
        .eq('id', osId)
        .single();

      if (error || !ordem) {
        return new Response(
          JSON.stringify({ error: error?.message || 'OS não encontrada' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify(ordem),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // GET /ordens/:id/logs - Get logs for specific OS
    if (effectivePath.startsWith('/ordens/') && effectivePath.endsWith('/logs') && req.method === 'GET' && pathParts.length === 3) {
      const osId = pathParts[1];
      
      const { data: logs, error } = await supabaseClient
        .from('logs_evento')
        .select(`
          *,
          user:users(id, nome, papel)
        `)
        .eq('os_id', osId)
        .order('timestamp', { ascending: false });

      if (error) {
        return new Response(
          JSON.stringify({ error: error.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify(logs || []),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // POST /ordens - Create new OS
    if (effectivePath === '/ordens' && req.method === 'POST') {
      const body = await req.json();
      
      const osData = {
        titulo: body.titulo,
        descricao: body.descricao || null,
        marca: body.marca,
        objetivo: body.objetivo,
        tipo: body.tipo,
        status: body.status || 'ROTEIRO',
        data_publicacao_prevista: body.data_publicacao_prevista || null,
        canais: body.canais || [],
        prioridade: body.prioridade || 'MEDIUM',
        gancho: body.gancho || null,
        cta: body.cta || null,
        midia_bruta_links: body.midia_bruta_links || body.raw_media_links || [],
        criativos_prontos_links: body.criativos_prontos_links || body.final_media_links || [],
        categorias_criativos: body.categorias_criativos || [],
        responsaveis: body.responsaveis || {},
        prazo: body.prazo ? new Date(body.prazo).toISOString().split('T')[0] : null,
        script_text: body.script_text || null,
        legenda: body.legenda || null,
        org_id: currentUser?.org_id || null,
        created_by: currentUser?.id || null
      };

      const { data: newOS, error } = await supabaseClient
        .from('ordens_de_servico')
        .insert(osData)
        .select(`
          *,
          responsavel:users!ordens_de_servico_responsavel_atual_fkey(id, nome, papel)
        `)
        .single();

      if (error) {
        return new Response(
          JSON.stringify({ error: error.message }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Log creation
      await supabaseClient.from('logs_evento').insert({
        os_id: newOS.id,
        user_id: currentUser?.id || null,
        acao: 'CRIAR',
        detalhe: `OS criada: ${newOS.titulo}`,
        timestamp: new Date().toISOString()
      });

      return new Response(
        JSON.stringify(newOS),
        { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // DELETE /ordens/:id - Delete OS
    if (effectivePath.startsWith('/ordens/') && req.method === 'DELETE' && pathParts.length === 2) {
      const osId = pathParts[1];
      return deleteOS(req, osId);
    }

    // PUT /ordens/:id - Update OS
    if (effectivePath.startsWith('/ordens/') && req.method === 'PUT' && pathParts.length === 2) {
      const osId = pathParts[1];
      const body = await req.json();

      const updateData = {
        titulo: body.titulo,
        descricao: body.descricao || null,
        marca: body.marca,
        objetivo: body.objetivo,
        tipo: body.tipo,
        status: body.status,
        prioridade: body.prioridade || 'MEDIUM',
        data_publicacao_prevista: body.data_publicacao_prevista || null,
        canais: body.canais || [],
        gancho: body.gancho || null,
        cta: body.cta || null,
        midia_bruta_links: body.midia_bruta_links || body.raw_media_links || [],
        criativos_prontos_links: body.criativos_prontos_links || body.final_media_links || [],
        categorias_criativos: body.categorias_criativos || [],
        responsaveis: body.responsaveis || {},
        prazo: body.prazo ? new Date(body.prazo).toISOString().split('T')[0] : null,
        script_text: body.script_text || null,
        legenda: body.legenda || null,
        informacoes_adicionais: body.informacoes_adicionais || null,
        atualizado_em: new Date().toISOString()
      };

      const { data: updatedOS, error } = await supabaseClient
        .from('ordens_de_servico')
        .update(updateData)
        .eq('id', osId)
        .select(`
          *,
          responsavel:users!ordens_de_servico_responsavel_atual_fkey(id, nome, papel)
        `)
        .single();

      if (error) {
        return new Response(
          JSON.stringify({ error: error.message }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Log update
      await supabaseClient.from('logs_evento').insert({
        os_id: osId,
        user_id: currentUser?.id || null,
        acao: 'MUDAR_STATUS',
        detalhe: `OS atualizada - Status: ${body.status} | Prioridade: ${body.prioridade}`,
        timestamp: new Date().toISOString()
      });

      return new Response(
        JSON.stringify(updatedOS),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // PATCH /ordens/:id - Partial update OS
    if (effectivePath.startsWith('/ordens/') && req.method === 'PATCH' && pathParts.length === 2) {
      const osId = pathParts[1];
      const body = await req.json();

      const { data: updatedOS, error } = await supabaseClient
        .from('ordens_de_servico')
        .update({
          ...body,
          atualizado_em: new Date().toISOString()
        })
        .eq('id', osId)
        .select(`
          *,
          responsavel:users!ordens_de_servico_responsavel_atual_fkey(id, nome, papel)
        `)
        .single();

      if (error) {
        return new Response(
          JSON.stringify({ error: error.message }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Log update
      await supabaseClient.from('logs_evento').insert({
        os_id: osId,
        user_id: currentUser?.id || null,
        acao: 'MUDAR_STATUS',
        detalhe: `OS atualizada parcialmente: ${Object.keys(body).join(', ')}`,
        timestamp: new Date().toISOString()
      });

      return new Response(
        JSON.stringify(updatedOS),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    // POST /ordens/:id/approve - Approve OS
    if (effectivePath.startsWith('/ordens/') && effectivePath.includes('/approve') && req.method === 'POST') {
      const osId = pathParts[1];
      
      // Check if user can approve
      if (!currentUser?.pode_aprovar) {
        return new Response(
          JSON.stringify({ error: 'Usuário não tem permissão para aprovar' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const body = await req.json();
      
      const { data: updatedOS, error } = await supabaseClient
        .from('ordens_de_servico')
        .update({
          status: 'AGENDAMENTO',
          aprovado_crispim: true,
          data_publicacao_prevista: body.data_publicacao ? 
            `${body.data_publicacao}T${body.horario || '10:00'}:00` : null,
          atualizado_em: new Date().toISOString()
        })
        .eq('id', osId)
        .select(`
          *,
          responsavel:users!ordens_de_servico_responsavel_atual_fkey(id, nome, papel)
        `)
        .single();

      if (error) {
        return new Response(
          JSON.stringify({ error: error.message }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Log approval
      await supabaseClient.from('logs_evento').insert({
        os_id: osId,
        user_id: currentUser?.id || null,
        acao: 'APROVAR',
        detalhe: `OS aprovada por ${currentUser?.nome}`,
        timestamp: new Date().toISOString()
      });

      return new Response(
        JSON.stringify(updatedOS),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // POST /ordens/:id/reject - Reject OS
    if (effectivePath.startsWith('/ordens/') && effectivePath.includes('/reject') && req.method === 'POST') {
      const osId = pathParts[1];
      
      const body = await req.json();
      const { motivo } = body;

      if (!motivo) {
        return new Response(
          JSON.stringify({ error: 'Motivo da reprovação é obrigatório' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { data: updatedOS, error } = await supabaseClient
        .from('ordens_de_servico')
        .update({
          status: 'REVISAO',
          aprovado_crispim: false,
          atualizado_em: new Date().toISOString()
        })
        .eq('id', osId)
        .select(`
          *,
          responsavel:users!ordens_de_servico_responsavel_atual_fkey(id, nome, papel)
        `)
        .single();

      if (error) {
        return new Response(
          JSON.stringify({ error: error.message }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Log rejection
      await supabaseClient.from('logs_evento').insert({
        os_id: osId,
        user_id: currentUser?.id || null,
        acao: 'REPROVAR',
        detalhe: `OS reprovada: ${motivo}`,
        timestamp: new Date().toISOString()
      });

      return new Response(
        JSON.stringify(updatedOS),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // POST /import/parse - Parse text and extract OS
    if (effectivePath === '/import/parse' && req.method === 'POST') {
      const body = await req.json();
      const { text, brandDefault = 'RAYTCHEL' } = body;

      if (!text || typeof text !== 'string') {
        return new Response(
          JSON.stringify({ error: 'Texto é obrigatório' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log(`🤖 Parsing text with ${text.length} characters...`);
      
      const parsedItems = OSParser.parseText(text, brandDefault);
      
      console.log(`✅ Parsed ${parsedItems.length} OS items`);

      return new Response(
        JSON.stringify({
          items: parsedItems,
          metadata: {
            provider: 'HEURISTIC',
            textLength: text.length,
            itemsDetected: parsedItems.length
          }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // POST /import/commit - Commit parsed OS to database
    if (effectivePath === '/import/commit' && req.method === 'POST') {
      const body = await req.json();
      const { items } = body;

      if (!items || !Array.isArray(items)) {
        return new Response(
          JSON.stringify({ error: 'Items são obrigatórios' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log(`💾 Committing ${items.length} OS to database...`);
      
      // Create import session for tracking
      const { data: importSession, error: sessionError } = await supabaseClient
        .from('import_sessions')
        .insert({
          org_id: currentUser?.org_id || null,
          user_id: currentUser?.id || null,
          source_type: 'TEXT_PASTE',
          text_size_bytes: JSON.stringify(items).length,
          llm_provider: 'HEURISTIC',
          items_detected: items.length
        })
        .select('id')
        .single();

      if (sessionError) {
        console.error('Error creating import session:', sessionError);
      }

      const results = {
        created: 0,
        skipped: 0,
        errors: [] as Array<{ item: string; error: string }>
      };

      for (const item of items) {
        try {
          // Check for duplicates in ideias table
          const { data: existingIdeia } = await supabaseClient
            .from('ideias')
            .select('id')
            .eq('titulo', item.titulo)
            .eq('marca', item.marca)
            .eq('org_id', currentUser?.org_id || null)
            .single();

          if (existingIdeia) {
            results.skipped++;
            continue;
          }

          // Create ideia instead of OS
          const ideiaData = {
            titulo: item.titulo,
            descricao: item.descricao || null,
            marca: item.marca,
            objetivo: item.objetivo,
            tipo: item.tipo,
            prioridade: item.prioridade || 'MEDIUM',
            gancho: item.gancho || null,
            cta: item.cta || null,
            script_text: item.script_text || null,
            legenda: item.legenda || null,
            canais: item.canais || [],
            categorias_criativos: item.categorias_criativos || [],
            raw_media_links: item.raw_media_links || [],
            prazo: item.prazo ? new Date(item.prazo).toISOString().split('T')[0] : null,
            status: 'PENDENTE',
            import_session_id: importSession?.id || null,
            org_id: currentUser?.org_id || null,
            created_by: currentUser?.id || null
          };

          console.log('🔍 DEBUG ideiaData para criação:', {
            titulo: ideiaData.titulo,
            prazo_original: item.prazo,
            prazo_formatado: ideiaData.prazo,
            item_completo: item
          });

          const { data: newIdeia, error } = await supabaseClient
            .from('ideias')
            .insert(ideiaData)
            .select('id, titulo')
            .single();

          if (error) {
            results.errors.push({
              item: item.titulo,
              error: error.message
            });
          } else {
            results.created++;
            
            // Log ideia creation
            await supabaseClient.from('logs_evento').insert({
              os_id: null,
              user_id: currentUser?.id || null,
              acao: 'CRIAR',
              detalhe: `Ideia importada: ${newIdeia.titulo}`,
              timestamp: new Date().toISOString()
            });
          }
        } catch (error) {
          results.errors.push({
            item: item.titulo || 'Item sem título',
            error: error instanceof Error ? error.message : 'Erro desconhecido'
          });
        }
      }

      // Update import session with results
      if (importSession?.id) {
        await supabaseClient
          .from('import_sessions')
          .update({
            items_created: results.created,
            items_skipped: results.skipped,
            error_details: results.errors.length > 0 ? JSON.stringify(results.errors) : null
          })
          .eq('id', importSession.id);
      }

      return new Response(
        JSON.stringify(results),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // GET /ideias - List ideias with filters
    if (effectivePath === '/ideias' && req.method === 'GET') {
      const url = new URL(req.url);
      const status = url.searchParams.get('status');
      const marca = url.searchParams.get('marca');

      let query = supabaseClient
        .from('ideias')
        .select(`
          *,
          aprovada_por_user:users!ideias_aprovada_por_fkey(id, nome, papel),
          rejeitada_por_user:users!ideias_rejeitada_por_fkey(id, nome, papel),
          created_by_user:users!ideias_created_by_fkey(id, nome, papel),
          os_criada:ordens_de_servico!ideias_os_criada_id_fkey(id, titulo, status)
        `)
        .order('criado_em', { ascending: false });

      // Apply filters
      if (status) {
        query = query.eq('status', status);
      }
      if (marca) {
        query = query.eq('marca', marca);
      }

      const { data: ideias, error } = await query;

      if (error) {
        return new Response(
          JSON.stringify({ error: error.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify(ideias || []),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // POST /ideias/:id/approve - Approve ideia and create OS
    if (effectivePath.startsWith('/ideias/') && effectivePath.includes('/approve') && req.method === 'POST') {
      const ideiaId = pathParts[1];
      
      // Check if user can approve
      if (!currentUser?.pode_aprovar) {
        return new Response(
          JSON.stringify({ error: 'Usuário não tem permissão para aprovar ideias' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Get ideia details
      const { data: ideia, error: ideiaError } = await supabaseClient
        .from('ideias')
        .select('*')
        .eq('id', ideiaId)
        .single();

      if (ideiaError || !ideia) {
        return new Response(
          JSON.stringify({ error: 'Ideia não encontrada' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (ideia.status !== 'PENDENTE') {
        return new Response(
          JSON.stringify({ error: 'Ideia já foi processada' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Create OS from ideia
      const osData = {
        titulo: ideia.titulo,
        descricao: ideia.descricao || null,
        marca: ideia.marca,
        objetivo: ideia.objetivo,
        tipo: ideia.tipo,
        status: 'ROTEIRO',
        prioridade: ideia.prioridade,
        gancho: ideia.gancho || null,
        cta: ideia.cta || null,
        script_text: ideia.script_text || null,
        legenda: ideia.legenda || null,
        canais: ideia.canais || [],
        midia_bruta_links: ideia.raw_media_links || [],
        categorias_criativos: ideia.categorias_criativos || [],
        prazo: ideia.prazo ? new Date(ideia.prazo).toISOString().split('T')[0] : null,
        org_id: currentUser?.org_id || null,
        created_by: currentUser?.id || null
      };

      const { data: newOS, error: osError } = await supabaseClient
        .from('ordens_de_servico')
        .insert(osData)
        .select('id, titulo')
        .single();

      if (osError) {
        return new Response(
          JSON.stringify({ error: osError.message }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Update ideia status
      const { error: updateError } = await supabaseClient
        .from('ideias')
        .update({
          status: 'APROVADA',
          aprovada_por: currentUser.id,
          os_criada_id: newOS.id,
          atualizado_em: new Date().toISOString()
        })
        .eq('id', ideiaId);

      if (updateError) {
        return new Response(
          JSON.stringify({ error: updateError.message }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Log approval and OS creation
      await supabaseClient.from('logs_evento').insert([
        {
          os_id: null,
          user_id: currentUser.id,
          acao: 'APROVAR',
          detalhe: `Ideia aprovada: ${ideia.titulo}`,
          timestamp: new Date().toISOString()
        },
        {
          os_id: newOS.id,
          user_id: currentUser.id,
          acao: 'CRIAR',
          detalhe: `OS criada a partir de ideia: ${newOS.titulo}`,
          timestamp: new Date().toISOString()
        }
      ]);

      return new Response(
        JSON.stringify({ 
          success: true, 
          ideia: { ...ideia, status: 'APROVADA', os_criada_id: newOS.id },
          os_criada: newOS 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // POST /ideias/:id/reject - Reject ideia
    if (effectivePath.startsWith('/ideias/') && effectivePath.includes('/reject') && req.method === 'POST') {
      const ideiaId = pathParts[1];
      const body = await req.json();
      const { motivo } = body;
      
      // Check if user can approve (same permission for reject)
      if (!currentUser?.pode_aprovar) {
        return new Response(
          JSON.stringify({ error: 'Usuário não tem permissão para rejeitar ideias' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (!motivo) {
        return new Response(
          JSON.stringify({ error: 'Motivo da rejeição é obrigatório' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Get ideia details
      const { data: ideia, error: ideiaError } = await supabaseClient
        .from('ideias')
        .select('*')
        .eq('id', ideiaId)
        .single();

      if (ideiaError || !ideia) {
        return new Response(
          JSON.stringify({ error: 'Ideia não encontrada' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (ideia.status !== 'PENDENTE') {
        return new Response(
          JSON.stringify({ error: 'Ideia já foi processada' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Update ideia status
      const { data: updatedIdeia, error: updateError } = await supabaseClient
        .from('ideias')
        .update({
          status: 'REJEITADA',
          rejeitada_por: currentUser.id,
          motivo_rejeicao: motivo,
          atualizado_em: new Date().toISOString()
        })
        .eq('id', ideiaId)
        .select('*')
        .single();

      if (updateError) {
        return new Response(
          JSON.stringify({ error: updateError.message }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Log rejection
      await supabaseClient.from('logs_evento').insert({
        os_id: null,
        user_id: currentUser.id,
        acao: 'REPROVAR',
        detalhe: `Ideia rejeitada: ${ideia.titulo} - Motivo: ${motivo}`,
        timestamp: new Date().toISOString()
      });

      return new Response(
        JSON.stringify(updatedIdeia),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // GET /users/me - Get current user info (alias for /)
    if (effectivePath === '/users/me' && req.method === 'GET') {
      if (!currentUser) {
        return new Response(
          JSON.stringify({ error: 'Usuário não encontrado' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify(currentUser),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // POST /users/provision - Create user with organization after signup
    if (effectivePath === '/users/provision' && req.method === 'POST') {
      const body = await req.json();
      const { user_id, email, nome } = body;

      if (!user_id || !email || !nome) {
        return new Response(
          JSON.stringify({ error: 'user_id, email e nome são obrigatórios' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      try {
        // Create default organization for new user
        const { data: newOrg, error: orgError } = await supabaseClient
          .from('organizations')
          .insert({
            name: `Organização de ${nome}`,
            plan: 'FREE'
          })
          .select('id')
          .single();

        if (orgError) {
          console.error('Erro ao criar organização:', orgError);
          return new Response(
            JSON.stringify({ error: 'Erro ao criar organização' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Create user in our custom table
        const { data: newUser, error: userError } = await supabaseClient
          .from('users')
          .insert({
            nome,
            email,
            papel: 'EDITOR',
            pode_aprovar: false,
            senha_hash: 'auth_managed', // Placeholder since auth is managed by Supabase
            org_id: newOrg.id
          })
          .select('id, nome, email, papel, pode_aprovar, org_id')
          .single();

        if (userError) {
          console.error('Erro ao criar usuário:', userError);
          return new Response(
            JSON.stringify({ error: 'Erro ao criar usuário' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        return new Response(
          JSON.stringify({ success: true, user: newUser, organization: newOrg }),
          { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } catch (error) {
        console.error('Erro no provisionamento:', error);
        return new Response(
          JSON.stringify({ error: 'Erro interno no provisionamento' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // GET /users - List users
    if (effectivePath === '/users' && req.method === 'GET') {
      const { data: users, error } = await supabaseClient
        .from('users')
        .select('id, nome, email, papel, pode_aprovar, criado_em')
        .order('nome');

      if (error) {
        return new Response(
          JSON.stringify({ error: error.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify(users || []),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // POST /users - Create user
    if (effectivePath === '/users' && req.method === 'POST') {
      const body = await req.json();
      
      // Hash password (simple implementation)
      const passwordHash = await crypto.subtle.digest(
        'SHA-256',
        new TextEncoder().encode(body.senha)
      );
      const hashedPassword = Array.from(new Uint8Array(passwordHash))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');

      const userData = {
        nome: body.nome,
        email: body.email,
        papel: body.papel,
        pode_aprovar: body.pode_aprovar || false,
        senha_hash: hashedPassword,
        org_id: currentUser?.org_id || null
      };

      const { data: newUser, error } = await supabaseClient
        .from('users')
        .insert(userData)
        .select('id, nome, email, papel, pode_aprovar, criado_em')
        .single();

      if (error) {
        return new Response(
          JSON.stringify({ error: error.message }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify(newUser),
        { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // PUT /users/:id - Update user
    if (effectivePath.startsWith('/users/') && req.method === 'PUT') {
      const userId = pathParts[1];
      const body = await req.json();

      const updateData: any = {
        nome: body.nome,
        email: body.email,
        papel: body.papel,
        pode_aprovar: body.pode_aprovar || false,
        atualizado_em: new Date().toISOString()
      };

console.log(body)     
      // Add password if provided
      if (body.senha) {
        const passwordHash = await crypto.subtle.digest(
          'SHA-256',
          new TextEncoder().encode(body.senha)
        );
        updateData.senha_hash = Array.from(new Uint8Array(passwordHash))
          .map(b => b.toString(16).padStart(2, '0'))
          .join('');
      }

      const { data: updatedUser, error } = await supabaseClient
        .from('users')
        .update(updateData)
        .eq('id', userId)
        .select('id, nome, email, papel, pode_aprovar, criado_em')
        .single();

      if (error) {
        return new Response(
          JSON.stringify({ error: error.message }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify(updatedUser),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // PUT /ideias/:id - Update ideia
    if (effectivePath.startsWith('/ideias/') && req.method === 'PUT' && pathParts.length === 2) {
      const ideiaId = pathParts[1];
      const body = await req.json();

      const updateData = {
        titulo: body.titulo,
        descricao: body.descricao || null,
        marca: body.marca,
        objetivo: body.objetivo,
        tipo: body.tipo,
        prioridade: body.prioridade || 'MEDIUM',
        data_publicacao_prevista: body.data_publicacao_prevista || null,
        gancho: body.gancho || null,
        cta: body.cta || null,
        script_text: body.script_text || null,
        legenda: body.legenda || null,
        canais: body.canais || [],
        categorias_criativos: body.categorias_criativos || [],
        raw_media_links: body.raw_media_links || [],
        prazo: body.prazo ? new Date(body.prazo).toISOString().split('T')[0] : null,
        atualizado_em: new Date().toISOString()
      };

      const { data: updatedIdeia, error } = await supabaseClient
        .from('ideias')
        .update(updateData)
        .eq('id', ideiaId)
        .select('*')
        .single();

      if (error) {
        return new Response(
          JSON.stringify({ error: error.message }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Log update
      await supabaseClient.from('logs_evento').insert({
        os_id: null,
        user_id: currentUser?.id || null,
        acao: 'MUDAR_STATUS',
        detalhe: `Ideia editada: ${updatedIdeia.titulo}`,
        timestamp: new Date().toISOString()
      });

      return new Response(
        JSON.stringify(updatedIdeia),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // DELETE /users/:id - Delete user
    if (effectivePath.startsWith('/users/') && req.method === 'DELETE') {
      const userId = pathParts[1];

      const { error } = await supabaseClient
        .from('users')
        .delete()
        .eq('id', userId);

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

    // Settings endpoints
    if (effectivePath === '/settings/tokens' && req.method === 'POST') {
      return await postSaveTokens(req);
    }

    if (effectivePath === '/settings/tokens' && req.method === 'GET') {
      return await getSavedTokens(req);
    }

    // Bulk tokens endpoints
    if (effectivePath === '/settings/tokens/bulk' && req.method === 'POST') {
      return await postSaveTokensBulk(req);
    }

    if (effectivePath === '/settings/tokens/bulk' && req.method === 'GET') {
      return await getSavedTokensBulk(req);
    }

    // POST /settings/test-connection - Test API connection
    if (effectivePath === '/settings/test-connection' && req.method === 'POST') {
      const body = await req.json();
      const { platform, token } = body;

      if (!token) {
        return new Response(
          JSON.stringify({ error: 'Token é obrigatório para teste' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      try {
        let testResult = { success: false, account_name: '' };

        switch (platform) {
          case 'openai':
            const openaiResponse = await fetch('https://api.openai.com/v1/models', {
              headers: { 'Authorization': `Bearer ${token}` }
            });
            if (openaiResponse.ok) {
              const data = await openaiResponse.json();
              testResult = { success: true, account_name: `${data.data?.length || 0} modelos disponíveis` };
            }
            break;

          case 'instagram':
            const igResponse = await fetch(`https://graph.facebook.com/me?access_token=${token}`);
            if (igResponse.ok) {
              const data = await igResponse.json();
              testResult = { success: true, account_name: data.name || 'Conta conectada' };
            }
            break;

          case 'youtube':
            const ytResponse = await fetch(`https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true&key=${token}`);
            if (ytResponse.ok) {
              const data = await ytResponse.json();
              testResult = { success: true, account_name: data.items?.[0]?.snippet?.title || 'Canal conectado' };
            }
            break;

          case 'tiktok':
            // TikTok API test would go here
            testResult = { success: true, account_name: 'Conexão simulada' };
            break;
        }

        if (testResult.success) {
          return new Response(
            JSON.stringify(testResult),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        } else {
          return new Response(
            JSON.stringify({ error: 'Falha na conexão com a API' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      } catch (error) {
        return new Response(
          JSON.stringify({ error: `Erro ao testar conexão: ${error.message}` }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Brands endpoints
    if (effectivePath === '/brands' && req.method === 'GET') {
      const { data: brands, error } = await supabaseClient
        .from('brands')
        .select('*')
        .eq('org_id', currentUser?.org_id)
        .order('name');

      if (error) {
        return new Response(
          JSON.stringify({ error: error.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify(brands || []),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (effectivePath === '/brands' && req.method === 'POST') {
      const body = await req.json();
      
      const brandData = {
        name: body.name,
        code: body.code,
        description: body.description || null,
        about: body.about || null,
        is_active: body.is_active !== false,
        org_id: currentUser?.org_id || null
      };

      const { data: newBrand, error } = await supabaseClient
        .from('brands')
        .insert(brandData)
        .select()
        .single();

      if (error) {
        return new Response(
          JSON.stringify({ error: error.message }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify(newBrand),
        { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (effectivePath.startsWith('/brands/') && req.method === 'PUT') {
      const brandId = pathParts[1];
      const body = await req.json();

      const updateData = {
        name: body.name,
        code: body.code,
        description: body.description || null,
        about: body.about || null,
        is_active: body.is_active !== false,
        updated_at: new Date().toISOString()
      };

      const { data: updatedBrand, error } = await supabaseClient
        .from('brands')
        .update(updateData)
        .eq('id', brandId)
        .select()
        .single();

      if (error) {
        return new Response(
          JSON.stringify({ error: error.message }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify(updatedBrand),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (effectivePath.startsWith('/brands/') && req.method === 'DELETE') {
      const brandId = pathParts[1];

      const { error } = await supabaseClient
        .from('brands')
        .delete()
        .eq('id', brandId);

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
      {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('API Error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Erro interno do servidor' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});