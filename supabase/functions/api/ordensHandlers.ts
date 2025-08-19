import { createClient, SupabaseClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, idempotency-key',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
};

// ===== Config =====
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_ANON = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
const SUPABASE_SERVICE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

type StageIn =
  | 'roteiro' | 'audio' | 'captura' | 'edicao' | 'qa'
  | 'aprovacao' | 'agendamento' | 'publicado';

type StageDB =
  | 'ROTEIRO' | 'AUDIO' | 'CAPTACAO' | 'EDICAO' | 'QA'
  | 'APROVACAO' | 'AGENDAMENTO' | 'POSTADO';

const mapStageInToDB: Record<StageIn, StageDB> = {
  roteiro: 'ROTEIRO',
  audio: 'AUDIO',
  captura: 'CAPTACAO',
  edicao: 'EDICAO',
  qa: 'QA',
  aprovacao: 'APROVACAO',
  agendamento: 'AGENDAMENTO',
  publicado: 'POSTADO',
};

// Ordem/índice do funil para métricas
const STAGES: StageDB[] = [
  'ROTEIRO','AUDIO','CAPTACAO','EDICAO','QA','APROVACAO','AGENDAMENTO','POSTADO'
];

// Matriz de transições válidas (dirigida)
const ALLOWED: Record<StageDB, StageDB[]> = {
  ROTEIRO:     ['AUDIO','EDICAO'],          // se gravado externamente pode ir direto p/ edição
  AUDIO:       ['CAPTACAO','EDICAO'],
  CAPTACAO:    ['EDICAO'],
  EDICAO:      ['QA','APROVACAO'],          // alguns times não têm QA separado
  QA:          ['EDICAO','APROVACAO'],
  APROVACAO:   ['AGENDAMENTO'],
  AGENDAMENTO: ['POSTADO'],
  POSTADO:     [],                           // terminal
};

export function canTransition(from: StageDB, to: StageDB): boolean {
  return ALLOWED[from]?.includes(to) ?? false;
}

export function slaFor(stage: StageDB): number {
  // retorna horas de SLA por etapa (ajuste conforme sua operação)
  switch (stage) {
    case 'ROTEIRO': return 24;
    case 'AUDIO': return 12;
    case 'CAPTACAO': return 48;
    case 'EDICAO': return 36;
    case 'QA': return 12;
    case 'APROVACAO': return 12;
    case 'AGENDAMENTO': return 6;
    case 'POSTADO': return 0;
    default: return 24;
  }
}

// ===== Helpers comuns =====
const json = (b: any, s = 200) =>
  new Response(JSON.stringify(b), { 
    status: s, 
    headers: { 
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
      'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, idempotency-key'
    } 
  });

const err = (code: string, message: string, status = 400) =>
  json({ error: { code, message } }, status);

type Authed = {
  auth: SupabaseClient,      // anon + Authorization header (para getUser)
  admin: SupabaseClient,     // service role (ignora RLS)
  user?: { id: string, org_id?: string, role?: string },
};

