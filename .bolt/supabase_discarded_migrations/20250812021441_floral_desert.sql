/*
  # Clean database - Keep only Crispim user and remove all OS

  1. Data Cleanup
    - Remove all OS (ordens_de_servico) and related data
    - Remove all users except Crispim
    - Cascade deletes will handle related tables automatically

  2. User Management
    - Keep user with email or name containing "crispim" (case insensitive)
    - Ensure Crispim has proper role and approval permissions

  3. Reset State
    - Clean slate for fresh OS creation
    - Maintain only essential user (Crispim) for approvals
*/

-- Delete all OS (this will cascade to related tables)
DELETE FROM ordens_de_servico;

-- Delete all users except Crispim
DELETE FROM users 
WHERE LOWER(email) NOT LIKE '%crispim%' 
  AND LOWER(nome) NOT LIKE '%crispim%';

-- Ensure Crispim has correct permissions
UPDATE users 
SET 
  papel = 'CRISPIM',
  pode_aprovar = true,
  atualizado_em = now()
WHERE LOWER(email) LIKE '%crispim%' 
   OR LOWER(nome) LIKE '%crispim%';

-- Create Crispim user if doesn't exist
INSERT INTO users (
  nome,
  email,
  papel,
  senha_hash,
  pode_aprovar,
  org_id
)
SELECT 
  'Crispim',
  'crispim@osconteudo.com',
  'CRISPIM',
  encode(digest('crispim123', 'sha256'), 'hex'),
  true,
  null
WHERE NOT EXISTS (
  SELECT 1 FROM users 
  WHERE LOWER(email) LIKE '%crispim%' 
     OR LOWER(nome) LIKE '%crispim%'
);