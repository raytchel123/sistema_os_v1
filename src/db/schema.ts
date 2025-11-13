import { pgTable, uuid, text, timestamp, boolean, integer, pgEnum, unique } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Enums
export const papelEnum = pgEnum('papel_enum', ['COPY', 'AUDIO', 'VIDEO', 'EDITOR', 'REVISOR', 'CRISPIM', 'SOCIAL']);
export const marcaEnum = pgEnum('marca_enum', ['RAYTCHEL', 'ZAFFIRA', 'ZAFF', 'CRISPIM', 'FAZENDA']);
export const objetivoEnum = pgEnum('objetivo_enum', ['ATRACAO', 'NUTRICAO', 'CONVERSAO']);
export const tipoEnum = pgEnum('tipo_enum', ['EDUCATIVO', 'HISTORIA', 'CONVERSAO']);
export const statusEnum = pgEnum('status_enum', ['ROTEIRO', 'AUDIO', 'CAPTACAO', 'EDICAO', 'REVISAO', 'APROVACAO', 'APROVADO', 'REPROVADO', 'AGENDAMENTO', 'POSTADO', 'PUBLICADO', 'RASCUNHO']);
export const prioridadeEnum = pgEnum('prioridade_enum', ['LOW', 'MEDIUM', 'HIGH']);
export const etapaEnum = pgEnum('etapa_enum', ['ROTEIRO', 'AUDIO', 'CAPTACAO', 'EDICAO', 'REVISAO', 'APROVACAO', 'AGENDAMENTO', 'POSTADO']);
export const tipoAssetEnum = pgEnum('tipo_asset_enum', ['ROTEIRO', 'AUDIO', 'VIDEO_BRUTO', 'EDIT_V1', 'THUMB', 'LEGENDA', 'ARTE']);
export const acaoEnum = pgEnum('acao_enum', ['CRIAR', 'MUDAR_STATUS', 'ANEXAR_ASSET', 'REPROVAR', 'APROVAR', 'AGENDAR', 'POSTAR']);

// Novos enums para SaaS
export const planEnum = pgEnum('plan_enum', ['FREE', 'PRO', 'ENTERPRISE']);
export const providerEnum = pgEnum('provider_enum', ['HEYGEN', 'ELEVENLABS', 'OPENAI', 'ANTHROPIC', 'INSTAGRAM', 'YOUTUBE', 'TIKTOK']);
export const voiceProviderEnum = pgEnum('voice_provider_enum', ['HEYGEN', 'ELEVENLABS', 'HUMAN']);
export const languageEnum = pgEnum('language_enum', ['PT_BR', 'EN', 'ES']);
export const platformEnum = pgEnum('platform_enum', ['INSTAGRAM', 'TIKTOK', 'YOUTUBE', 'FACEBOOK', 'LINKEDIN']);
export const distributionStatusEnum = pgEnum('distribution_status_enum', ['DRAFT', 'SCHEDULED', 'POSTED', 'FAILED']);
export const templatePlatformEnum = pgEnum('template_platform_enum', ['REELS', 'TIKTOK', 'SHORTS', 'STORIES', 'FEED', 'YOUTUBE']);
export const apiProviderEnum = pgEnum('api_provider_enum', ['OPENAI', 'ANTHROPIC', 'ELEVENLABS', 'HEYGEN', 'INSTAGRAM', 'YOUTUBE', 'TIKTOK']);
export const postTypeEnum = pgEnum('post_type_enum', ['POST', 'STORY', 'REELS']);
export const suggestionStatusEnum = pgEnum('suggestion_status_enum', ['SUGGESTION', 'IN_PRODUCTION', 'APPROVED', 'POSTED']);
export const ideiaStatusEnum = pgEnum('ideia_status_enum', ['PENDENTE', 'APROVADA', 'REJEITADA']);

