/*
  # Add hardening features for OS intake

  1. New Tables
    - `os_intake_keys` - Idempotency keys for preventing duplicate imports
    - `import_sessions` - Track import sessions with metadata
  
  2. Enhancements
    - Add source tracking to ordens_de_servico
    - Add similarity checking capabilities
    - Add audit logging for imports
  
  3. Indexes
    - Performance indexes for deduplication
    - Text similarity indexes
*/

-- Idempotency keys table
CREATE TABLE IF NOT EXISTS os_intake_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  idempotency_key text NOT NULL,
  result jsonb NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(org_id, idempotency_key)
);

-- Import sessions tracking
CREATE TABLE IF NOT EXISTS import_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  source_type text NOT NULL CHECK (source_type IN ('FILE_UPLOAD', 'TEXT_PASTE', 'API_IMPORT')),
  file_names text[],
  text_size_bytes integer,
  llm_provider text CHECK (llm_provider IN ('OPENAI', 'ANTHROPIC', 'HEURISTIC')),
  items_detected integer DEFAULT 0,
  items_created integer DEFAULT 0,
  items_skipped integer DEFAULT 0,
  error_details jsonb,
  processing_time_ms integer,
  created_at timestamptz DEFAULT now()
);

-- Add source tracking to ordens_de_servico
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'ordens_de_servico' AND column_name = 'source'
  ) THEN
    ALTER TABLE ordens_de_servico ADD COLUMN source text DEFAULT 'MANUAL' CHECK (source IN ('MANUAL', 'IMPORT', 'GPT', 'API'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'ordens_de_servico' AND column_name = 'import_session_id'
  ) THEN
    ALTER TABLE ordens_de_servico ADD COLUMN import_session_id uuid REFERENCES import_sessions(id) ON DELETE SET NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'ordens_de_servico' AND column_name = 'content_hash'
  ) THEN
    ALTER TABLE ordens_de_servico ADD COLUMN content_hash text;
  END IF;
END $$;

-- Enable RLS on new tables
ALTER TABLE os_intake_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE import_sessions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for new tables
CREATE POLICY "intake_keys_org_isolation" ON os_intake_keys
  FOR ALL USING (org_id = (auth.jwt() ->> 'org_id')::uuid);

CREATE POLICY "import_sessions_org_isolation" ON import_sessions
  FOR ALL USING (org_id = (auth.jwt() ->> 'org_id')::uuid);

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_os_content_hash ON ordens_de_servico (content_hash) WHERE content_hash IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_os_source_created ON ordens_de_servico (source, criado_em DESC);
CREATE INDEX IF NOT EXISTS idx_intake_keys_org_key ON os_intake_keys (org_id, idempotency_key);
CREATE INDEX IF NOT EXISTS idx_import_sessions_org_created ON import_sessions (org_id, created_at DESC);

-- Enable pg_trgm extension for similarity matching
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Text similarity index for better deduplication
CREATE INDEX IF NOT EXISTS idx_os_titulo_similarity ON ordens_de_servico USING gin (titulo gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_os_descricao_similarity ON ordens_de_servico USING gin (descricao gin_trgm_ops) WHERE descricao IS NOT NULL;