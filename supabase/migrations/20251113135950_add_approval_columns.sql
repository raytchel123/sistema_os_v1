/*
  # Add approval tracking columns

  1. Changes
    - Add approval and rejection tracking columns to `ordens_de_servico` table
      - `aprovado_por` (uuid): User who approved the OS
      - `aprovado_em` (timestamptz): When the OS was approved
      - `reprovado_por` (uuid): User who rejected the OS
      - `reprovado_em` (timestamptz): When the OS was rejected
  
  2. Notes
    - All columns are nullable as they only apply to approved/rejected OS
    - Foreign keys link to the users table
*/

-- Add approval tracking columns
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ordens_de_servico' AND column_name = 'aprovado_por'
  ) THEN
    ALTER TABLE ordens_de_servico ADD COLUMN aprovado_por uuid REFERENCES users(id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ordens_de_servico' AND column_name = 'aprovado_em'
  ) THEN
    ALTER TABLE ordens_de_servico ADD COLUMN aprovado_em timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ordens_de_servico' AND column_name = 'reprovado_por'
  ) THEN
    ALTER TABLE ordens_de_servico ADD COLUMN reprovado_por uuid REFERENCES users(id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ordens_de_servico' AND column_name = 'reprovado_em'
  ) THEN
    ALTER TABLE ordens_de_servico ADD COLUMN reprovado_em timestamptz;
  END IF;
END $$;