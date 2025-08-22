/*
  # Corrigir sistema de numeração automática para OS

  1. Correções na Trigger
    - Remove trigger anterior se existir
    - Cria função melhorada para numeração sequencial
    - Garante numeração única por organização
    
  2. Atualização de Dados
    - Atualiza OS existentes com numeração sequencial
    - Mantém ordem cronológica de criação
*/

-- Remove trigger e função anteriores se existirem
DROP TRIGGER IF EXISTS set_os_numero_trigger ON ordens_de_servico;
DROP FUNCTION IF EXISTS set_os_numero();

-- Cria função para definir número da OS
CREATE OR REPLACE FUNCTION set_os_numero()
RETURNS TRIGGER AS $$
DECLARE
  next_numero INTEGER;
BEGIN
  -- Busca o próximo número disponível para a organização
  SELECT COALESCE(MAX(numero_os), 0) + 1
  INTO next_numero
  FROM ordens_de_servico
  WHERE org_id = NEW.org_id OR (org_id IS NULL AND NEW.org_id IS NULL);
  
  -- Define o número da OS
  NEW.numero_os = next_numero;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Cria trigger para executar antes de inserir nova OS
CREATE TRIGGER set_os_numero_trigger
  BEFORE INSERT ON ordens_de_servico
  FOR EACH ROW
  EXECUTE FUNCTION set_os_numero();

-- Atualiza OS existentes que não têm número
DO $$
DECLARE
  os_record RECORD;
  current_numero INTEGER;
BEGIN
  -- Para cada organização (incluindo NULL)
  FOR os_record IN 
    SELECT DISTINCT COALESCE(org_id, '00000000-0000-0000-0000-000000000000'::uuid) as org_group
    FROM ordens_de_servico 
    WHERE numero_os IS NULL
  LOOP
    current_numero := 1;
    
    -- Atualiza OS desta organização em ordem cronológica
    UPDATE ordens_de_servico 
    SET numero_os = current_numero + (
      SELECT COUNT(*) 
      FROM ordens_de_servico os2 
      WHERE (os2.org_id = CASE WHEN os_record.org_group = '00000000-0000-0000-0000-000000000000'::uuid THEN NULL ELSE os_record.org_group END
             OR (os2.org_id IS NULL AND os_record.org_group = '00000000-0000-0000-0000-000000000000'::uuid))
        AND os2.criado_em < ordens_de_servico.criado_em
        AND os2.numero_os IS NOT NULL
    )
    WHERE (org_id = CASE WHEN os_record.org_group = '00000000-0000-0000-0000-000000000000'::uuid THEN NULL ELSE os_record.org_group END
           OR (org_id IS NULL AND os_record.org_group = '00000000-0000-0000-0000-000000000000'::uuid))
      AND numero_os IS NULL;
  END LOOP;
END $$;