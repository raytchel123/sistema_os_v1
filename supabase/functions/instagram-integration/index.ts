import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, idempotency-key',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
};

interface InstagramPost {
  id: string;
  media_type: 'IMAGE' | 'VIDEO' | 'CAROUSEL_ALBUM';
  caption: string;
  timestamp: string;
  like_count: number;
  comments_count: number;
  permalink: string;
  media_url?: string;
  thumbnail_url?: string;
  insights?: {
    reach?: number;
    impressions?: number;
    video_views?: number;
    profile_visits?: number;
  };
}

class InstagramAPI {
  private supabase: any;
  private pageId: string;

  constructor(supabaseClient: any) {
    this.supabase = supabaseClient;
    // ID da página do Instagram da Zaffira (exemplo)
    this.pageId = '17841440731673300'; // Substitua pelo ID real da página
  }

  async getInstagramToken(brandId: string, orgId: string): Promise<string | null> {
    try {
      console.log(`🔍 Buscando token do Instagram para brand ${brandId}, org ${orgId}`);
      
      const { data: tokenData, error } = await this.supabase
        .from('provider_settings')
        .select('instagram_token')
        .eq('org_id', orgId)
        .eq('brand_id', brandId)
        .eq('provider', 'INSTAGRAM')
        .not('instagram_token', 'is', null)
        .single();

      if (error) {
        console.error('❌ Erro ao buscar token:', error);
        return null;
      }

      if (!tokenData?.instagram_token) {
        console.log(`⚠️ Token do Instagram não encontrado para brand ${brandId}`);
        return null;
      }

      const token = tokenData.instagram_token.trim();
      console.log(`🔑 Token encontrado para brand ${brandId}, length: ${token.length}`);
      return token;
    } catch (error) {
      console.error('Erro ao buscar token do Instagram:', error);
      return null;
    }
  }

  async fetchUserPosts(accessToken: string, brandCode: string, limit: number = 25): Promise<InstagramPost[]> {
    try {
      console.log(`📱 Buscando posts do Instagram para marca: ${brandCode}`);
      
      // Usar o App ID específico da Zaffira
      const pageId = '17841440731673300';
      console.log(`📄 Usando página ID: ${pageId} para marca ${brandCode}`);
      
      return await this.fetchPostsFromPage(pageId, accessToken, limit);

    } catch (error) {
      console.error('❌ Erro ao buscar posts:', error);
      throw error;
    }
  }

  private async fetchPostsFromPage(pageId: string, accessToken: string, limit: number): Promise<InstagramPost[]> {
    try {
      // Buscar posts do Instagram Business Account usando Graph API v19.0
      const mediaUrl = `https://graph.facebook.com/v19.0/${pageId}/media?fields=id,media_type,caption,timestamp,like_count,comments_count,permalink,media_url,thumbnail_url&limit=${limit}&access_token=${accessToken}`;
      
      console.log('🔍 Buscando posts da página:', pageId);
      console.log('🔗 URL da API:', mediaUrl.replace(accessToken, '[TOKEN_HIDDEN]'));
      
      const mediaResponse = await fetch(mediaUrl);
      
      if (!mediaResponse.ok) {
        const errorData = await mediaResponse.json();
        console.error('❌ Erro na API do Instagram:', errorData);
        throw new Error(`Instagram API Error: ${errorData.error?.message || `HTTP ${mediaResponse.status}`}`);
      }

      const mediaData = await mediaResponse.json();
      const posts = mediaData.data || [];

      console.log(`✅ ${posts.length} posts encontrados`);

      // Converter posts para formato padrão
      const postsWithInsights = posts.map((post: any) => ({
        id: post.id,
        media_type: post.media_type || 'IMAGE',
        caption: post.caption || '',
        timestamp: post.timestamp,
        like_count: post.like_count || 0,
        comments_count: post.comments_count || 0,
        permalink: post.permalink || '',
        media_url: post.media_url,
        thumbnail_url: post.thumbnail_url || post.media_url,
        insights: {}
      }));

      return postsWithInsights;
    } catch (error) {
      console.error('❌ Erro ao buscar posts da página:', error);
      throw error;
    }
  }

