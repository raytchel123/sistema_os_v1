/*
  # Add approval permission to users

  1. New Column
    - `pode_aprovar` (boolean, default false) - Whether user can approve OS

  2. Security
    - Update existing users to set approval permissions based on role
    - CRISPIM role gets approval permission by default
*/

-- Add approval permission column
ALTER TABLE users ADD COLUMN IF NOT EXISTS pode_aprovar boolean DEFAULT false;

-- Set approval permissions for existing users based on role
UPDATE users SET pode_aprovar = true WHERE papel = 'CRISPIM';

-- Add comment to document the column
COMMENT ON COLUMN users.pode_aprovar IS 'Whether this user can approve OS in the approval workflow';