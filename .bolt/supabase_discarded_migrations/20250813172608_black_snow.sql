/*
  # Add legenda column to ordens_de_servico table

  1. Schema Changes
    - Add `legenda` column to `ordens_de_servico` table
    - Column type: text (nullable)
    - Used for storing social media captions

  2. Notes
    - This column was missing from the database but exists in the schema
    - Required for OS editing functionality in the drawer
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ordens_de_servico' AND column_name = 'legenda'
  ) THEN
    ALTER TABLE ordens_de_servico ADD COLUMN legenda text;
  END IF;
END $$;