/*
  # Adicionar numeração automática para OS

  1. Nova Coluna
    - `numero_os` (integer, unique, auto-increment)
    - Sequência automática para numeração
    
  2. Trigger
    - Trigger para auto-incrementar o número da OS
    - Baseado na organização para isolamento
    
  3. Índices
    - Índice único para org_id + numero_os
    - Índice para busca rápida por número
*/

-- Adicionar coluna numero_os
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ordens_de_servico' AND column_name = 'numero_os'
  ) THEN
    ALTER TABLE ordens_de_servico ADD COLUMN numero_os integer;
  END IF;
END $$;

-- Criar sequência para numeração por organização
CREATE OR REPLACE FUNCTION get_next_os_number(org_uuid uuid)
RETURNS integer AS $$
DECLARE
  next_number integer;
BEGIN
  -- Buscar o próximo número para a organização
  SELECT COALESCE(MAX(numero_os), 0) + 1 
  INTO next_number
  FROM ordens_de_servico 
  WHERE org_id = org_uuid OR (org_id IS NULL AND org_uuid IS NULL);
  
  RETURN next_number;
END;
$$ LANGUAGE plpgsql;

-- Criar trigger para auto-incrementar numero_os
CREATE OR REPLACE FUNCTION set_os_number()
RETURNS trigger AS $$
BEGIN
  -- Só definir número se não foi fornecido
  IF NEW.numero_os IS NULL THEN
    NEW.numero_os := get_next_os_number(NEW.org_id);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplicar trigger
DROP TRIGGER IF EXISTS trigger_set_os_number ON ordens_de_servico;
CREATE TRIGGER trigger_set_os_number
  BEFORE INSERT ON ordens_de_servico
  FOR EACH ROW
  EXECUTE FUNCTION set_os_number();

-- Atualizar OS existentes com numeração
DO $$
DECLARE
  os_record RECORD;
  current_number integer := 1;
BEGIN
  -- Atualizar OS existentes ordenadas por data de criação
  FOR os_record IN 
    SELECT id, org_id, criado_em
    FROM ordens_de_servico 
    WHERE numero_os IS NULL
    ORDER BY COALESCE(org_id::text, ''), criado_em ASC
  LOOP
    -- Resetar contador para cada organização
    IF os_record.org_id IS DISTINCT FROM (
      SELECT org_id FROM ordens_de_servico 
      WHERE id = os_record.id - 1
    ) THEN
      current_number := 1;
    END IF;
    
    UPDATE ordens_de_servico 
    SET numero_os = get_next_os_number(os_record.org_id)
    WHERE id = os_record.id;
  END LOOP;
END $$;

-- Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_os_numero_org 
ON ordens_de_servico(org_id, numero_os);

CREATE INDEX IF NOT EXISTS idx_os_numero 
ON ordens_de_servico(numero_os);

-- Adicionar constraint de unicidade por organização
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'unique_numero_os_per_org'
  ) THEN
    ALTER TABLE ordens_de_servico 
    ADD CONSTRAINT unique_numero_os_per_org 
    UNIQUE (org_id, numero_os);
  END IF;
END $$;