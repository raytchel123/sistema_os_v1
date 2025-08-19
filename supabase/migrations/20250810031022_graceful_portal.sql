/*
  # Atualizar estrutura da tabela ordens_de_servico

  1. Modificações
    - Adicionar campo descricao (text)
    - Adicionar campo midia_bruta_links (text[])
    - Adicionar campo criativos_prontos_links (text[])
    - Adicionar campo categorias_criativos (text[])
    - Adicionar campo responsaveis (jsonb)
    - Adicionar campo prazo (date)
    - Manter campos existentes para compatibilidade
*/

-- Adicionar novos campos à tabela existente
ALTER TABLE ordens_de_servico 
ADD COLUMN IF NOT EXISTS descricao text,
ADD COLUMN IF NOT EXISTS midia_bruta_links text[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS criativos_prontos_links text[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS categorias_criativos text[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS responsaveis jsonb DEFAULT '{"edicao": "Vini", "arte": "Guto", "revisao": "Crispim"}',
ADD COLUMN IF NOT EXISTS prazo date;

-- Criar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_ordens_prazo ON ordens_de_servico(prazo);
CREATE INDEX IF NOT EXISTS idx_ordens_responsaveis ON ordens_de_servico USING GIN(responsaveis);