import { createClient } from 'npm:@supabase/supabase-js@2';

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
      const legenda = this.extractField(section, ['legenda', 'caption']);
      const prazo = this.extractField(section, ['prazo', 'deadline']);
      const dataPublicacao = this.extractDataPublicacao(section);

      // Classify based on content
      const objetivo = this.classifyObjective(titulo + ' ' + descricao);
      const tipo = this.classifyType(titulo + ' ' + descricao);
      const prioridade = this.extractPrioridade(section);

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
        data_publicacao_prevista: dataPublicacao,
        canais,
        gancho,
        cta,
        script_text: script,
        legenda,
        prazo,
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

  private static extractDataPublicacao(text: string): string | undefined {
    const regex = /data\s+de\s+publicação:\s*(.+?)(?:\n|$)/i;
    const match = text.match(regex);
    if (match) {
      const dateTimeStr = match[1].trim();
      // Convert "2025-01-25 10:00" to ISO format
      if (dateTimeStr.match(/^\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}$/)) {
        return `${dateTimeStr}:00`; // Add seconds
      }
      return dateTimeStr;
    }
    return undefined;
  }

  private static extractPrioridade(text: string): 'LOW' | 'MEDIUM' | 'HIGH' {
    const regex = /prioridade:\s*(.+?)(?:\n|$)/i;
    const match = text.match(regex);
    if (match) {
      const prioridadeText = match[1].trim().toLowerCase();
      if (prioridadeText.includes('alta') || prioridadeText === 'high') {
        return 'HIGH';
      }
      if (prioridadeText.includes('baixa') || prioridadeText === 'low') {
        return 'LOW';
      }
      if (prioridadeText === 'medium') {
        return 'MEDIUM';
      }
      // Try exact match
      if (prioridadeText === 'high') return 'HIGH';
      if (prioridadeText === 'medium') return 'MEDIUM';
      if (prioridadeText === 'low') return 'LOW';
    }
    return 'MEDIUM'; // Default
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
    
    const highKeywords = ['urgente', 'importante', 'critico', 'prioritario'];
    const lowKeywords = ['opcional', 'futuro', 'quando possivel'];
    
    if (highKeywords.some(keyword => lowerText.includes(keyword))) {
      return 'HIGH';
    }
    if (lowKeywords.some(keyword => lowerText.includes(keyword))) {
      return 'LOW';
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

    // POST /os-intake - Parse text and optionally commit
    if (req.method === 'POST') {
      const body = await req.json();
      const { text, brandDefault = 'RAYTCHEL', items } = body;

      // If items are provided, commit them to database
      if (items && Array.isArray(items)) {
        console.log(`💾 Committing ${items.length} OS to database...`);
        
        const results = {
          created: 0,
          skipped: 0,
          errors: [] as Array<{ item: string; error: string }>
        };

        for (const item of items) {
          try {
            // Check for duplicates
            const { data: existing } = await supabaseClient
              .from('ordens_de_servico')
              .select('id')
              .eq('titulo', item.titulo)
              .eq('marca', item.marca)
              .single();

            if (existing) {
              results.skipped++;
              continue;
            }

            // Create OS
            const osData = {
              titulo: item.titulo,
              descricao: item.descricao || null,
              marca: item.marca,
              objetivo: item.objetivo,
              tipo: item.tipo,
              status: item.status || 'ROTEIRO',
              data_publicacao_prevista: item.data_publicacao_prevista || null,
              canais: item.canais || [],
              prioridade: item.prioridade || 'MEDIUM',
              gancho: item.gancho || null,
              cta: item.cta || null,
              midia_bruta_links: item.raw_media_links || [],
              script_text: item.script_text || null,
              legenda: item.legenda || null,
              prazo: item.prazo ? new Date(item.prazo).toISOString().split('T')[0] : null,
              org_id: currentUser?.org_id || null,
              created_by: currentUser?.id || null
            };

            const { data: newOS, error } = await supabaseClient
              .from('ordens_de_servico')
              .insert(osData)
              .select('id, titulo')
              .single();

            if (error) {
              results.errors.push({
                item: item.titulo,
                error: error.message
              });
            } else {
              results.created++;
              
              // Log creation
              await supabaseClient.from('logs_evento').insert({
                os_id: newOS.id,
                user_id: currentUser?.id || null,
                acao: 'CRIAR',
                detalhe: `OS importada: ${newOS.titulo}`,
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

        return new Response(
          JSON.stringify(results),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // If text is provided, parse it
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

    return new Response(
      JSON.stringify({ error: 'Método não suportado' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('OS Intake Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});