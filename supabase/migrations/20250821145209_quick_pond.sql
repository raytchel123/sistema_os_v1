/*
  # Criar tabela de histórico de alterações das OS

  1. Nova Tabela
    - `os_history_log`
      - `id` (uuid, primary key)
      - `os_id` (uuid, foreign key para ordens_de_servico)
      - `user_id` (uuid, foreign key para users)
      - `action_type` (text) - tipo da ação (UPDATE_STATUS, UPDATE_FIELD, etc.)
      - `field_name` (text) - nome do campo alterado
      - `old_value` (text) - valor anterior
      - `new_value` (text) - novo valor
      - `metadata` (jsonb) - dados adicionais da alteração
      - `created_at` (timestamp)

  2. Índices
    - Índice por OS para consultas rápidas
    - Índice por data para ordenação

  3. Segurança
    - RLS habilitado
    - Políticas por organização
*/

-- Criar tabela de histórico de alterações
CREATE TABLE IF NOT EXISTS os_history_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  os_id uuid NOT NULL REFERENCES ordens_de_servico(id) ON DELETE CASCADE,
  user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  action_type text NOT NULL,
  field_name text,
  old_value text,
  new_value text,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_os_history_os_id ON os_history_log(os_id);
CREATE INDEX IF NOT EXISTS idx_os_history_created_at ON os_history_log(os_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_os_history_action_type ON os_history_log(action_type);

-- Habilitar RLS
ALTER TABLE os_history_log ENABLE ROW LEVEL SECURITY;

-- Política para SELECT - usuários podem ver histórico das OS da sua organização
CREATE POLICY "history_select_by_org" ON os_history_log
  FOR SELECT
  TO public
  USING (
    EXISTS (
      SELECT 1 FROM ordens_de_servico os
      WHERE os.id = os_history_log.os_id
      AND (os.org_id IS NULL OR os.org_id = ((jwt() ->> 'org_id')::uuid))
    )
  );

-- Política para INSERT - usuários podem criar logs das OS da sua organização
CREATE POLICY "history_insert_by_org" ON os_history_log
  FOR INSERT
  TO public
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM ordens_de_servico os
      WHERE os.id = os_history_log.os_id
      AND (os.org_id IS NULL OR os.org_id = ((jwt() ->> 'org_id')::uuid))
    )
  );