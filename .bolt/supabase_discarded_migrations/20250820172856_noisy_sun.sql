/*
  # Create ideias table for imported content approval workflow

  1. New Tables
    - `ideias`
      - `id` (uuid, primary key)
      - `titulo` (text)
      - `descricao` (text)
      - `marca` (text)
      - `objetivo` (enum)
      - `tipo` (enum)
      - `prioridade` (enum)
      - `gancho` (text)
      - `cta` (text)
      - `script_text` (text)
      - `legenda` (text)
      - `canais` (text array)
      - `categorias_criativos` (text array)
      - `raw_media_links` (text array)
      - `prazo` (date)
      - `status` (enum: PENDENTE, APROVADA, REJEITADA)
      - `aprovada_por` (uuid, foreign key to users)
      - `rejeitada_por` (uuid, foreign key to users)
      - `motivo_rejeicao` (text)
      - `os_criada_id` (uuid, foreign key to ordens_de_servico)
      - `import_session_id` (uuid)
      - `org_id` (uuid, foreign key to organizations)
      - `created_by` (uuid, foreign key to users)
      - `criado_em` (timestamp)
      - `atualizado_em` (timestamp)

  2. Security
    - Enable RLS on `ideias` table
    - Add policies for organization isolation
    - Add policies for approval workflow

  3. Indexes
    - Add indexes for performance optimization
*/

-- Create status enum for ideias
CREATE TYPE IF NOT EXISTS ideia_status_enum AS ENUM ('PENDENTE', 'APROVADA', 'REJEITADA');

-- Create ideias table
CREATE TABLE IF NOT EXISTS ideias (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo text NOT NULL,
  descricao text,
  marca marca_enum NOT NULL,
  objetivo objetivo_enum NOT NULL,
  tipo tipo_enum NOT NULL,
  prioridade prioridade_enum NOT NULL DEFAULT 'MEDIUM',
  gancho text,
  cta text,
  script_text text,
  legenda text,
  canais text[] DEFAULT '{}',
  categorias_criativos text[] DEFAULT '{}',
  raw_media_links text[] DEFAULT '{}',
  prazo date,
  status ideia_status_enum NOT NULL DEFAULT 'PENDENTE',
  aprovada_por uuid REFERENCES users(id) ON DELETE SET NULL,
  rejeitada_por uuid REFERENCES users(id) ON DELETE SET NULL,
  motivo_rejeicao text,
  os_criada_id uuid REFERENCES ordens_de_servico(id) ON DELETE SET NULL,
  import_session_id uuid REFERENCES import_sessions(id) ON DELETE SET NULL,
  org_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  created_by uuid REFERENCES users(id) ON DELETE SET NULL,
  criado_em timestamp with time zone DEFAULT now(),
  atualizado_em timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE ideias ENABLE ROW LEVEL SECURITY;

-- RLS Policies for organization isolation
CREATE POLICY "ideias_select_by_org"
  ON ideias
  FOR SELECT
  TO public
  USING ((org_id IS NULL) OR (org_id = ((jwt() ->> 'org_id'::text))::uuid));

CREATE POLICY "ideias_insert_by_org"
  ON ideias
  FOR INSERT
  TO public
  WITH CHECK ((org_id IS NULL) OR (org_id = ((jwt() ->> 'org_id'::text))::uuid));

CREATE POLICY "ideias_update_by_org"
  ON ideias
  FOR UPDATE
  TO public
  USING ((org_id IS NULL) OR (org_id = ((jwt() ->> 'org_id'::text))::uuid))
  WITH CHECK ((org_id IS NULL) OR (org_id = ((jwt() ->> 'org_id'::text))::uuid));

CREATE POLICY "ideias_delete_by_org"
  ON ideias
  FOR DELETE
  TO public
  USING ((org_id IS NULL) OR (org_id = ((jwt() ->> 'org_id'::text))::uuid));

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_ideias_org ON ideias USING btree (org_id);
CREATE INDEX IF NOT EXISTS idx_ideias_status ON ideias USING btree (status);
CREATE INDEX IF NOT EXISTS idx_ideias_marca ON ideias USING btree (marca);
CREATE INDEX IF NOT EXISTS idx_ideias_created ON ideias USING btree (org_id, criado_em DESC);
CREATE INDEX IF NOT EXISTS idx_ideias_aprovada_por ON ideias USING btree (aprovada_por);
CREATE INDEX IF NOT EXISTS idx_ideias_import_session ON ideias USING btree (import_session_id);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_ideias_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.atualizado_em = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_ideias_updated_at
  BEFORE UPDATE ON ideias
  FOR EACH ROW
  EXECUTE FUNCTION update_ideias_updated_at();