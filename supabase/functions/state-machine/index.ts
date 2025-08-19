import { createClient } from 'npm:@supabase/supabase-js@2';
import { StateMachine } from './StateMachine.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
};

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
    const pathParts = url.pathname.split('/');
    const stateMachine = new StateMachine(supabaseClient);

    // POST /state-machine/os/:id/advance
    if (req.method === 'POST' && pathParts.includes('advance')) {
      const osId = pathParts[pathParts.indexOf('os') + 1];
      const { userId } = await req.json();
      
        console.log(`🔄 Advancing OS ${osId} with user ${userId}`);
      const result = await stateMachine.advanceStatus(osId, userId);
      
      return new Response(
        JSON.stringify(result),
        {
          status: result.success ? 200 : 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // POST /state-machine/os/:id/reject
    if (req.method === 'POST' && pathParts.includes('reject')) {
      const osId = pathParts[pathParts.indexOf('os') + 1];
      const { motivo, userId } = await req.json();
      
      const result = await stateMachine.rejectOS(osId, motivo, userId);
      console.log(`❌ Reject result:`, result);
      
      return new Response(
        JSON.stringify(result),
        {
          status: result.success ? 200 : 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // POST /state-machine/webhook/posted
    if (req.method === 'POST' && pathParts.includes('posted')) {
      const { osId } = await req.json();
      
      const result = await stateMachine.markAsPosted(osId);
      
      return new Response(
        JSON.stringify(result),
        {
          status: result.success ? 200 : 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Endpoint not found' }),
      {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('❌ State machine error:', error);
    return new Response(
      JSON.stringify({ error: error.message, details: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});