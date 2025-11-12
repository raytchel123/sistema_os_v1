/*
  # Create default organization and associate users

  1. New Tables
    - Creates a default organization if none exists
  
  2. Updates
    - Associates all users without org_id to the default organization
    
  3. Security
    - Maintains existing RLS policies
    - Ensures all users have an organization
*/

-- Create default organization if it doesn't exist
INSERT INTO organizations (id, name, plan, quota_os_monthly, quota_ai_requests_monthly)
SELECT 
  gen_random_uuid(),
  'Organização Padrão',
  'PRO',
  1000,
  10000
WHERE NOT EXISTS (SELECT 1 FROM organizations LIMIT 1);

-- Get the organization ID (either existing or newly created)
DO $$
DECLARE
  default_org_id uuid;
BEGIN
  -- Get the first organization (or the one we just created)
  SELECT id INTO default_org_id FROM organizations LIMIT 1;
  
  -- Update all users without org_id to use the default organization
  UPDATE users 
  SET org_id = default_org_id 
  WHERE org_id IS NULL;
END $$;