// Organizações (Multi-tenant)
export const organizations = pgTable('organizations', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  plan: planEnum('plan').notNull().default('FREE'),
  quotaOsMonthly: integer('quota_os_monthly').default(10),
  quotaAiRequestsMonthly: integer('quota_ai_requests_monthly').default(100),
  criadoEm: timestamp('created_at', { withTimezone: true }).defaultNow(),
  atualizadoEm: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

// Marcas customizáveis
export const brands = pgTable('brands', {
  id: uuid('id').primaryKey().defaultRandom(),
  orgId: uuid('org_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  code: text('code').notNull(), // RAYTCHEL, ZAFFIRA, etc.
  description: text('description'),
  about: text('about'), // Contexto para IA
  isActive: boolean('is_active').default(true),
  criadoEm: timestamp('created_at', { withTimezone: true }).defaultNow(),
  atualizadoEm: timestamp('updated_at', { withTimezone: true }).defaultNow(),
}, (table) => ({
  uniqueOrgCode: unique().on(table.orgId, table.code),
}));

// API Tokens
export const apiTokens = pgTable('api_tokens', {
  id: uuid('id').primaryKey().defaultRandom(),
  orgId: uuid('org_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  provider: apiProviderEnum('provider').notNull(),
  tokenKey: text('token_key').notNull(),
  isActive: boolean('is_active').default(true),
  criadoEm: timestamp('created_at', { withTimezone: true }).defaultNow(),
  atualizadoEm: timestamp('updated_at', { withTimezone: true }).defaultNow(),
}, (table) => ({
  uniqueOrgProvider: unique().on(table.orgId, table.provider),
}));

// Configurações de Providers
export const providerSettings = pgTable('provider_settings', {
  id: uuid('id').primaryKey().defaultRandom(),
  orgId: uuid('org_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  provider: providerEnum('provider').notNull(),
  apiKey: text('api_key'),
  settings: text('settings'), // JSON string
  isActive: boolean('is_active').default(true),
  criadoEm: timestamp('created_at', { withTimezone: true }).defaultNow(),
}, (table) => ({
  uniqueOrgProvider: unique().on(table.orgId, table.provider),
}));

// Perfis de Voz
export const voiceProfiles = pgTable('voice_profiles', {
  id: uuid('id').primaryKey().defaultRandom(),
  orgId: uuid('org_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  provider: voiceProviderEnum('provider').notNull(),
  externalId: text('external_id'),
  defaultParams: text('default_params'), // JSON string
  brandTag: text('brand_tag'),
  previewUrl: text('preview_url'),
  isActive: boolean('is_active').default(true),
  criadoEm: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

// Perfis de Avatar
export const avatarProfiles = pgTable('avatar_profiles', {
  id: uuid('id').primaryKey().defaultRandom(),
  orgId: uuid('org_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  provider: text('provider').notNull().default('HEYGEN'),
  externalId: text('external_id'),
  styleDefaults: text('style_defaults'), // JSON string
  previewImageUrl: text('preview_image_url'),
  isActive: boolean('is_active').default(true),
  criadoEm: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

// Templates Criativos
export const creativeTemplates = pgTable('creative_templates', {
  id: uuid('id').primaryKey().defaultRandom(),
  orgId: uuid('org_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  platform: templatePlatformEnum('platform').notNull(),
  aspectRatio: text('aspect_ratio').notNull(),
  textLayers: text('text_layers'), // JSON string
  brandTheme: text('brand_theme'), // JSON string
  renderParams: text('render_params'), // JSON string
  isFavorite: boolean('is_favorite').default(false),
  criadoEm: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

// Links de Distribuição
export const distributionLinks = pgTable('distribution_links', {
  id: uuid('id').primaryKey().defaultRandom(),
  osId: uuid('os_id').notNull().references(() => ordensDeServico.id, { onDelete: 'cascade' }),
  platform: platformEnum('platform').notNull(),
  finalUrl: text('final_url'),
  scheduledFor: timestamp('scheduled_for', { withTimezone: true }),
  status: distributionStatusEnum('status').notNull().default('DRAFT'),
  postedAt: timestamp('posted_at', { withTimezone: true }),
  metrics: text('metrics'), // JSON string
  criadoEm: timestamp('created_at', { withTimezone: true }).defaultNow(),
}, (table) => ({
  uniqueOsPlatform: unique().on(table.osId, table.platform),
}));

// Sugestões de Postagem
export const postSuggestions = pgTable('post_suggestions', {
  id: uuid('id').primaryKey().defaultRandom(),
  orgId: uuid('org_id').references(() => organizations.id, { onDelete: 'cascade' }),
  brandCode: text('brand_code').notNull(),
  scheduledDate: timestamp('scheduled_date', { mode: 'date' }).notNull(),
  scheduledTime: text('scheduled_time').notNull(), // time format HH:MM
  postType: postTypeEnum('post_type').notNull().default('POST'),
  title: text('title').notNull(),
  description: text('description'),
  hook: text('hook'),
  development: text('development'),
  cta: text('cta'),
  copyFinal: text('copy_final'),
  hashtags: text('hashtags').array().default([]),
  visualElements: text('visual_elements').array().default([]),
  soundtrack: text('soundtrack'),
  thumbnailUrl: text('thumbnail_url'),
  status: suggestionStatusEnum('status').notNull().default('SUGGESTION'),
  aiGenerated: boolean('ai_generated').default(true),
  criadoEm: timestamp('created_at', { withTimezone: true }).defaultNow(),
  atualizadoEm: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

// Tabelas
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  orgId: uuid('org_id').references(() => organizations.id),
  nome: text('nome').notNull(),
  email: text('email').unique().notNull(),
  papel: papelEnum('papel').notNull(),
  senhaHash: text('senha_hash').notNull(),
  podeAprovar: boolean('pode_aprovar').default(false),
  criadoEm: timestamp('criado_em', { withTimezone: true }).defaultNow(),
  atualizadoEm: timestamp('atualizado_em', { withTimezone: true }).defaultNow(),
});

export const ordensDeServico = pgTable('ordens_de_servico', {
  id: uuid('id').primaryKey().defaultRandom(),
  orgId: uuid('org_id').references(() => organizations.id),
  titulo: text('titulo').notNull(),
  descricao: text('descricao'),
  
  // Roteiro e Voz
  scriptText: text('script_text'),
  scriptVersion: integer('script_version').default(1),
  scriptLanguage: languageEnum('script_language').default('PT_BR'),
  voiceProvider: voiceProviderEnum('voice_provider').default('HUMAN'),
  voiceProfileId: uuid('voice_profile_id').references(() => voiceProfiles.id),
  ttsParams: text('tts_params'), // JSON string
  avatarId: uuid('avatar_id').references(() => avatarProfiles.id),
  heygenScene: text('heygen_scene'), // JSON string
  
  // Templates e Saídas
  outputTemplates: text('output_templates').array().default([]),
  rawMediaLinks: text('raw_media_links').array().default([]),
  finalMediaLinks: text('final_media_links').array().default([]), // JSON strings
  platformPublishUrls: text('platform_publish_urls'), // JSON string
  
  // IA e Análise
  aiAnalysis: text('ai_analysis'), // JSON string
  suggestedCuts: text('suggested_cuts'), // JSON string
  
  // Campos existentes
  marca: marcaEnum('marca').notNull(),
  objetivo: objetivoEnum('objetivo').notNull(),
  tipo: tipoEnum('tipo').notNull(),
  status: statusEnum('status').notNull().default('ROTEIRO'),
  dataPublicacaoPrevista: timestamp('data_publicacao_prevista', { withTimezone: true }),
  canais: text('canais').array().default([]),
  midiaBrutaLinks: text('midia_bruta_links').array().default([]),
  criativosProntosLinks: text('criativos_prontos_links').array().default([]),
  categoriasCriativos: text('categorias_criativos').array().default([]),
  responsaveis: text('responsaveis'), // JSON string
  prazo: timestamp('prazo', { mode: 'date' }),
  responsavelAtual: uuid('responsavel_atual').references(() => users.id, { onDelete: 'set null' }),
  slaAtual: timestamp('sla_atual', { withTimezone: true }),
  prioridade: prioridadeEnum('prioridade').notNull().default('MEDIUM'),
  gancho: text('gancho'),
  cta: text('cta'),
  agendamentoDataHora: timestamp('agendamento_data_hora', { withTimezone: true }),
  agendamentoPlataforma: text('agendamento_plataforma'),
  agendamentoLink: text('agendamento_link'),
  urlPublica: text('url_publica'),
  criadoEm: timestamp('criado_em', { withTimezone: true }).defaultNow(),
  atualizadoEm: timestamp('atualizado_em', { withTimezone: true }).defaultNow(),
  aprovadoInterno: boolean('aprovado_interno').default(false),
  aprovadoCrispim: boolean('aprovado_crispim').default(false),
  briefingEdicao: text('briefing_edicao'),
  createdBy: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
});

export const checklistItens = pgTable('checklist_itens', {
  id: uuid('id').primaryKey().defaultRandom(),
  osId: uuid('os_id').notNull().references(() => ordensDeServico.id, { onDelete: 'cascade' }),
  nome: text('nome').notNull(),
  etapa: etapaEnum('etapa').notNull(),
  feito: boolean('feito').notNull().default(false),
  obrigatorio: boolean('obrigatorio').notNull().default(false),
  criadoEm: timestamp('criado_em', { withTimezone: true }).defaultNow(),
});

export const assets = pgTable('assets', {
  id: uuid('id').primaryKey().defaultRandom(),
  osId: uuid('os_id').notNull().references(() => ordensDeServico.id, { onDelete: 'cascade' }),
  tipo: tipoAssetEnum('tipo').notNull(),
  url: text('url').notNull(),
  versao: integer('versao').notNull().default(1),
  criadoEm: timestamp('criado_em', { withTimezone: true }).defaultNow(),
});

export const logsEvento = pgTable('logs_evento', {
  id: uuid('id').primaryKey().defaultRandom(),
  osId: uuid('os_id').notNull().references(() => ordensDeServico.id, { onDelete: 'cascade' }),
  timestamp: timestamp('timestamp', { withTimezone: true }).defaultNow(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
  acao: acaoEnum('acao').notNull(),
  detalhe: text('detalhe'),
});

// Relações
export const organizationsRelations = relations(organizations, ({ many }) => ({
  users: many(users),
  ordensDeServico: many(ordensDeServico),
  apiTokens: many(apiTokens),
  voiceProfiles: many(voiceProfiles),
  avatarProfiles: many(avatarProfiles),
  creativeTemplates: many(creativeTemplates),
  providerSettings: many(providerSettings),
  brands: many(brands),
  postSuggestions: many(postSuggestions),
  ideias: many(ideias),
  importSessions: many(importSessions),
}));
// Ideias (imported content awaiting approval)
export const ideias = pgTable('ideias', {
  id: uuid('id').primaryKey().defaultRandom(),
  titulo: text('titulo').notNull(),
  descricao: text('descricao'),
  marca: marcaEnum('marca').notNull(),
  objetivo: objetivoEnum('objetivo').notNull(),
  tipo: tipoEnum('tipo').notNull(),
  prioridade: prioridadeEnum('prioridade').notNull().default('MEDIUM'),
  gancho: text('gancho'),
  cta: text('cta'),
  scriptText: text('script_text'),
  legenda: text('legenda'),
  canais: text('canais').array().default([]),
  categoriasCriativos: text('categorias_criativos').array().default([]),
  rawMediaLinks: text('raw_media_links').array().default([]),
  prazo: timestamp('prazo', { mode: 'date' }),
  status: ideiaStatusEnum('status').notNull().default('PENDENTE'),
  aprovadaPor: uuid('aprovada_por').references(() => users.id, { onDelete: 'set null' }),
  rejeitadaPor: uuid('rejeitada_por').references(() => users.id, { onDelete: 'set null' }),
  motivoRejeicao: text('motivo_rejeicao'),
  osCriadaId: uuid('os_criada_id').references(() => ordensDeServico.id, { onDelete: 'set null' }),
  importSessionId: uuid('import_session_id').references(() => importSessions.id, { onDelete: 'set null' }),
  orgId: uuid('org_id').references(() => organizations.id, { onDelete: 'cascade' }),
  createdBy: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
  criadoEm: timestamp('criado_em', { withTimezone: true }).defaultNow(),
  atualizadoEm: timestamp('atualizado_em', { withTimezone: true }).defaultNow(),
});

// Import Sessions (for tracking bulk imports)
export const importSessions = pgTable('import_sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  orgId: uuid('org_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
  sourceType: text('source_type').notNull(), // 'FILE_UPLOAD', 'TEXT_PASTE', 'API_IMPORT'
  fileNames: text('file_names').array(),
  textSizeBytes: integer('text_size_bytes'),
  llmProvider: text('llm_provider'), // 'OPENAI', 'ANTHROPIC', 'HEURISTIC'
  itemsDetected: integer('items_detected').default(0),
  itemsCreated: integer('items_created').default(0),
  itemsSkipped: integer('items_skipped').default(0),
  errorDetails: text('error_details'), // JSON string
  processingTimeMs: integer('processing_time_ms'),
  criadoEm: timestamp('created_at', { withTimezone: true }).defaultNow(),
});


export const apiTokensRelations = relations(apiTokens, ({ one }) => ({
  organization: one(organizations, {
    fields: [apiTokens.orgId],
    references: [organizations.id],
  }),
}));

export const brandsRelations = relations(brands, ({ one }) => ({
  organization: one(organizations, {
    fields: [brands.orgId],
    references: [organizations.id],
  }),
}));

export const voiceProfilesRelations = relations(voiceProfiles, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [voiceProfiles.orgId],
    references: [organizations.id],
  }),
  ordensDeServico: many(ordensDeServico),
}));

export const avatarProfilesRelations = relations(avatarProfiles, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [avatarProfiles.orgId],
    references: [organizations.id],
  }),
  ordensDeServico: many(ordensDeServico),
}));

export const creativeTemplatesRelations = relations(creativeTemplates, ({ one }) => ({
  organization: one(organizations, {
    fields: [creativeTemplates.orgId],
    references: [organizations.id],
  }),
}));

export const distributionLinksRelations = relations(distributionLinks, ({ one }) => ({
  ordemServico: one(ordensDeServico, {
    fields: [distributionLinks.osId],
    references: [ordensDeServico.id],
  }),
}));

export const postSuggestionsRelations = relations(postSuggestions, ({ one }) => ({
  organization: one(organizations, {
    fields: [postSuggestions.orgId],
    references: [organizations.id],
  }),
}));

export const ideiasRelations = relations(ideias, ({ one }) => ({
  organization: one(organizations, {
    fields: [ideias.orgId],
    references: [organizations.id],
  }),
  aprovadaPorUser: one(users, {
    fields: [ideias.aprovadaPor],
    references: [users.id],
  }),
  rejeitadaPorUser: one(users, {
    fields: [ideias.rejeitadaPor],
    references: [users.id],
  }),
  osCriada: one(ordensDeServico, {
    fields: [ideias.osCriadaId],
    references: [ordensDeServico.id],
  }),
  importSession: one(importSessions, {
    fields: [ideias.importSessionId],
    references: [importSessions.id],
  }),
  createdByUser: one(users, {
    fields: [ideias.createdBy],
    references: [users.id],
  }),
}));

export const importSessionsRelations = relations(importSessions, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [importSessions.orgId],
    references: [organizations.id],
  }),
  user: one(users, {
    fields: [importSessions.userId],
    references: [users.id],
  }),
  ideias: many(ideias),
}));

export const usersRelations = relations(users, ({ many }) => ({
  organization: one(organizations, {
    fields: [users.orgId],
    references: [organizations.id],
  }),
  ordensResponsavel: many(ordensDeServico),
  logs: many(logsEvento),
  ideiasAprovadas: many(ideias, { relationName: 'aprovadaPorUser' }),
  ideiasRejeitadas: many(ideias, { relationName: 'rejeitadaPorUser' }),
  ideiasCreated: many(ideias, { relationName: 'createdByUser' }),
  importSessions: many(importSessions),
}));

export const ordensDeServicoRelations = relations(ordensDeServico, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [ordensDeServico.orgId],
    references: [organizations.id],
  }),
  responsavel: one(users, {
    fields: [ordensDeServico.responsavelAtual],
    references: [users.id],
  }),
  voiceProfile: one(voiceProfiles, {
    fields: [ordensDeServico.voiceProfileId],
    references: [voiceProfiles.id],
  }),
  avatar: one(avatarProfiles, {
    fields: [ordensDeServico.avatarId],
    references: [avatarProfiles.id],
  }),
  checklistItens: many(checklistItens),
  assets: many(assets),
  logs: many(logsEvento),
  distributionLinks: many(distributionLinks),
}));

