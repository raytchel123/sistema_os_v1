/*
  # Add Design and Desenvolvedor roles to papel_enum
  
  1. Changes
    - Add 'DESIGN' value to papel_enum type
    - Add 'DESENVOLVEDOR' value to papel_enum type
  
  2. Notes
    - These new roles allow designers and developers to be added as users in the system
    - Safe operation that only adds new enum values
*/

-- Add DESIGN role
ALTER TYPE papel_enum ADD VALUE IF NOT EXISTS 'DESIGN';

-- Add DESENVOLVEDOR role
ALTER TYPE papel_enum ADD VALUE IF NOT EXISTS 'DESENVOLVEDOR';