async function getClients(req: Request): Promise<Authed> {
  const authHeader = req.headers.get('Authorization') ?? '';
  const auth = createClient(SUPABASE_URL, SUPABASE_ANON, {
    global: { headers: { Authorization: authHeader } },
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data } = await auth.auth.getUser();
  const u = data?.user;
  const org_id =
    (u?.app_metadata as any)?.org_id ??
    (u?.user_metadata as any)?.org_id ??
    undefined;
  const role =
    (u?.app_metadata as any)?.role ??
    (u?.user_metadata as any)?.role ??
    undefined;

  return {
    auth, admin,
    user: u ? { id: u.id, org_id, role } : undefined,
  };
}

async function fetchOSById(admin: SupabaseClient, id: string) {
  const { data, error } = await admin
    .from('ordens_de_servico')
    .select('*')
    .eq('id', id)
    .single();
  if (error) throw new Error(error.message);
  return data as any;
}

function assertSameOrg(os: any, org_id?: string) {
  // se usar org obrigatória, bloqueie quando diferente
  if (os?.org_id && org_id && os.org_id !== org_id) {
    throw new Error('FORBIDDEN_ORG');
  }
}

function calcDueAtFor(stage: StageDB) {
  const ms = slaFor(stage) * 3600 * 1000;
  return new Date(Date.now() + ms).toISOString();
}

async function logEvent(
  admin: SupabaseClient,
  os_id: string,
  actor: string | null,
  from_state: StageDB | null,
  to_state: StageDB | null,
  meta?: Record<string, any>
) {
  await admin.from('logs_evento').insert({
    os_id,
    user_id: actor,
    acao: 'WORKFLOW',
    detalhe: JSON.stringify({ from_state, to_state, ...meta ?? {} }),
    timestamp: new Date().toISOString(),
  });
}

// ============== ROUTES =================

// PATCH /api/ordens/:id/move
export async function patchMove(req: Request, osId: string) {
  try {
    const { auth, admin, user } = await getClients(req);
    if (!user) return err('UNAUTHENTICATED', 'Usuário não autenticado', 401);

    const body = await req.json() as {
      to: StageIn,
      reason?: string
    };
    if (!body?.to) return err('BAD_REQUEST', 'Campo "to" é obrigatório');

    const to: StageDB = mapStageInToDB[body.to];
    if (!to) return err('BAD_REQUEST', 'Etapa "to" inválida');

    const os = await fetchOSById(admin, osId);
    assertSameOrg(os, user.org_id);

    const from: StageDB = os.status;
    if (from === to) return json(os); // no-op

    if (!canTransition(from, to)) {
      return err('INVALID_TRANSITION', `Transição não permitida: ${from} → ${to}`);
    }

    const stageIdx = STAGES.indexOf(to);
    const dueAt = calcDueAtFor(to);
    const startedAt = new Date().toISOString();

    const { data: updated, error } = await admin
      .from('ordens_de_servico')
      .update({
        status: to,
        sla_atual: dueAt,
        atualizado_em: startedAt,
      })
      .eq('id', osId)
      .select(`
        *,
        responsavel:users!ordens_de_servico_responsavel_atual_fkey(id, nome, papel)
      `)
      .single();

    if (error) return err('DB_UPDATE_FAILED', error.message, 500);

    await logEvent(admin, osId, user.id, from, to, { reason: body.reason });

    return json(updated);
  } catch (e: any) {
    if (e?.message === 'FORBIDDEN_ORG') {
      return err('FORBIDDEN', 'OS pertence a outra organização', 403);
    }
    return err('UNEXPECTED', e?.message || 'Erro inesperado', 500);
  }
}

// POST /api/ordens/:id/approve
export async function postApprove(req: Request, osId: string) {
  try {
    const { admin, user } = await getClients(req);
    if (!user) return err('UNAUTHENTICATED', 'Usuário não autenticado', 401);

    // Verificar se o usuário pode aprovar
    const { data: userData, error: userError } = await admin
      .from('users')
      .select('pode_aprovar')
      .eq('id', user.id)
      .single();

    if (userError || !userData?.pode_aprovar) {
      return err('FORBIDDEN', 'Usuário não tem permissão para aprovar', 403);
    }
    
    const os = await fetchOSById(admin, osId);
    assertSameOrg(os, user.org_id);

    if (os.status !== 'APROVACAO') {
      return err('INVALID_STATE', 'A OS não está em APROVACAO');
    }

    // Apenas alterar o status para AGENDAMENTO
    const { data, error } = await admin
      .from('ordens_de_servico')
      .update({
        status: 'AGENDAMENTO',
        atualizado_em: new Date().toISOString()
      })
      .eq('id', osId)
      .select(`
        *,
        responsavel:users!ordens_de_servico_responsavel_atual_fkey(id, nome, papel)
      `)
      .single();

    if (error) return err('DB_UPDATE_FAILED', error.message, 500);

    await logEvent(admin, osId, user.id, 'APROVACAO', 'AGENDAMENTO', {});

    return json(data);
  } catch (e: any) {
    if (e?.message === 'FORBIDDEN_ORG') {
      return err('FORBIDDEN', 'OS pertence a outra organização', 403);
    }
    return err('UNEXPECTED', e?.message || 'Erro inesperado', 500);
  }
}

// POST /api/ordens/:id/reject
export async function postReject(req: Request, osId: string) {
  try {
    const { admin, user } = await getClients(req);
    if (!user) return err('UNAUTHENTICATED', 'Usuário não autenticado', 401);

    const { note, back_to } = await req.json() as { note: string, back_to?: 'edicao'|'roteiro' };
    if (!note) return err('BAD_REQUEST', 'Campo "note" é obrigatório');

    const os = await fetchOSById(admin, osId);
    assertSameOrg(os, user.org_id);

    if (!['QA','APROVACAO'].includes(os.status)) {
      return err('INVALID_STATE', 'Só é possível reprovar a partir de QA ou APROVACAO');
    }

    // Default back to previous stage
    const to: StageDB = back_to ? mapStageInToDB[back_to] : 'REVISAO';
    
    const { data, error } = await admin
      .from('ordens_de_servico')
      .update({
       titulo: os.titulo,
        status: to,
        sla_atual: calcDueAtFor(to),
        atualizado_em: new Date().toISOString(),
        aprovado_crispim: false,
      })
      .eq('id', osId)
      .select(`
        *,
        responsavel:users!ordens_de_servico_responsavel_atual_fkey(id, nome, papel)
      `)
      .single();
    if (error) return err('DB_UPDATE_FAILED', error.message, 500);

    await logEvent(admin, osId, user.id, os.status, to, { note });

    return json(data);
  } catch (e: any) {
    if (e?.message === 'FORBIDDEN_ORG') {
      return err('FORBIDDEN', 'OS pertence a outra organização', 403);
    }
    return err('UNEXPECTED', e?.message || 'Erro inesperado', 500);
  }
}

// POST /api/ordens/:id/schedule
export async function postSchedule(req: Request, osId: string) {
  try {
    const { admin, user } = await getClients(req);
    if (!user) return err('UNAUTHENTICATED', 'Usuário não autenticado', 401);

    const { data_hora, plataforma } = await req.json() as { data_hora: string, plataforma: string };
    if (!data_hora) return err('BAD_REQUEST', 'Campo "data_hora" é obrigatório');

    const os = await fetchOSById(admin, osId);
    assertSameOrg(os, user.org_id);

    if (os.status !== 'AGENDAMENTO') {
      return err('INVALID_STATE', 'A OS deve estar em AGENDAMENTO para ser agendada');
    }

    // Create distribution link (if table exists)
    try {
      await admin.from('distribution_links').insert({
        os_id: osId,
        platform: plataforma || 'INSTAGRAM',
        scheduled_for: data_hora,
        status: 'SCHEDULED'
      });
    } catch (distError) {
      console.log('⚠️ Distribution link creation failed (table may not exist):', distError);
    }

    const { data, error } = await admin
      .from('ordens_de_servico')
      .update({
        data_publicacao_prevista: data_hora,
        atualizado_em: new Date().toISOString()
      })
      .eq('id', osId)
      .select(`
        *,
        responsavel:users!ordens_de_servico_responsavel_atual_fkey(id, nome, papel)
      `)
      .single();

    if (error) return err('DB_UPDATE_FAILED', error.message, 500);

    await logEvent(admin, osId, user.id, null, null, { 
      action: 'SCHEDULE', 
      data_hora, 
      plataforma 
    });

    return json(data);
  } catch (e: any) {
    if (e?.message === 'FORBIDDEN_ORG') {
      return err('FORBIDDEN', 'OS pertence a outra organização', 403);
    }
    return err('UNEXPECTED', e?.message || 'Erro inesperado', 500);
  }
}

// POST /api/sla/recalc
export async function postSlaRecalc(req: Request) {
  try {
    const { admin, user } = await getClients(req);
    if (!user) return err('UNAUTHENTICATED', 'Usuário não autenticado', 401);

    const { ids } = await req.json().catch(() => ({ ids: undefined })) as { ids?: string[] };

    // busca OS da org do usuário
    let q = admin.from('ordens_de_servico').select('id,status,org_id').order('criado_em', { ascending: false });
    if (ids?.length) q = q.in('id', ids);

    const { data: rows, error } = await q;
    if (error) return err('DB_QUERY_FAILED', error.message, 500);

    const updates = (rows || [])
      .filter((r: any) => !r.org_id || !user.org_id || r.org_id === user.org_id)
      .map((r: any) => ({
        id: r.id,
        sla_atual: calcDueAtFor(r.status as StageDB),
        atualizado_em: new Date().toISOString(),
      }));

    // bulk update
    for (const u of updates) {
      await admin.from('ordens_de_servico').update(u).eq('id', u.id);
      await logEvent(admin, u.id, user.id, null, null, { action: 'SLA_RECALC' });
    }

    return json({ updated: updates.length });
  } catch (e: any) {
    return err('UNEXPECTED', e?.message || 'Erro inesperado', 500);
  }
}

// POST /api/settings/tokens
export async function postSaveTokens(req: Request) {
  try {
    const { admin, user } = await getClients(req);
    if (!user) return err('UNAUTHENTICATED', 'Usuário não autenticado', 401);

    const body = await req.json();
    const { brand_id, platform, token_value } = body;
    
    console.log('🔍 DEBUG - Saving token for brand:', brand_id);
    console.log('🔍 DEBUG - Platform:', platform);
    console.log('🔍 DEBUG - Token provided:', !!token_value);

    if (!brand_id || !platform || !token_value) {
      return err('BAD_REQUEST', 'brand_id, platform e token_value são obrigatórios', 400);
    }
    
    // Sanitize Instagram token to remove invalid characters
    let sanitizedToken = token_value.trim().replace(/[^\x00-\x7F]/g, '');
    sanitizedToken = sanitizedToken.replace(/[^a-zA-Z0-9._|-]/g, '');
    console.log('🧹 DEBUG - Token sanitized:', !!sanitizedToken);
    
    // Verificar se a marca pertence à organização do usuário
    const { data: userData, error: userError } = await admin
      .from('users')
      .select('org_id')
      .eq('id', user.id)
      .single();

    if (userError) {
      return err('BAD_REQUEST', `Erro ao buscar usuário: ${userError.message}`, 400);
    }

    console.log('👤 DEBUG - User org_id:', userData.org_id);

    if (!userData.org_id) {
      return err('BAD_REQUEST', 'Usuário não possui organização associada', 400);
    }

    // Verificar se a marca pertence à organização do usuário
    const { data: brandData, error: brandError } = await admin
      .from('brands')
      .select('id, name, org_id')
      .eq('id', brand_id)
      .eq('org_id', userData.org_id)
      .single();

    if (brandError || !brandData) {
      console.log('❌ DEBUG - Marca não encontrada ou não pertence à organização:', {
        brand_id,
        user_org_id: userData.org_id,
        brandError
      });
      return err('BAD_REQUEST', 'Marca não encontrada ou não pertence à sua organização', 400);
    }

    console.log('✅ DEBUG - Marca validada:', brandData.name);

    // Mapear plataforma para provider válido
    const platformToProvider: Record<string, string> = {
      'INSTAGRAM': 'INSTAGRAM',
      'YOUTUBE': 'YOUTUBE', 
      'TIKTOK': 'TIKTOK'
    };

    const provider = platformToProvider[platform];
    if (!provider) {
      return err('BAD_REQUEST', `Plataforma não suportada: ${platform}`, 400);
    }

    console.log('💾 Salvando token para marca:', brandData.name, 'Platform:', platform, 'Provider:', provider);

    // Verificar se já existe um token para esta org + brand + provider
    const { data: existing, error: selectError } = await admin
      .from('provider_settings')
      .select('id')
      .eq('org_id', userData.org_id)
      .eq('brand_id', brand_id)
      .eq('provider', provider)
      .maybeSingle();

    if (selectError) {
      console.error('❌ Error checking existing token:', selectError);
      return err('DB_ERROR', `Erro ao verificar token existente: ${selectError.message}`, 500);
    }

    if (existing?.id) {
      // Update existing token
      console.log(`🔄 Updating existing ${platform} token for brand ${brandData.name}...`);
      const updateData = {
        api_key: sanitizedToken,
        is_active: true
      };
      
      const { error: updateError } = await admin
        .from('provider_settings')
        .update(updateData)
        .eq('id', existing.id);
      
      if (updateError) {
        console.error(`❌ Error updating ${platform} token:`, updateError);
        return err('DB_ERROR', `Erro ao atualizar token ${platform}: ${updateError.message}`, 500);
      } else {
        console.log(`✅ ${platform} token updated successfully for brand ${brandData.name}`);
      }
    } else {
      // Insert new token
      console.log(`➕ Creating new ${platform} token for brand ${brandData.name}...`);
      const insertData = {
        org_id: userData.org_id,
        brand_id: brand_id,
        provider: provider,
        api_key: sanitizedToken,
        is_active: true
      };
      
      const { error: insertError } = await admin
        .from('provider_settings')
        .insert(insertData);
      
      if (insertError) {
        console.error(`❌ Error inserting ${platform} token:`, insertError);
        return err('DB_ERROR', `Erro ao inserir token ${platform}: ${insertError.message}`, 500);
      } else {
        console.log(`✅ ${platform} token inserted successfully for brand ${brandData.name}`);
      }
    }

    console.log('✅ All tokens processed successfully');
    return json({ success: true });
  } catch (e: any) {
    console.error('❌ Error in postSaveTokens:', e);
    return err('UNEXPECTED', e?.message || 'Erro inesperado', 500);
  }
}

// GET /api/settings/tokens
export async function getSavedTokens(req: Request) {
  try {
    const { admin, user } = await getClients(req);
    if (!user) return err('UNAUTHENTICATED', 'Usuário não autenticado', 401);

    const url = new URL(req.url);
    const brand_id = url.searchParams.get('brand_id');
    
    if (!brand_id) {
      return err('BAD_REQUEST', 'brand_id é obrigatório', 400);
    }

    console.log('🔍 DEBUG - Getting tokens for brand:', brand_id);

    // Buscar org_id do usuário
    const { data: userData, error: userError } = await admin
      .from('users')
      .select('id, nome, email, org_id')
      .eq('id', user.id)
      .single();

    if (userError) {
      console.error('❌ DEBUG - Erro ao buscar usuário:', userError);
      return err('BAD_REQUEST', `Erro ao buscar usuário: ${userError.message}`, 400);
    }

    console.log('👤 DEBUG - User data:', userData);

    if (!userData.org_id) {
      return err('BAD_REQUEST', 'Usuário não possui organização associada', 400);
    }

    // Verificar se a marca pertence à organização do usuário
    const { data: brandData, error: brandError } = await admin
      .from('brands')
      .select('id, name')
      .eq('id', brand_id)
      .eq('org_id', userData.org_id)
      .single();

    if (brandError || !brandData) {
      console.log('❌ DEBUG - Marca não encontrada:', { brand_id, user_org_id: userData.org_id, brandError });
      return err('BAD_REQUEST', 'Marca não encontrada ou não pertence à sua organização', 400);
    }

    console.log('✅ DEBUG - Marca validada:', brandData.name);

    // Buscar tokens da marca na tabela provider_settings
    const { data: tokens, error: tokensError } = await admin
      .from('provider_settings')
      .select('instagram_token, youtube_api_key, tiktok_token')
      .eq('org_id', userData.org_id)
      .eq('brand_id', brand_id)
      .eq('is_active', true)
      .maybeSingle();

    if (tokensError) {
      console.error('❌ DEBUG - Error fetching tokens:', tokensError);
      return new Response(
        JSON.stringify({
          instagram_token: '',
          youtube_api_key: '',
          tiktok_token: ''
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('🔑 DEBUG - Raw tokens from DB:', tokens);

    // Consolidar tokens de todos os providers para esta marca
    const result = {
      instagram_token: '',
      youtube_api_key: '',
      tiktok_token: ''
    };

    if (tokens) {
      // Usar diretamente as colunas específicas
      result.instagram_token = tokens.instagram_token || '';
      result.youtube_api_key = tokens.youtube_api_key || '';
      result.tiktok_token = tokens.tiktok_token || '';
    }

    console.log('🔑 DEBUG - Final result for brand', brandData.name, ':', {
      instagram: !!result.instagram_token,
      youtube: !!result.youtube_api_key,
      tiktok: !!result.tiktok_token
    });

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (e: any) {
    console.error('❌ Error in getSavedTokens:', e);
    return err('UNEXPECTED', e?.message || 'Erro inesperado', 500);
  }
}

// POST /api/settings/tokens/bulk - Save multiple tokens for a brand
export async function postSaveTokensBulk(req: Request) {
  try {
    const { admin, user } = await getClients(req);
    if (!user) return err('UNAUTHENTICATED', 'Usuário não autenticado', 401);

    const body = await req.json();
    const { brand_id, instagram_token, youtube_api_key, tiktok_token } = body;
    
    console.log('🔍 DEBUG - Saving bulk tokens for brand:', brand_id);
    console.log('🔍 DEBUG - Tokens received:', {
      instagram: !!instagram_token,
      youtube: !!youtube_api_key,
      tiktok: !!tiktok_token
    });

    if (!brand_id) {
      return err('BAD_REQUEST', 'brand_id é obrigatório', 400);
    }
    
    // Sanitize Instagram token to remove invalid characters
    let sanitizedInstagramToken = instagram_token;
    if (instagram_token) {
      sanitizedInstagramToken = instagram_token.trim().replace(/[^\x00-\x7F]/g, '');
      sanitizedInstagramToken = sanitizedInstagramToken.replace(/[^a-zA-Z0-9._|-]/g, '');
      console.log('🧹 DEBUG - Instagram token sanitized:', !!sanitizedInstagramToken);
    }
    
    // Verificar se o usuário tem acesso à marca
    const { data: userData, error: userError } = await admin
      .from('users')
      .select('id, nome, email, org_id')
      .eq('id', user.id)
      .single();

    if (userError) {
      console.error('❌ DEBUG - Erro ao buscar usuário:', userError);
      return err('BAD_REQUEST', `Erro ao buscar usuário: ${userError.message}`, 400);
    }

    console.log('👤 DEBUG - User data:', userData);

    if (!userData.org_id) {
      return err('BAD_REQUEST', 'Usuário não possui organização associada', 400);
    }

    // Verificar se a marca pertence à organização do usuário
    const { data: brandData, error: brandError } = await admin
      .from('brands')
      .select('id, name, org_id')
      .eq('id', brand_id)
      .eq('org_id', userData.org_id)
      .single();

    if (brandError || !brandData) {
      console.log('❌ DEBUG - Marca não encontrada ou não pertence à organização:', {
        brand_id,
        user_org_id: userData.org_id,
        brandError
      });
      return err('BAD_REQUEST', 'Marca não encontrada ou não pertence à sua organização', 400);
    }

    console.log('✅ DEBUG - Marca validada:', brandData.name);

    // Verificar se já existe um registro para esta org + brand
    const { data: existing, error: selectError } = await admin
      .from('provider_settings')
      .select('id')
      .eq('org_id', userData.org_id)
      .eq('brand_id', brand_id)
      .maybeSingle();

    if (selectError) {
      console.error('❌ Error checking existing tokens:', selectError);
      return err('DB_ERROR', `Erro ao verificar tokens existentes: ${selectError.message}`, 500);
    }

    // Preparar dados dos tokens (apenas os que foram fornecidos)
    const tokenData: any = {};
    if (sanitizedInstagramToken) tokenData.instagram_token = sanitizedInstagramToken;
    if (youtube_api_key) tokenData.youtube_api_key = youtube_api_key.trim();
    if (tiktok_token) tokenData.tiktok_token = tiktok_token.trim();

    console.log('💾 Salvando tokens para marca:', brandData.name);
    console.log('📊 Tokens a serem salvos:', Object.keys(tokenData));

    if (existing?.id) {
      // Update existing record with new tokens
      console.log('🔄 Updating existing token record...');
      const { error: updateError } = await admin
        .from('provider_settings')
        .update({
          ...tokenData,
          is_active: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', existing.id);
      
      if (updateError) {
        console.error('❌ Error updating tokens:', updateError);
        return err('DB_ERROR', `Erro ao atualizar tokens: ${updateError.message}`, 500);
      } else {
        console.log('✅ Tokens updated successfully');
      }
    } else {
      // Insert new record for this brand
      console.log('➕ Creating new token record for brand...');
      const { error: insertError } = await admin
        .from('provider_settings')
        .insert({
          org_id: userData.org_id,
          brand_id: brand_id,
          ...tokenData,
          is_active: true
        });
      
      if (insertError) {
        console.error('❌ Error inserting tokens:', insertError);
        return err('DB_ERROR', `Erro ao inserir tokens: ${insertError.message}`, 500);
      } else {
        console.log('✅ Tokens inserted successfully');
      }
    }

    console.log('✅ All tokens processed successfully');
    return json({ success: true });
  } catch (e: any) {
    console.error('❌ Error in postSaveTokensBulk:', e);
    return err('UNEXPECTED', e?.message || 'Erro inesperado', 500);
  }
}

// GET /api/settings/tokens/bulk - Get all tokens for a brand
export async function getSavedTokensBulk(req: Request) {
  try {
    const { admin, user } = await getClients(req);
    if (!user) return err('UNAUTHENTICATED', 'Usuário não autenticado', 401);

    const url = new URL(req.url);
    const brand_id = url.searchParams.get('brand_id');
    
    if (!brand_id) {
      return err('BAD_REQUEST', 'brand_id é obrigatório', 400);
    }

    console.log('🔍 DEBUG - Getting bulk tokens for brand:', brand_id);

    // Buscar org_id do usuário
    const { data: userData, error: userError } = await admin
      .from('users')
      .select('id, nome, email, org_id')
      .eq('id', user.id)
      .single();

    if (userError) {
      console.error('❌ DEBUG - Erro ao buscar usuário:', userError);
      return err('BAD_REQUEST', `Erro ao buscar usuário: ${userError.message}`, 400);
    }

    console.log('👤 DEBUG - User data:', userData);

    if (!userData.org_id) {
      return err('BAD_REQUEST', 'Usuário não possui organização associada', 400);
    }

    // Verificar se a marca pertence à organização do usuário
    const { data: brandData, error: brandError } = await admin
      .from('brands')
      .select('id, name')
      .eq('id', brand_id)
      .eq('org_id', userData.org_id)
      .single();

    if (brandError || !brandData) {
      console.log('❌ DEBUG - Marca não encontrada:', { brand_id, user_org_id: userData.org_id, brandError });
      return err('BAD_REQUEST', 'Marca não encontrada ou não pertence à sua organização', 400);
    }

    console.log('✅ DEBUG - Marca validada:', brandData.name);

    // Buscar tokens da marca por provider
    const { data: tokens, error: tokensError } = await admin
      .from('provider_settings')
      .select('provider, api_key, instagram_token')
      .eq('org_id', userData.org_id)
      .eq('brand_id', brand_id)
      .eq('is_active', true);

    if (tokensError) {
      console.error('❌ DEBUG - Error fetching tokens:', tokensError);
      return new Response(
        JSON.stringify({
          instagram_token: '',
          youtube_api_key: '',
          tiktok_token: ''
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('🔑 DEBUG - Raw tokens from DB:', tokens);

    // Mapear providers para campos de resposta
    const result = {
      instagram_token: '',
      youtube_api_key: '',
      tiktok_token: ''
    };

    if (tokens && tokens.length > 0) {
      tokens.forEach(tokenRecord => {
        // Usar as colunas específicas de cada token
        if (tokenRecord.provider === 'INSTAGRAM' && tokenRecord.instagram_token) {
          result.instagram_token = tokenRecord.instagram_token;
        }
        if (tokenRecord.provider === 'YOUTUBE' && tokenRecord.youtube_api_key) {
          result.youtube_api_key = tokenRecord.youtube_api_key;
        }
        if (tokenRecord.provider === 'TIKTOK' && tokenRecord.tiktok_token) {
          result.tiktok_token = tokenRecord.tiktok_token;
        }
      });
    }

    console.log('🔑 DEBUG - Final result for brand', brandData.name, ':', {
      instagram: !!result.instagram_token,
      youtube: !!result.youtube_api_key,
      tiktok: !!result.tiktok_token
    });

    return json(result);
  } catch (e: any) {
    console.error('❌ Error in getSavedTokensBulk:', e);
    return err('UNEXPECTED', e?.message || 'Erro inesperado', 500);
  }
}