export const checklistItensRelations = relations(checklistItens, ({ one }) => ({
  ordemServico: one(ordensDeServico, {
    fields: [checklistItens.osId],
    references: [ordensDeServico.id],
  }),
}));

export const assetsRelations = relations(assets, ({ one }) => ({
  ordemServico: one(ordensDeServico, {
    fields: [assets.osId],
    references: [ordensDeServico.id],
  }),
}));

export const logsEventoRelations = relations(logsEvento, ({ one }) => ({
  ordemServico: one(ordensDeServico, {
    fields: [logsEvento.osId],
    references: [ordensDeServico.id],
  }),
  user: one(users, {
    fields: [logsEvento.userId],
    references: [users.id],
  }),
}));

// Tipos TypeScript
export type Organization = typeof organizations.$inferSelect;
export type NewOrganization = typeof organizations.$inferInsert;
export type VoiceProfile = typeof voiceProfiles.$inferSelect;
export type NewVoiceProfile = typeof voiceProfiles.$inferInsert;
export type AvatarProfile = typeof avatarProfiles.$inferSelect;
export type NewAvatarProfile = typeof avatarProfiles.$inferInsert;
export type CreativeTemplate = typeof creativeTemplates.$inferSelect;
export type NewCreativeTemplate = typeof creativeTemplates.$inferInsert;
export type DistributionLink = typeof distributionLinks.$inferSelect;
export type NewDistributionLink = typeof distributionLinks.$inferInsert;
export type ApiToken = typeof apiTokens.$inferSelect;
export type NewApiToken = typeof apiTokens.$inferInsert;
export type ProviderSetting = typeof providerSettings.$inferSelect;
export type NewProviderSetting = typeof providerSettings.$inferInsert;
export type Brand = typeof brands.$inferSelect;
export type NewBrand = typeof brands.$inferInsert;
export type PostSuggestion = typeof postSuggestions.$inferSelect;
export type NewPostSuggestion = typeof postSuggestions.$inferInsert;

