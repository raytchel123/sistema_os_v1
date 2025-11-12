/*
  # Remove provider constraint from provider_settings

  1. Changes
    - Remove CHECK constraint on provider column
    - Allow any provider value to be stored

  2. Security
    - Maintains RLS policies
    - Preserves org_id isolation
*/

-- Remove the provider check constraint
ALTER TABLE provider_settings DROP CONSTRAINT IF EXISTS provider_settings_provider_check;