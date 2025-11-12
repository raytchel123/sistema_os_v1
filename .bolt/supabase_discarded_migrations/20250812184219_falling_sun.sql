/*
  # Make API key column nullable

  1. Schema Changes
    - Make `api_key` column in `provider_settings` table nullable
    - This allows storing null values when tokens are empty or not provided

  2. Safety
    - Uses IF EXISTS to prevent errors if column doesn't exist
    - Safe operation that won't break existing data
*/

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'provider_settings' AND column_name = 'api_key'
  ) THEN
    ALTER TABLE provider_settings ALTER COLUMN api_key DROP NOT NULL;
  END IF;
END $$;