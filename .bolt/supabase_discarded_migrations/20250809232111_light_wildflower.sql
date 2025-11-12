/*
  # OS Conteúdo - Schema completo para gerenciamento de produção de vídeos

  1. Enums
    - papel_enum: Papéis dos usuários no sistema
    - marca_enum: Marcas disponíveis para os vídeos
    - objetivo_enum: Objetivos dos vídeos
    - tipo_enum: Tipos de conteúdo
    - status_enum: Status das ordens de serviço
    - prioridade_enum: Níveis de prioridade
    - etapa_enum: Etapas do processo
    - tipo_asset_enum: Tipos de assets
    - acao_enum: Ações registradas nos logs

  2. Tabelas
    - users: Usuários do sistema (simplificado, não usando auth nativa)
    - ordens_de_servico: Ordens de serviço principais
    - checklist_itens: Itens de checklist por OS
    - assets: Arquivos e assets das OS
    - logs_evento: Log de eventos e mudanças

  3. Índices
    - Índices otimizados para consultas frequentes
    - Índices compostos para relatórios

  4. Views
    - vw_os_resumo: Visão resumida das OS com dados do responsável

  5. Triggers
    - Trigger para atualizar atualizado_em automaticamente

  6. Segurança
    - RLS preparado mas desabilitado (TODO: ativar por org_id)
*/

-- Criar enums
CREATE TYPE papel_enum AS ENUM ('COPY', 'AUDIO', 'VIDEO', 'EDITOR', 'REVISOR', 'CRISPIM', 'SOCIAL');
CREATE TYPE marca_enum AS ENUM ('RAYTCHEL', 'ZAFFIRA', 'ZAFF', 'CRISPIM', 'FAZENDA');
CREATE TYPE objetivo_enum AS ENUM ('ATRACAO', 'NUTRICAO', 'CONVERSAO');
CREATE TYPE tipo_enum AS ENUM ('EDUCATIVO', 'HISTORIA', 'CONVERSAO');
CREATE TYPE status_enum AS ENUM ('ROTEIRO', 'AUDIO', 'CAPTACAO', 'EDICAO', 'REVISAO', 'APROVACAO', 'AGENDAMENTO', 'POSTADO');
CREATE TYPE prioridade_enum AS ENUM ('LOW', 'MEDIUM', 'HIGH');
CREATE TYPE etapa_enum AS ENUM ('ROTEIRO', 'AUDIO', 'CAPTACAO', 'EDICAO', 'REVISAO', 'APROVACAO', 'AGENDAMENTO', 'POSTADO');
CREATE TYPE tipo_asset_enum AS ENUM ('ROTEIRO', 'AUDIO', 'VIDEO_BRUTO', 'EDIT_V1', 'THUMB', 'LEGENDA', 'ARTE');
CREATE TYPE acao_enum AS ENUM ('CRIAR', 'MUDAR_STATUS', 'ANEXAR_ASSET', 'REPROVAR', 'APROVAR', 'AGENDAR', 'POSTAR');

-- Tabela users
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  email text UNIQUE NOT NULL,
  papel papel_enum NOT NULL,
  senha_hash text NOT NULL,
  criado_em timestamptz DEFAULT now(),
  atualizado_em timestamptz DEFAULT now()
);

-- Tabela ordens_de_servico
CREATE TABLE IF NOT EXISTS ordens_de_servico (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo text NOT NULL,
  marca marca_enum NOT NULL,
  objetivo objetivo_enum NOT NULL,
  tipo tipo_enum NOT NULL,
  status status_enum NOT NULL DEFAULT 'ROTEIRO',
  data_publicacao_prevista timestamptz,
  canais text[] DEFAULT '{}'::text[],
  responsavel_atual uuid REFERENCES users(id) ON DELETE SET NULL,
  sla_atual timestamptz,
  prioridade prioridade_enum NOT NULL DEFAULT 'MEDIUM',
  gancho text,
  cta text,
  criado_em timestamptz DEFAULT now(),
  atualizado_em timestamptz DEFAULT now()
);

