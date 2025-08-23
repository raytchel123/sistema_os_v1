/*
  # Adicionar controle de visibilidade de OS para usuários

  1. Nova Coluna
    - `pode_ver_todas_os` (boolean) na tabela `users`
    - Controla se o usuário pode ver todas as OS ou apenas as suas

  2. Configuração
    - Valor padrão: false (usuário vê apenas suas OS)
    - Administradores podem ter acesso total
*/

-- Adicionar nova coluna para controle de visibilidade
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS pode_ver_todas_os boolean DEFAULT false;

-- Comentário explicativo
COMMENT ON COLUMN users.pode_ver_todas_os IS 'Define se o usuário pode visualizar todas as OS ou apenas aquelas em que participa';

-- Criar índice para otimizar consultas
CREATE INDEX IF NOT EXISTS idx_users_pode_ver_todas_os 
ON users(pode_ver_todas_os) 
WHERE pode_ver_todas_os = true;

-- Atualizar usuários existentes que podem aprovar para também poderem ver todas as OS
UPDATE users 
SET pode_ver_todas_os = true 
WHERE pode_aprovar = true;