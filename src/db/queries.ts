import { db } from './client';
import { ordensDeServico, users, checklistItens, assets, logsEvento } from './schema';
import { eq, desc, sql } from 'drizzle-orm';

// Queries para Ordens de Serviço
export const getOrdensDeServico = async () => {
  return await db
    .select({
      id: ordensDeServico.id,
      titulo: ordensDeServico.titulo,
      marca: ordensDeServico.marca,
      objetivo: ordensDeServico.objetivo,
      tipo: ordensDeServico.tipo,
      status: ordensDeServico.status,
      dataPublicacaoPrevista: ordensDeServico.dataPublicacaoPrevista,
      canais: ordensDeServico.canais,
      prioridade: ordensDeServico.prioridade,
      gancho: ordensDeServico.gancho,
      cta: ordensDeServico.cta,
      criadoEm: ordensDeServico.criadoEm,
      atualizadoEm: ordensDeServico.atualizadoEm,
      responsavel: {
        id: users.id,
        nome: users.nome,
        papel: users.papel,
      },
    })
    .from(ordensDeServico)
    .leftJoin(users, eq(ordensDeServico.responsavelAtual, users.id))
    .orderBy(desc(ordensDeServico.criadoEm));
};

export const getOrdemDeServicoById = async (id: string) => {
  const [ordem] = await db
    .select({
      id: ordensDeServico.id,
      titulo: ordensDeServico.titulo,
      marca: ordensDeServico.marca,
      objetivo: ordensDeServico.objetivo,
      tipo: ordensDeServico.tipo,
      status: ordensDeServico.status,
      dataPublicacaoPrevista: ordensDeServico.dataPublicacaoPrevista,
      canais: ordensDeServico.canais,
      prioridade: ordensDeServico.prioridade,
      gancho: ordensDeServico.gancho,
      cta: ordensDeServico.cta,
      criadoEm: ordensDeServico.criadoEm,
      atualizadoEm: ordensDeServico.atualizadoEm,
      responsavel: {
        id: users.id,
        nome: users.nome,
        papel: users.papel,
      },
    })
    .from(ordensDeServico)
    .leftJoin(users, eq(ordensDeServico.responsavelAtual, users.id))
    .where(eq(ordensDeServico.id, id));

  return ordem;
};

// Query para resumo das OS (usando a view)
export const getOrdensResumo = async () => {
  return await db.execute(sql`
    SELECT * FROM vw_os_resumo 
    ORDER BY criado_em DESC
  `);
};

// Queries para usuários
export const getUsers = async () => {
  return await db
    .select({
      id: users.id,
      nome: users.nome,
      email: users.email,
      papel: users.papel,
      criadoEm: users.criadoEm,
    })
    .from(users)
    .orderBy(users.nome);
};

// Queries para checklist
export const getChecklistByOsId = async (osId: string) => {
  return await db
    .select()
    .from(checklistItens)
    .where(eq(checklistItens.osId, osId))
    .orderBy(checklistItens.criadoEm);
};

// Queries para assets
export const getAssetsByOsId = async (osId: string) => {
  return await db
    .select()
    .from(assets)
    .where(eq(assets.osId, osId))
    .orderBy(desc(assets.criadoEm));
};

// Queries para logs
export const getLogsByOsId = async (osId: string) => {
  return await db
    .select({
      id: logsEvento.id,
      timestamp: logsEvento.timestamp,
      acao: logsEvento.acao,
      detalhe: logsEvento.detalhe,
      user: {
        id: users.id,
        nome: users.nome,
        papel: users.papel,
      },
    })
    .from(logsEvento)
    .leftJoin(users, eq(logsEvento.userId, users.id))
    .where(eq(logsEvento.osId, osId))
    .orderBy(desc(logsEvento.timestamp));
};

// Query para estatísticas do dashboard
export const getDashboardStats = async () => {
  const stats = await db.execute(sql`
    SELECT 
      COUNT(*) as total_os,
      COUNT(*) FILTER (WHERE status = 'ROTEIRO') as roteiro,
      COUNT(*) FILTER (WHERE status = 'AUDIO') as audio,
      COUNT(*) FILTER (WHERE status = 'CAPTACAO') as captacao,
      COUNT(*) FILTER (WHERE status = 'EDICAO') as edicao,
      COUNT(*) FILTER (WHERE status = 'REVISAO') as revisao,
      COUNT(*) FILTER (WHERE status = 'APROVACAO') as aprovacao,
      COUNT(*) FILTER (WHERE status = 'AGENDAMENTO') as agendamento,
      COUNT(*) FILTER (WHERE status = 'POSTADO') as postado,
      COUNT(*) FILTER (WHERE prioridade = 'HIGH') as alta_prioridade,
      COUNT(*) FILTER (WHERE data_publicacao_prevista < NOW() AND status != 'POSTADO') as atrasadas
    FROM ordens_de_servico
  `);

  return stats.rows[0];
};