/*
  # Add motivo_reprovacao column

  1. Changes
    - Add `motivo_reprovacao` column to `ordens_de_servico` table
      - Type: text (nullable)
      - Purpose: Store the reason when an OS is rejected during approval process
  
  2. Notes
    - This column is optional and only filled when an OS is rejected
    - Helps track why content was rejected for future reference
*/

-- Add motivo_reprovacao column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ordens_de_servico' AND column_name = 'motivo_reprovacao'
  ) THEN
    ALTER TABLE ordens_de_servico ADD COLUMN motivo_reprovacao text;
  END IF;
END $$;