export type Ideia = typeof ideias.$inferSelect;
export type NewIdeia = typeof ideias.$inferInsert;
export type ImportSession = typeof importSessions.$inferSelect;
export type NewImportSession = typeof importSessions.$inferInsert;

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type OrdemServico = typeof ordensDeServico.$inferSelect;
export type NewOrdemServico = typeof ordensDeServico.$inferInsert;
export type ChecklistItem = typeof checklistItens.$inferSelect;
export type NewChecklistItem = typeof checklistItens.$inferInsert;
export type Asset = typeof assets.$inferSelect;
export type NewAsset = typeof assets.$inferInsert;
export type LogEvento = typeof logsEvento.$inferSelect;
export type NewLogEvento = typeof logsEvento.$inferInsert;

// Enums para uso no frontend
export const PLAN_OPTIONS = ['FREE', 'PRO', 'ENTERPRISE'] as const;
export const PROVIDER_OPTIONS = ['HEYGEN', 'ELEVENLABS', 'OPENAI', 'ANTHROPIC', 'INSTAGRAM', 'YOUTUBE', 'TIKTOK'] as const;
export const VOICE_PROVIDER_OPTIONS = ['HEYGEN', 'ELEVENLABS', 'HUMAN'] as const;
export const LANGUAGE_OPTIONS = ['PT_BR', 'EN', 'ES'] as const;
export const PLATFORM_OPTIONS = ['INSTAGRAM', 'TIKTOK', 'YOUTUBE', 'FACEBOOK', 'LINKEDIN'] as const;
export const TEMPLATE_PLATFORM_OPTIONS = ['REELS', 'TIKTOK', 'SHORTS', 'STORIES', 'FEED', 'YOUTUBE'] as const;
export const DISTRIBUTION_STATUS_OPTIONS = ['DRAFT', 'SCHEDULED', 'POSTED', 'FAILED'] as const;
export const API_PROVIDER_OPTIONS = ['OPENAI', 'ANTHROPIC', 'ELEVENLABS', 'HEYGEN', 'INSTAGRAM', 'YOUTUBE', 'TIKTOK'] as const;
export const POST_TYPE_OPTIONS = ['POST', 'STORY', 'REELS'] as const;
export const SUGGESTION_STATUS_OPTIONS = ['SUGGESTION', 'IN_PRODUCTION', 'APPROVED', 'POSTED'] as const;

