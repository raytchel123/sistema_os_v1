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

      // Extract media link
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

    return items.length > 0 ? items : [this.createDefault(text, brandDefault)];
  }

  static extractTitle(lines: string[]): string {
    for (const line of lines) {
      const cleaned = line.replace(/^[\d.\-*\s]+/, '').trim();
      if (cleaned.length > 10 && cleaned.length < 150) {
        return cleaned;
      }
    }
    return '';
  }

  static extractDescription(lines: string[], titulo: string): string {
    const titleIndex = lines.findIndex(l => l.includes(titulo));
    if (titleIndex === -1) return lines.slice(1, 3).join(' ').trim();
    
    const descLines = lines.slice(titleIndex + 1).filter(l => {
      const lower = l.toLowerCase();
      return !lower.startsWith('gancho') && 
             !lower.startsWith('cta') && 
             !lower.startsWith('roteiro');
    });
    
    return descLines.slice(0, 2).join(' ').trim();
  }

  static extractField(text: string, keywords: string[]): string {
    for (const keyword of keywords) {
      const regex = new RegExp(`${keyword}[:\s]*(.+?)(?:\n|$)`, 'i');
      const match = text.match(regex);
      if (match) return match[1].trim();
    }
    return '';
  }

  static extractMediaLinks(text: string): string[] {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    return [...text.matchAll(urlRegex)].map(m => m[0]);
  }

  static classifyObjective(content: string): 'ATRACAO' | 'NUTRICAO' | 'CONVERSAO' {
    const lower = content.toLowerCase();
    if (lower.includes('comprar') || lower.includes('oferta') || lower.includes('desconto')) {
      return 'CONVERSAO';
    }
    if (lower.includes('educa') || lower.includes('aprend') || lower.includes('dica')) {
      return 'NUTRICAO';
    }
    return 'ATRACAO';
  }

  static classifyType(content: string): 'EDUCATIVO' | 'HISTORIA' | 'CONVERSAO' {
    const lower = content.toLowerCase();
    if (lower.includes('historia') || lower.includes('experi') || lower.includes('caso')) {
      return 'HISTORIA';
    }
    if (lower.includes('comprar') || lower.includes('oferta')) {
      return 'CONVERSAO';
    }
    return 'EDUCATIVO';
  }

  static classifyPriority(content: string): 'LOW' | 'MEDIUM' | 'HIGH' {
    const lower = content.toLowerCase();
    if (lower.includes('urgente') || lower.includes('prioridade alta')) {
      return 'HIGH';
    }
    if (lower.includes('baixa prioridade')) {
      return 'LOW';
    }
    return 'MEDIUM';
  }

  static getDefaultChannels(brand: string): string[] {
    return ['Instagram', 'TikTok'];
  }

  static createDefault(text: string, brand: string): ParsedOS {
    const lines = text.trim().split('\n').filter(l => l.trim());
    return {
      titulo: lines[0]?.trim() || 'Conteúdo sem título',
      descricao: lines.slice(1).join(' ').trim() || 'Sem descrição',
      marca: brand,
      objetivo: 'ATRACAO',
      tipo: 'EDUCATIVO',
      prioridade: 'MEDIUM',
      canais: this.getDefaultChannels(brand),
      raw_media_links: this.extractMediaLinks(text)
    };
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    type Database = {
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
            };
          };
        };
      };
    };

    const url = new URL(req.url);
    const pathSegments = url.pathname.split('/').filter(Boolean);
    
    const functionBasePath = '/api';
    let effectivePath = '/' + pathSegments.slice(2).join('/');
    if (!effectivePath || effectivePath === '/') {
      effectivePath = '/';
    }
    
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
      
      let query = supabaseClient
        .from('ordens_de_servico')
        .select(`
          *,
          responsavel:users!ordens_de_servico_responsavel_atual_fkey(id, nome, papel)
        `)
        .order('criado_em', { ascending: false });

      if (marca) {
        query = query.eq('marca', marca);
      }
      if (status) {
        query = query.eq('status', status);
      }
      if (prioridade) {
        query = query.eq('prioridade', prioridade);
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
        midia_bruta_links: body.midia_bruta_links || [],
        criativos_prontos_links: body.criativos_prontos_links || [],
        categorias_criativos: body.categorias_criativos || [],
        responsaveis: body.responsaveis || {},
        prazo: body.prazo,
        script_text: body.script_text || null,
        legenda: body.legenda || null,
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

      if (error || !updatedOS) {
        return new Response(
          JSON.stringify({ error: error?.message || 'OS não encontrada' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Log update
      await supabaseClient.from('logs_evento').insert({
        os_id: updatedOS.id,
        user_id: currentUser?.id || null,
        acao: 'ATUALIZAR',
        detalhe: `OS atualizada: ${updatedOS.titulo}`,
        timestamp: new Date().toISOString()
      });

      return new Response(
        JSON.stringify(updatedOS),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // PATCH /ordens/:id/move - Move OS to new status
    if (effectivePath.startsWith('/ordens/') && effectivePath.endsWith('/move') && req.method === 'PATCH') {
      const osId = pathParts[1];
      return patchMove(req, osId);
    }

    // POST /ordens/:id/approve - Approve OS
    if (effectivePath.startsWith('/ordens/') && effectivePath.endsWith('/approve') && req.method === 'POST') {
      const osId = pathParts[1];
      return postApprove(req, osId);
    }

    // POST /ordens/:id/reject - Reject OS
    if (effectivePath.startsWith('/ordens/') && effectivePath.endsWith('/reject') && req.method === 'POST') {
      const osId = pathParts[1];
      return postReject(req, osId);
    }

    // POST /ordens/:id/schedule - Schedule OS for publication
    if (effectivePath.startsWith('/ordens/') && effectivePath.endsWith('/schedule') && req.method === 'POST') {
      const osId = pathParts[1];
      return postSchedule(req, osId);
    }

    // POST /ordens/:id/sla/recalc - Recalculate SLA for specific OS
    if (effectivePath.match(/^\/ordens\/[^\/]+\/sla\/recalc$/) && req.method === 'POST') {
      const osId = pathParts[1];
      return postSlaRecalc(req, osId);
    }

    // POST /ordens/:id/tokens - Save tokens for specific OS
    if (effectivePath.match(/^\/ordens\/[^\/]+\/tokens$/) && req.method === 'POST') {
      const osId = pathParts[1];
      return postSaveTokens(req, osId);
    }

    // GET /ordens/:id/tokens - Get saved tokens for specific OS
    if (effectivePath.match(/^\/ordens\/[^\/]+\/tokens$/) && req.method === 'GET') {
      const osId = pathParts[1];
      return getSavedTokens(req, osId);
    }

    // POST /ordens/tokens/bulk - Save tokens for multiple OS
    if (effectivePath === '/ordens/tokens/bulk' && req.method === 'POST') {
      return postSaveTokensBulk(req);
    }

    // GET /ordens/tokens/bulk - Get saved tokens for multiple OS
    if (effectivePath === '/ordens/tokens/bulk' && req.method === 'GET') {
      return getSavedTokensBulk(req);
    }

    // POST /parse - Parse text into OS structure
    if (effectivePath === '/parse' && req.method === 'POST') {
      const body = await req.json();
      const { text, brand = 'RAYTCHEL' } = body;

      if (!text) {
        return new Response(
          JSON.stringify({ error: 'Text is required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const parsed = OSParser.parseText(text, brand);
      
      return new Response(
        JSON.stringify({ items: parsed }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // POST /bulk-create - Create multiple OS at once
    if (effectivePath === '/bulk-create' && req.method === 'POST') {
      const body = await req.json();
      const { items } = body;

      if (!Array.isArray(items) || items.length === 0) {
        return new Response(
          JSON.stringify({ error: 'Items array is required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const osDataArray = items.map(item => ({
        titulo: item.titulo,
        descricao: item.descricao || null,
        marca: item.marca,
        objetivo: item.objetivo,
        tipo: item.tipo,
        status: 'ROTEIRO',
        data_publicacao_prevista: item.data_publicacao_prevista || null,
        canais: item.canais || [],
        prioridade: item.prioridade || 'MEDIUM',
        gancho: item.gancho || null,
        cta: item.cta || null,
        midia_bruta_links: item.raw_media_links || [],
        criativos_prontos_links: [],
        categorias_criativos: [],
        responsaveis: {},
        prazo: item.prazo || null,
        script_text: item.script_text || null,
        legenda: item.legenda || null,
        org_id: currentUser?.org_id || null,
        created_by: currentUser?.id || null
      }));

      const { data: newOrdens, error } = await supabaseClient
        .from('ordens_de_servico')
        .insert(osDataArray)
        .select();

      if (error) {
        return new Response(
          JSON.stringify({ error: error.message }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Log bulk creation
      if (newOrdens && newOrdens.length > 0) {
        const logs = newOrdens.map(os => ({
          os_id: os.id,
          user_id: currentUser?.id || null,
          acao: 'CRIAR',
          detalhe: `OS criada via bulk: ${os.titulo}`,
          timestamp: new Date().toISOString()
        }));
        await supabaseClient.from('logs_evento').insert(logs);
      }

      return new Response(
        JSON.stringify({ created: newOrdens?.length || 0, items: newOrdens }),
        { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // GET /logs - Get all logs
    if (effectivePath === '/logs' && req.method === 'GET') {
      const { data: logs, error } = await supabaseClient
        .from('logs_evento')
        .select(`
          *,
          user:users(id, nome, papel),
          os:ordens_de_servico(id, titulo)
        `)
        .order('timestamp', { ascending: false })
        .limit(100);

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

    // GET /brands - List brands
    if (effectivePath === '/brands' && req.method === 'GET') {
      const { data: brands, error } = await supabaseClient
        .from('provider_settings')
        .select('*')
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

    // POST /brands - Create brand
    if (effectivePath === '/brands' && req.method === 'POST') {
      const body = await req.json();
      const { data: newBrand, error } = await supabaseClient
        .from('provider_settings')
        .insert({
          name: body.name,
          code: body.code,
          is_active: body.is_active ?? true,
          config: body.config || {}
        })
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

    // PUT /brands/:id - Update brand
    if (effectivePath.startsWith('/brands/') && req.method === 'PUT') {
      const brandId = pathParts[1];
      const body = await req.json();
      
      const { data: updatedBrand, error } = await supabaseClient
        .from('provider_settings')
        .update({
          name: body.name,
          code: body.code,
          is_active: body.is_active,
          config: body.config
        })
        .eq('id', brandId)
        .select()
        .single();

      if (error || !updatedBrand) {
        return new Response(
          JSON.stringify({ error: error?.message || 'Brand not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify(updatedBrand),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // DELETE /brands/:id - Delete brand
    if (effectivePath.startsWith('/brands/') && req.method === 'DELETE') {
      const brandId = pathParts[1];
      
      const { error } = await supabaseClient
        .from('provider_settings')
        .delete()
        .eq('id', brandId);

      if (error) {
        return new Response(
          JSON.stringify({ error: error.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // GET /ideas - List ideas
    if (effectivePath === '/ideas' && req.method === 'GET') {
      const url = new URL(req.url);
      const status = url.searchParams.get('status');
      
      let query = supabaseClient
        .from('ideas')
        .select('*')
        .order('criado_em', { ascending: false });

      if (status) {
        query = query.eq('status', status);
      }

      const { data: ideas, error } = await query;

      if (error) {
        return new Response(
          JSON.stringify({ error: error.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify(ideas || []),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // POST /ideas - Create idea
    if (effectivePath === '/ideas' && req.method === 'POST') {
      const body = await req.json();
      
      const { data: newIdea, error } = await supabaseClient
        .from('ideas')
        .insert({
          titulo: body.titulo,
          descricao: body.descricao,
          marca: body.marca,
          status: body.status || 'PENDING',
          criado_por: currentUser?.id || null,
          org_id: currentUser?.org_id || null
        })
        .select()
        .single();

      if (error) {
        return new Response(
          JSON.stringify({ error: error.message }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify(newIdea),
        { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // PUT /ideas/:id - Update idea
    if (effectivePath.startsWith('/ideas/') && req.method === 'PUT') {
      const ideaId = pathParts[1];
      const body = await req.json();
      
      const { data: updatedIdea, error } = await supabaseClient
        .from('ideas')
        .update({
          titulo: body.titulo,
          descricao: body.descricao,
          marca: body.marca,
          status: body.status
        })
        .eq('id', ideaId)
        .select()
        .single();

      if (error || !updatedIdea) {
        return new Response(
          JSON.stringify({ error: error?.message || 'Idea not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify(updatedIdea),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // DELETE /ideas/:id - Delete idea
    if (effectivePath.startsWith('/ideas/') && req.method === 'DELETE') {
      const ideaId = pathParts[1];
      
      const { error } = await supabaseClient
        .from('ideas')
        .delete()
        .eq('id', ideaId);

      if (error) {
        return new Response(
          JSON.stringify({ error: error.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ success: true }),
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
      const { email, nome, papel = 'EDITOR' } = body;

      if (!email) {
        return new Response(
          JSON.stringify({ error: 'Email é obrigatório' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      try {
        // Check if user already exists
        const { data: existingUser } = await supabaseClient
          .from('users')
          .select('id, org_id')
          .eq('email', email)
          .single();

        if (existingUser) {
          return new Response(
            JSON.stringify(existingUser),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Create organization for the user
        const { data: newOrg, error: orgError } = await supabaseClient
          .from('organizations')
          .insert({
            name: `Org de ${nome || email.split('@')[0]}`,
            slug: email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '')
          })
          .select()
          .single();

        if (orgError) {
          console.error('Error creating organization:', orgError);
          return new Response(
            JSON.stringify({ error: 'Erro ao criar organização' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Create user linked to organization
        const { data: newUser, error: userError } = await supabaseClient
          .from('users')
          .insert({
            email,
            nome: nome || email.split('@')[0],
            papel,
            org_id: newOrg.id,
            pode_aprovar: false,
            pode_ver_todas_os: false,
            menu_permissions: {
              kanban: true,
              planejamento: true,
              lista: true,
              biblioteca: true,
              ideias: true,
              importar: true,
              ideias_pendentes: false,
              tendencias: false,
              relatorios: false,
              usuarios: false,
              configuracoes: false,
              minhas_aprovacoes: false,
              auditoria_conteudo: false
            }
          })
          .select()
          .single();

        if (userError) {
          console.error('Error creating user:', userError);
          // Try to clean up org if user creation failed
          await supabaseClient.from('organizations').delete().eq('id', newOrg.id);
          return new Response(
            JSON.stringify({ error: 'Erro ao criar usuário' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        return new Response(
          JSON.stringify(newUser),
          { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } catch (err) {
        console.error('Error in user provision:', err);
        return new Response(
          JSON.stringify({ error: 'Erro ao provisionar usuário' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // GET /users - List users
    if (effectivePath === '/users' && req.method === 'GET') {
      let query = supabaseClient
        .from('users')
        .select('id, nome, email, papel, pode_aprovar,pode_ver_todas_os,menu_permissions, criado_em, org_id')
        .order('nome');

      if (currentUser?.org_id) {
        query = query.or(`org_id.eq.${currentUser.org_id},org_id.is.null`);
      }

      const { data: users, error } = await query;

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

      const { data: newUser, error } = await supabaseClient
        .from('users')
        .insert({
          nome: body.nome,
          email: body.email,
          senha_hash: hashedPassword,
          papel: body.papel,
          pode_aprovar: body.pode_aprovar || false,
          pode_ver_todas_os: body.pode_ver_todas_os || false,
          menu_permissions: body.menu_permissions || {},
          org_id: body.org_id || currentUser?.org_id || null
        })
        .select('id, nome, email, papel, pode_aprovar, pode_ver_todas_os, menu_permissions, criado_em')
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
        pode_aprovar: body.pode_aprovar,
        pode_ver_todas_os: body.pode_ver_todas_os,
        menu_permissions: body.menu_permissions
      };

      // Only update password if provided
      if (body.senha) {
        const passwordHash = await crypto.subtle.digest(
          'SHA-256',
          new TextEncoder().encode(body.senha)
        );
        const hashedPassword = Array.from(new Uint8Array(passwordHash))
          .map(b => b.toString(16).padStart(2, '0'))
          .join('');
        updateData.senha_hash = hashedPassword;
      }

      const { data: updatedUser, error } = await supabaseClient
        .from('users')
        .update(updateData)
        .eq('id', userId)
        .select('id, nome, email, papel, pode_aprovar, pode_ver_todas_os, menu_permissions, criado_em')
        .single();

      if (error || !updatedUser) {
        return new Response(
          JSON.stringify({ error: error?.message || 'User not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify(updatedUser),
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
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Not found' }),
      { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});