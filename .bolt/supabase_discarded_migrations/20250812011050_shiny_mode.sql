/*
  # Clean database - Keep only Crispim user and remove all OS

  1. Data Cleanup
    - Remove all OS (ordens_de_servico)
    - Remove all related data (logs, assets, checklist, distribution_links)
    - Keep only Crispim user account
    - Remove all other users

  2. Security
    - Cascading deletes will handle related records
    - Preserve system integrity
*/

-- Delete all distribution links (will cascade from OS deletion, but explicit for clarity)
DELETE FROM distribution_links;

-- Delete all logs
DELETE FROM logs_evento;

-- Delete all assets
DELETE FROM assets;

-- Delete all checklist items
DELETE FROM checklist_itens;

-- Delete all OS
DELETE FROM ordens_de_servico;

-- Delete all users except Crispim (assuming email contains 'crispim')
DELETE FROM users 
WHERE LOWER(email) NOT LIKE '%crispim%' 
AND LOWER(nome) NOT LIKE '%crispim%';

-- Update Crispim user to ensure correct permissions
UPDATE users 
SET 
  papel = 'CRISPIM',
  pode_aprovar = true
WHERE LOWER(email) LIKE '%crispim%' 
OR LOWER(nome) LIKE '%crispim%';

-- Reset any sequences if needed (optional)
-- This ensures clean IDs for new records
-- ALTER SEQUENCE IF EXISTS ordens_de_servico_id_seq RESTART WITH 1;
-- ALTER SEQUENCE IF EXISTS users_id_seq RESTART WITH 1;