/*
  # Add created_by column to ordens_de_servico table

  1. Schema Changes
    - Add `created_by` column to `ordens_de_servico` table
    - Column references `users(id)` with SET NULL on delete
    - Column is nullable to handle existing records

  2. Data Migration
    - Existing records will have NULL for created_by
    - New records should populate this field

  3. Security
    - No RLS changes needed as table already has proper policies
*/

-- Add created_by column to ordens_de_servico table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ordens_de_servico' AND column_name = 'created_by'
  ) THEN
    ALTER TABLE ordens_de_servico 
    ADD COLUMN created_by uuid REFERENCES users(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_ordens_created_by 
ON ordens_de_servico(created_by);