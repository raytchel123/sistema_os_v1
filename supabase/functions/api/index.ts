import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from './corsHeaders.ts';
import { handleOrdensRoutes } from './ordensHandlers.ts';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

Deno.serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const url = new URL(req.url);
    const path = url.pathname;

    // Route to appropriate handlers
    if (path.startsWith('/api/ordens')) {
      return await handleOrdensRoutes(req, supabase);
    }

    // Users endpoints
    if (path === '/api/users') {
      if (req.method === 'GET') {
        const { data, error } = await supabase
          .from('users')
          .select('*')
          .order('nome');

        if (error) throw error;

        return new Response(JSON.stringify(data), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // Brands endpoints
    if (path === '/api/brands') {
      if (req.method === 'GET') {
        const { data, error } = await supabase
          .from('brands')
          .select('*')
          .eq('is_active', true)
          .order('name');

        if (error) throw error;

        return new Response(JSON.stringify(data), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // Ideias endpoints
    if (path === '/api/ideias') {
      if (req.method === 'GET') {
        const { data, error } = await supabase
          .from('ideias')
          .select(`
            *,
            aprovada_por:users!ideias_aprovada_por_fkey(nome),
            rejeitada_por:users!ideias_rejeitada_por_fkey(nome),
            created_by:users!ideias_created_by_fkey(nome)
          `)
          .order('criado_em', { ascending: false });

        if (error) throw error;

        return new Response(JSON.stringify(data), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      if (req.method === 'PUT') {
        const body = await req.json();
        const { data, error } = await supabase
          .from('ideias')
          .update(body)
          .eq('id', body.id)
          .select()
          .single();

        if (error) throw error;

        return new Response(JSON.stringify(data), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // Ideias approve/reject endpoints
    const ideiaApproveMatch = path.match(/^\/api\/ideias\/([^\/]+)\/approve$/);
    if (ideiaApproveMatch && req.method === 'POST') {
      const ideiaId = ideiaApproveMatch[1];
      const body = await req.json();
      
      const { data, error } = await supabase
        .from('ideias')
        .update({
          status: 'APROVADA',
          aprovada_por: body.aprovada_por,
          atualizado_em: new Date().toISOString()
        })
        .eq('id', ideiaId)
        .select()
        .single();

      if (error) throw error;

      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const ideiaRejectMatch = path.match(/^\/api\/ideias\/([^\/]+)\/reject$/);
    if (ideiaRejectMatch && req.method === 'POST') {
      const ideiaId = ideiaRejectMatch[1];
      const body = await req.json();
      
      const { data, error } = await supabase
        .from('ideias')
        .update({
          status: 'REJEITADA',
          rejeitada_por: body.rejeitada_por,
          motivo_rejeicao: body.motivo_rejeicao,
          atualizado_em: new Date().toISOString()
        })
        .eq('id', ideiaId)
        .select()
        .single();

      if (error) throw error;

      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Default 404 response
    return new Response(JSON.stringify({ error: 'Endpoint not found' }), {
      status: 404,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('API Error:', error);
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      details: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});