export const IDEIA_STATUS_OPTIONS = ['PENDENTE', 'APROVADA', 'REJEITADA'] as const;

export const PAPEL_OPTIONS = ['COPY', 'AUDIO', 'VIDEO', 'EDITOR', 'REVISOR', 'CRISPIM', 'SOCIAL'] as const;
export const MARCA_OPTIONS = ['RAYTCHEL', 'ZAFFIRA', 'ZAFF', 'CRISPIM', 'FAZENDA'] as const;
export const OBJETIVO_OPTIONS = ['ATRACAO', 'NUTRICAO', 'CONVERSAO'] as const;
export const TIPO_OPTIONS = ['EDUCATIVO', 'HISTORIA', 'CONVERSAO'] as const;
export const STATUS_OPTIONS = ['ROTEIRO', 'AUDIO', 'CAPTACAO', 'EDICAO', 'REVISAO', 'APROVACAO', 'APROVADO', 'REPROVADO', 'AGENDAMENTO', 'POSTADO', 'PUBLICADO', 'RASCUNHO'] as const;
export const PRIORIDADE_OPTIONS = ['LOW', 'MEDIUM', 'HIGH'] as const;
export const TIPO_ASSET_OPTIONS = ['ROTEIRO', 'AUDIO', 'VIDEO_BRUTO', 'EDIT_V1', 'THUMB', 'LEGENDA', 'ARTE'] as const;