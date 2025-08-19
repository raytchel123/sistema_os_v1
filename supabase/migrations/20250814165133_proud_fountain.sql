-- Criar tabela brands
CREATE TABLE IF NOT EXISTS brands (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid,
  name text NOT NULL,
  code text NOT NULL,
  description text,
  about text,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_brands_org ON brands(org_id);
CREATE INDEX IF NOT EXISTS idx_brands_active ON brands(is_active);
CREATE UNIQUE INDEX IF NOT EXISTS idx_brands_org_code ON brands(org_id, code);

-- Comentário da tabela
COMMENT ON TABLE brands IS 'Marcas customizáveis por organização';