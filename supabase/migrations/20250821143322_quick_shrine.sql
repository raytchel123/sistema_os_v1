/*
  # Adicionar campo informações adicionais às OS

  1. Alterações
    - Adicionar coluna `informacoes_adicionais` na tabela `ordens_de_servico`
    - Campo de texto para armazenar informações extras do roteiro

  2. Segurança
    - Verificação se a coluna já existe antes de adicionar
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ordens_de_servico' AND column_name = 'informacoes_adicionais'
  ) THEN
    ALTER TABLE ordens_de_servico ADD COLUMN informacoes_adicionais text;
  END IF;
END $$;