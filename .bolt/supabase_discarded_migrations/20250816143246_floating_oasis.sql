/*
  # Add social media token columns to provider_settings

  1. New Columns
    - `instagram_token` (text) - Token for Instagram API
    - `youtube_api_key` (text) - API key for YouTube
    - `tiktok_token` (text) - Token for TikTok API
  
  2. Changes
    - Add specific columns for each social media platform
    - Keep existing structure for other providers
*/

-- Add specific columns for social media tokens
DO $$
BEGIN
  -- Add instagram_token column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'provider_settings' AND column_name = 'instagram_token'
  ) THEN
    ALTER TABLE provider_settings ADD COLUMN instagram_token text;
  END IF;

  -- Add youtube_api_key column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'provider_settings' AND column_name = 'youtube_api_key'
  ) THEN
    ALTER TABLE provider_settings ADD COLUMN youtube_api_key text;
  END IF;

  -- Add tiktok_token column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'provider_settings' AND column_name = 'tiktok_token'
  ) THEN
    ALTER TABLE provider_settings ADD COLUMN tiktok_token text;
  END IF;
END $$;