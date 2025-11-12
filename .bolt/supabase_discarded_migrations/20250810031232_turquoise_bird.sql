-- Adicionar campo briefing_edicao à tabela ordens_de_servico

ALTER TABLE ordens_de_servico 
ADD COLUMN IF NOT EXISTS briefing_edicao TEXT;

-- Adicionar índice para busca por briefing
CREATE INDEX IF NOT EXISTS idx_ordens_briefing ON ordens_de_servico USING gin(to_tsvector('portuguese', briefing_edicao));

-- Comentário da coluna
COMMENT ON COLUMN ordens_de_servico.briefing_edicao IS 'Briefing detalhado gerado automaticamente para a equipe de edição';