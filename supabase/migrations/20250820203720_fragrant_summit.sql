/*
  # Add data_publicacao_prevista to ideias table

  1. New Columns
    - `data_publicacao_prevista` (timestamptz) - Data e hora prevista para publicação da ideia

  2. Changes
    - Adiciona coluna para armazenar data de publicação das ideias importadas
    - Permite NULL para ideias que não especificam data
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ideias' AND column_name = 'data_publicacao_prevista'
  ) THEN
    ALTER TABLE ideias ADD COLUMN data_publicacao_prevista timestamptz;
  END IF;
END $$;