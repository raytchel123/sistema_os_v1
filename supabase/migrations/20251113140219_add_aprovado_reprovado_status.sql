/*
  # Add APROVADO and REPROVADO status values

  1. Changes
    - Add `APROVADO` value to `status_enum` type
    - Add `REPROVADO` value to `status_enum` type
  
  2. Notes
    - These status values are needed for the approval flow
    - APROVADO: OS has been approved and is ready for scheduling
    - REPROVADO: OS has been rejected and needs rework
*/

-- Add APROVADO status if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum 
    WHERE enumlabel = 'APROVADO' 
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'status_enum')
  ) THEN
    ALTER TYPE status_enum ADD VALUE 'APROVADO';
  END IF;
END $$;

-- Add REPROVADO status if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum 
    WHERE enumlabel = 'REPROVADO' 
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'status_enum')
  ) THEN
    ALTER TYPE status_enum ADD VALUE 'REPROVADO';
  END IF;
END $$;