  // Mock data for testing when token is not available
  private getMockInstagramPosts(): InstagramPost[] {
    return [
      {
        id: 'mock-1',
        media_type: 'VIDEO',
        caption: 'Como fazer uma maquiagem natural perfeita! ✨ Tutorial completo no vídeo. Qual produto você mais usa? #maquiagem #beleza #tutorial #natural',
        timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        like_count: 1250,
        comments_count: 89,
        permalink: 'https://instagram.com/p/mock1',
        media_url: 'https://images.pexels.com/photos/3184291/pexels-photo-3184291.jpeg?auto=compress&cs=tinysrgb&w=400',
        insights: {
          reach: 15600,
          impressions: 18900,
          video_views: 12400,
          profile_visits: 234
        }
      },
      {
        id: 'mock-2',
        media_type: 'CAROUSEL_ALBUM',
        caption: 'Transformação incrível! 6 meses de cuidados e o resultado é esse ➡️ Swipe para ver o antes e depois completo! #transformacao #antesedepois #resultado',
        timestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
        like_count: 2890,
        comments_count: 156,
        permalink: 'https://instagram.com/p/mock2',
        media_url: 'https://images.pexels.com/photos/3184292/pexels-photo-3184292.jpeg?auto=compress&cs=tinysrgb&w=400',
        insights: {
          reach: 25600,
          impressions: 31200,
          profile_visits: 445
        }
      },
      {
        id: 'mock-3',
        media_type: 'IMAGE',
        caption: '🚨 PROMOÇÃO ESPECIAL! 50% OFF em todos os tratamentos. Últimas vagas disponíveis! Link na bio para agendar 💉 #promocao #harmonizacao #desconto #estetica',
        timestamp: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        like_count: 567,
        comments_count: 34,
        permalink: 'https://instagram.com/p/mock3',
        media_url: 'https://images.pexels.com/photos/3184293/pexels-photo-3184293.jpeg?auto=compress&cs=tinysrgb&w=400',
        insights: {
          reach: 8900,
          impressions: 11200,
          profile_visits: 123
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

    if (!currentUser) {
      return new Response(
        JSON.stringify({ error: 'Usuário não autenticado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // GET /instagram-integration/posts?brand_id=xxx - Fetch Instagram posts for a brand
    if (path.endsWith('/posts') && req.method === 'GET') {
      const brandId = url.searchParams.get('brand_id');
      
      if (!brandId) {
        return new Response(
          JSON.stringify({ error: 'brand_id é obrigatório' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log(`📱 Buscando posts do Instagram para marca ID: ${brandId}`);

      // Buscar dados da marca para obter o código
      const { data: brandData, error: brandError } = await supabaseClient
        .from('brands')
        .select('id, code, name')
        .eq('id', brandId)
        .eq('org_id', currentUser.org_id)
        .single();

      if (brandError || !brandData) {
        return new Response(
          JSON.stringify({ error: 'Marca não encontrada' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log(`🏷️ Marca encontrada: ${brandData.name} (${brandData.code})`);

      const instagramAPI = new InstagramAPI(supabaseClient);
      
      // Get Instagram token for the brand
      const accessToken = await instagramAPI.getInstagramToken(brandId, currentUser.org_id);
      
      if (!accessToken) {
        console.log(`⚠️ Token do Instagram não configurado para ${brandData.name}`);
        
        return new Response(
          JSON.stringify({ 
            posts: [],
            source: 'no_token',
            message: `Token do Instagram não configurado para ${brandData.name}. Configure em Configurações > Tokens.`
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log(`🔑 Token encontrado para ${brandData.name}, buscando posts...`);

      try {
        const posts = await instagramAPI.fetchUserPosts(accessToken, brandData.code, 25);
        
        console.log(`✅ ${posts.length} posts carregados do Instagram para ${brandData.name}`);

        return new Response(
          JSON.stringify({ 
            posts,
            source: 'instagram_api',
            brand_id: brandId,
            brand_name: brandData.name
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } catch (error) {
        console.error(`❌ Erro na API do Instagram para ${brandData.name}:`, error);
        
        return new Response(
          JSON.stringify({ 
            posts: [],
            source: 'api_error',
            error: error instanceof Error ? error.message : 'Erro na API do Instagram',
            message: `Erro ao conectar com Instagram da ${brandData.name}. Verifique o token em Configurações.`
          }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // GET /instagram-integration/insights?brand_id=xxx&post_id=xxx - Get detailed insights for a post
    if (path.endsWith('/insights') && req.method === 'GET') {
      const brandId = url.searchParams.get('brand_id');
      const postId = url.searchParams.get('post_id');
      
      if (!brandId || !postId) {
        return new Response(
          JSON.stringify({ error: 'brand_id e post_id são obrigatórios' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const instagramAPI = new InstagramAPI(supabaseClient);
      const accessToken = await instagramAPI.getInstagramToken(brandId, currentUser.org_id);
      
      if (!accessToken) {
        return new Response(
          JSON.stringify({ error: 'Token do Instagram não configurado para esta marca' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      try {
        // Fetch detailed insights
        const insightsUrl = `https://graph.facebook.com/${postId}/insights?metric=reach,impressions,video_views,profile_visits,website_clicks,follows&access_token=${accessToken}`;
        const response = await fetch(insightsUrl);
        
        if (!response.ok) {
          throw new Error(`Instagram API Error: ${response.status}`);
        }

        const data = await response.json();
        const insights = data.data?.reduce((acc: any, metric: any) => {
          acc[metric.name] = metric.values?.[0]?.value || 0;
          return acc;
        }, {}) || {};

        return new Response(
          JSON.stringify({ insights }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } catch (error) {
        console.error('❌ Erro ao buscar insights:', error);
        return new Response(
          JSON.stringify({ error: error instanceof Error ? error.message : 'Erro ao buscar insights' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // POST /instagram-integration/test-token - Test Instagram token
    if (path.endsWith('/test-token') && req.method === 'POST') {
      const body = await req.json();
      const { token } = body;
      
      if (!token) {
        return new Response(
          JSON.stringify({ error: 'Token é obrigatório' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      try {
        const response = await fetch(`https://graph.facebook.com/me?access_token=${token}`);
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error?.message || `HTTP ${response.status}`);
        }

        const data = await response.json();
        
        return new Response(
          JSON.stringify({ 
            success: true, 
            account_name: data.name || 'Conta conectada',
            account_id: data.id
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } catch (error) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: error instanceof Error ? error.message : 'Erro ao testar token' 
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    return new Response(
      JSON.stringify({ error: 'Endpoint não encontrado' }),
      { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Instagram Integration Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});