-- Tabela checklist_itens
CREATE TABLE IF NOT EXISTS checklist_itens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  os_id uuid NOT NULL REFERENCES ordens_de_servico(id) ON DELETE CASCADE,
  nome text NOT NULL,
  etapa etapa_enum NOT NULL,
  feito boolean NOT NULL DEFAULT false,
  obrigatorio boolean NOT NULL DEFAULT false,
  criado_em timestamptz DEFAULT now()
);

-- Tabela assets
CREATE TABLE IF NOT EXISTS assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  os_id uuid NOT NULL REFERENCES ordens_de_servico(id) ON DELETE CASCADE,
  tipo tipo_asset_enum NOT NULL,
  url text NOT NULL,
  versao int NOT NULL DEFAULT 1,
  criado_em timestamptz DEFAULT now()
);

-- Tabela logs_evento
CREATE TABLE IF NOT EXISTS logs_evento (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  os_id uuid NOT NULL REFERENCES ordens_de_servico(id) ON DELETE CASCADE,
  timestamp timestamptz DEFAULT now(),
  user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  acao acao_enum NOT NULL,
  detalhe text
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_ordens_status ON ordens_de_servico(status);
CREATE INDEX IF NOT EXISTS idx_ordens_data_publicacao ON ordens_de_servico(data_publicacao_prevista);
CREATE INDEX IF NOT EXISTS idx_ordens_marca ON ordens_de_servico(marca);
CREATE INDEX IF NOT EXISTS idx_ordens_responsavel ON ordens_de_servico(responsavel_atual);
CREATE INDEX IF NOT EXISTS idx_ordens_prioridade ON ordens_de_servico(prioridade);
CREATE INDEX IF NOT EXISTS idx_logs_os_id ON logs_evento(os_id);
CREATE INDEX IF NOT EXISTS idx_assets_os_id ON assets(os_id);
CREATE INDEX IF NOT EXISTS idx_checklist_os_id ON checklist_itens(os_id);
CREATE INDEX IF NOT EXISTS idx_checklist_etapa ON checklist_itens(etapa);
CREATE INDEX IF NOT EXISTS idx_users_papel ON users(papel);

-- Função para atualizar timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.atualizado_em = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers para atualizar atualizado_em
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ordens_updated_at BEFORE UPDATE ON ordens_de_servico
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- View para resumo das OS
CREATE OR REPLACE VIEW vw_os_resumo AS
SELECT 
  os.id,
  os.titulo,
  os.status,
  os.prioridade,
  os.data_publicacao_prevista,
  os.marca,
  os.objetivo,
  os.tipo,
  u.nome as responsavel_nome,
  u.papel as responsavel_papel,
  os.criado_em,
  os.atualizado_em,
  -- Contadores úteis
  (SELECT COUNT(*) FROM checklist_itens ci WHERE ci.os_id = os.id) as total_checklist,
  (SELECT COUNT(*) FROM checklist_itens ci WHERE ci.os_id = os.id AND ci.feito = true) as checklist_concluidos,
  (SELECT COUNT(*) FROM assets a WHERE a.os_id = os.id) as total_assets
FROM ordens_de_servico os
LEFT JOIN users u ON os.responsavel_atual = u.id;

-- TODO: Ativar RLS por org_id quando implementarmos multi-tenancy
-- ALTER TABLE users ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE ordens_de_servico ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE checklist_itens ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE assets ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE logs_evento ENABLE ROW LEVEL SECURITY;

-- Comentários para documentação
COMMENT ON TABLE users IS 'Usuários do sistema OS Conteúdo';
COMMENT ON TABLE ordens_de_servico IS 'Ordens de serviço para produção de vídeos';
COMMENT ON TABLE checklist_itens IS 'Itens de checklist por etapa da OS';
COMMENT ON TABLE assets IS 'Arquivos e assets relacionados às OS';
COMMENT ON TABLE logs_evento IS 'Log de eventos e mudanças nas OS';
COMMENT ON VIEW vw_os_resumo IS 'Visão resumida das OS com dados agregados';