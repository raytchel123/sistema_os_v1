/*
  # Adicionar campos de aprovação

  1. Novos Campos
    - `aprovado_interno` (boolean) - Aprovação da revisão interna
    - `aprovado_crispim` (boolean) - Aprovação do Crispim
  
  2. Defaults
    - Ambos campos começam como `false`
    - Necessários para validações do StateMachine
*/

-- Adicionar campos de aprovação na tabela ordens_de_servico
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ordens_de_servico' AND column_name = 'aprovado_interno'
  ) THEN
    ALTER TABLE ordens_de_servico ADD COLUMN aprovado_interno boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ordens_de_servico' AND column_name = 'aprovado_crispim'
  ) THEN
    ALTER TABLE ordens_de_servico ADD COLUMN aprovado_crispim boolean DEFAULT false;
  END IF;
END $$;

-- Adicionar índices para otimizar consultas de aprovação
CREATE INDEX IF NOT EXISTS idx_ordens_aprovado_interno ON ordens_de_servico(aprovado_interno);
CREATE INDEX IF NOT EXISTS idx_ordens_aprovado_crispim ON ordens_de_servico(aprovado_crispim);