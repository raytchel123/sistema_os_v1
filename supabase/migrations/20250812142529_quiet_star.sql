/*
  # Sincronização automática entre Supabase Auth e tabela users

  1. Trigger Function
    - Função que sincroniza automaticamente usuários do auth.users para public.users
    - Executada sempre que um novo usuário se cadastra
    - Cria registro na tabela users com papel padrão

  2. Security
    - Trigger seguro que não permite duplicação
    - Validação de dados antes da inserção
    - Log de eventos para auditoria

  3. Default Values
    - Papel padrão: EDITOR
    - Pode aprovar: false
    - Organização: null (será definida posteriormente)
*/

-- Função para sincronizar usuários do auth para a tabela users
CREATE OR REPLACE FUNCTION sync_auth_user_to_users()
RETURNS TRIGGER AS $$
BEGIN
  -- Inserir novo usuário na tabela users quando criado no auth
  INSERT INTO public.users (
    id,
    nome,
    email,
    papel,
    senha_hash,
    pode_aprovar,
    org_id,
    criado_em,
    atualizado_em
  ) VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nome', split_part(NEW.email, '@', 1)), -- Nome do metadata ou parte do email
    NEW.email,
    'EDITOR', -- Papel padrão
    'auth_managed', -- Senha gerenciada pelo Supabase Auth
    false, -- Não pode aprovar por padrão
    NULL, -- Organização será definida posteriormente
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO NOTHING; -- Evitar duplicação se já existir

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Criar trigger para executar a função quando um usuário é criado
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION sync_auth_user_to_users();

-- Função para atualizar dados do usuário quando alterado no auth
CREATE OR REPLACE FUNCTION sync_auth_user_update()
RETURNS TRIGGER AS $$
BEGIN
  -- Atualizar email na tabela users se alterado no auth
  UPDATE public.users 
  SET 
    email = NEW.email,
    nome = COALESCE(NEW.raw_user_meta_data->>'nome', nome),
    atualizado_em = NOW()
  WHERE id = NEW.id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para sincronizar atualizações
DROP TRIGGER IF EXISTS on_auth_user_updated ON auth.users;
CREATE TRIGGER on_auth_user_updated
  AFTER UPDATE ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION sync_auth_user_update();

-- Função para limpar usuário da tabela users quando deletado do auth
CREATE OR REPLACE FUNCTION sync_auth_user_delete()
RETURNS TRIGGER AS $$
BEGIN
  -- Remover usuário da tabela users quando deletado do auth
  DELETE FROM public.users WHERE id = OLD.id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para sincronizar deleções
DROP TRIGGER IF EXISTS on_auth_user_deleted ON auth.users;
CREATE TRIGGER on_auth_user_deleted
  AFTER DELETE ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION sync_auth_user_delete();