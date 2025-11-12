/*
  # Add organization_id column to ordens_de_servico table

  1. Changes
    - Add `organization_id` column to `ordens_de_servico` table
    - Set up foreign key relationship to `organizations` table
    - Add index for performance

  2. Security
    - Column allows NULL values for backward compatibility
    - Foreign key constraint ensures data integrity
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ordens_de_servico' AND column_name = 'organization_id'
  ) THEN
    ALTER TABLE ordens_de_servico ADD COLUMN organization_id uuid;
    ALTER TABLE ordens_de_servico ADD CONSTRAINT ordens_de_servico_organization_id_fkey 
      FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE SET NULL;
    CREATE INDEX IF NOT EXISTS idx_ordens_organization_id ON ordens_de_servico(organization_id);
  END IF;
END $$;