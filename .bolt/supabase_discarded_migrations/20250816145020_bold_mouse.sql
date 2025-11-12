/*
  # Add brand_id column to provider_settings

  1. Changes
    - Add brand_id column to provider_settings table
    - Add foreign key constraint to brands table
    - Update unique constraint to include brand_id
    - Add index for better performance

  2. Security
    - Maintain existing RLS policies
    - Add index for org_id + brand_id queries
*/

-- Add brand_id column to provider_settings
ALTER TABLE provider_settings 
ADD COLUMN brand_id uuid REFERENCES brands(id) ON DELETE CASCADE;

-- Drop old unique constraint
ALTER TABLE provider_settings 
DROP CONSTRAINT provider_settings_org_id_provider_key;

-- Add new unique constraint including brand_id
ALTER TABLE provider_settings 
ADD CONSTRAINT provider_settings_org_brand_provider_key 
UNIQUE (org_id, brand_id, provider);

-- Add index for better performance
CREATE INDEX idx_provider_settings_org_brand 
ON provider_settings (org_id, brand_id);

-- Add index for brand_id lookups
CREATE INDEX idx_provider_settings_brand 
ON provider_settings (brand_id);