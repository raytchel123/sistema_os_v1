/*
  # Add menu permissions column to users table

  1. New Columns
    - `menu_permissions` (jsonb) - Controls which menu items the user can access
      - Default permissions for basic users
      - Granular control over each menu item

  2. Security
    - Column allows null values for backward compatibility
    - Default permissions ensure basic functionality

  3. Changes
    - Add menu_permissions column to users table
    - Set default permissions for existing users
*/

-- Add menu_permissions column to users table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'menu_permissions'
  ) THEN
    ALTER TABLE users ADD COLUMN menu_permissions jsonb DEFAULT '{
      "kanban": true,
      "lista": true,
      "calendario": true,
      "biblioteca": true,
      "ideias": true,
      "importar": false,
      "ideias_pendentes": false,
      "tendencias": true,
      "relatorios": false,
      "settings": false,
      "usuarios": false
    }'::jsonb;
  END IF;
END $$;

-- Update existing users with default permissions if they don't have any
UPDATE users 
SET menu_permissions = '{
  "kanban": true,
  "lista": true,
  "calendario": true,
  "biblioteca": true,
  "ideias": true,
  "importar": false,
  "ideias_pendentes": false,
  "tendencias": true,
  "relatorios": false,
  "settings": false,
  "usuarios": false
}'::jsonb
WHERE menu_permissions IS NULL;