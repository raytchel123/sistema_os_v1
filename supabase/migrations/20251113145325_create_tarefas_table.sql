/*
  # Create tarefas table

  1. New Tables
    - `tarefas`
      - `id` (uuid, primary key)
      - `org_id` (uuid, references organizations)
      - `descricao` (text) - Task description
      - `prioridade` (prioridade_enum) - Task priority (LOW, MEDIUM, HIGH)
      - `usuario_id` (uuid, references users) - Assigned user
      - `marca` (marca_enum) - Brand
      - `status` (text) - Task status (PENDENTE, EM_ANDAMENTO, CONCLUIDA, CANCELADA)
      - `criado_em` (timestamptz) - Creation timestamp
      - `atualizado_em` (timestamptz) - Last update timestamp
      - `created_by` (uuid, references users) - User who created the task

  2. Security
    - Enable RLS on `tarefas` table
    - Add policy for authenticated users to read tarefas from their organization
    - Add policy for authenticated users to create tarefas in their organization
    - Add policy for authenticated users to update tarefas in their organization
    - Add policy for authenticated users to delete tarefas in their organization
*/

-- Create enum for task status
DO $$ BEGIN
  CREATE TYPE tarefa_status_enum AS ENUM ('PENDENTE', 'EM_ANDAMENTO', 'CONCLUIDA', 'CANCELADA');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create tarefas table
CREATE TABLE IF NOT EXISTS tarefas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  descricao text NOT NULL,
  prioridade prioridade_enum NOT NULL DEFAULT 'MEDIUM',
  usuario_id uuid REFERENCES users(id) ON DELETE SET NULL,
  marca marca_enum NOT NULL,
  status tarefa_status_enum NOT NULL DEFAULT 'PENDENTE',
  criado_em timestamptz DEFAULT now(),
  atualizado_em timestamptz DEFAULT now(),
  created_by uuid REFERENCES users(id) ON DELETE SET NULL
);

-- Enable RLS
ALTER TABLE tarefas ENABLE ROW LEVEL SECURITY;

-- Policy for reading tarefas
CREATE POLICY "Users can view tarefas from their organization"
  ON tarefas FOR SELECT
  TO authenticated
  USING (
    org_id IN (
      SELECT org_id FROM users WHERE id = auth.uid()
    )
  );

-- Policy for creating tarefas
CREATE POLICY "Users can create tarefas in their organization"
  ON tarefas FOR INSERT
  TO authenticated
  WITH CHECK (
    org_id IN (
      SELECT org_id FROM users WHERE id = auth.uid()
    )
  );

-- Policy for updating tarefas
CREATE POLICY "Users can update tarefas in their organization"
  ON tarefas FOR UPDATE
  TO authenticated
  USING (
    org_id IN (
      SELECT org_id FROM users WHERE id = auth.uid()
    )
  )
  WITH CHECK (
    org_id IN (
      SELECT org_id FROM users WHERE id = auth.uid()
    )
  );

-- Policy for deleting tarefas
CREATE POLICY "Users can delete tarefas in their organization"
  ON tarefas FOR DELETE
  TO authenticated
  USING (
    org_id IN (
      SELECT org_id FROM users WHERE id = auth.uid()
    )
  );