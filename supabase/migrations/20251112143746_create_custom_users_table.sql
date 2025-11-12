/*
  # Criar tabela customizada de usuários

  1. Nova Tabela
    - `users` (schema public)
      - `id` (uuid, primary key) - ID único do usuário
      - `email` (text, unique, not null) - Email do usuário para login
      - `senha_hash` (text, not null) - Hash da senha (bcrypt)
      - `nome` (text, not null) - Nome completo do usuário
      - `papel` (text, not null, default 'EDITOR') - Papel do usuário (SOCIAL, EDITOR)
      - `created_at` (timestamptz) - Data de criação
      - `updated_at` (timestamptz) - Data de atualização
      
  2. Segurança
    - Habilitar RLS na tabela `users`
    - Política para usuários autenticados lerem seus próprios dados
    - Política para usuários autenticados atualizarem seus próprios dados
    
  3. Índices
    - Índice único no email para performance de login
*/

CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  senha_hash text NOT NULL,
  nome text NOT NULL,
  papel text NOT NULL DEFAULT 'EDITOR',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own data"
  ON users FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own data"
  ON users FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);