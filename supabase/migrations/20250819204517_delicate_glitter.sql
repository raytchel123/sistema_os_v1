/*
  # Add specific token columns to provider_settings

  1. Schema Changes
    - Add `instagram_token` column to store Instagram access tokens
    - Add `youtube_api_key` column to store YouTube API keys  
    - Add `tiktok_token` column to store TikTok access tokens
    - Add `brand_id` column to link tokens to specific brands
    - Update indexes for better performance

  2. Data Migration
    - Preserve existing data in `api_key` column
    - Add proper constraints and indexes

  3. Security
    - Maintain existing RLS policies
    - Ensure proper organization isolation
*/

-- Add new token columns if they don't exist
DO $$
BEGIN
  -- Add instagram_token column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'provider_settings' AND column_name = 'instagram_token'
  ) THEN
    ALTER TABLE provider_settings ADD COLUMN instagram_token text;
  END IF;

  -- Add youtube_api_key column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'provider_settings' AND column_name = 'youtube_api_key'
  ) THEN
    ALTER TABLE provider_settings ADD COLUMN youtube_api_key text;
  END IF;

  -- Add tiktok_token column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'provider_settings' AND column_name = 'tiktok_token'
  ) THEN
    ALTER TABLE provider_settings ADD COLUMN tiktok_token text;
  END IF;

  -- Add brand_id column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'provider_settings' AND column_name = 'brand_id'
  ) THEN
    ALTER TABLE provider_settings ADD COLUMN brand_id uuid REFERENCES brands(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_provider_settings_brand ON provider_settings(brand_id);
CREATE INDEX IF NOT EXISTS idx_provider_settings_org_brand ON provider_settings(org_id, brand_id);

-- Create unique constraint for org + brand + provider combination
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'provider_settings' 
    AND constraint_name = 'provider_settings_org_brand_provider_key'
  ) THEN
    ALTER TABLE provider_settings 
    ADD CONSTRAINT provider_settings_org_brand_provider_key 
    UNIQUE (org_id, brand_id, provider);
  END IF;
END $$;