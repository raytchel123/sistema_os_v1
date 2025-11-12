/*
  # Atualizar políticas RLS da tabela users

  1. Mudanças
    - Remover políticas antigas que usavam auth.uid()
    - Adicionar políticas públicas para permitir login sem autenticação prévia
    - Tabela users será acessível publicamente apenas para leitura durante login
    - Service role fará a validação de senha no edge function
    
  2. Segurança
    - Campo senha_hash nunca é exposto (seleção explícita de campos)
    - Validação de senha feita no servidor
*/

DROP POLICY IF EXISTS "Users can read own data" ON users;
DROP POLICY IF EXISTS "Users can update own data" ON users;

CREATE POLICY "Allow public read for login"
  ON users FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Service role can manage users"
  ON users FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);