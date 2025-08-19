/*
  # Criar dados de exemplo para teste

  1. Dados de exemplo
    - Usuários com diferentes papéis
    - Ordens de serviço em diferentes status
    - Checklist e assets de exemplo

  2. Distribuição
    - 1-2 OS em cada status para visualização no Kanban
    - Diferentes prioridades e marcas
    - Alguns com SLA vencido para teste do monitor
*/

-- Inserir usuários de exemplo (se não existirem)
INSERT INTO users (nome, email, papel, senha_hash) VALUES
  ('João Copy', 'joao@copy.com', 'COPY', '$2a$10$dummy.hash.for.testing'),
  ('Maria Audio', 'maria@audio.com', 'AUDIO', '$2a$10$dummy.hash.for.testing'),
  ('Pedro Video', 'pedro@video.com', 'VIDEO', '$2a$10$dummy.hash.for.testing'),
  ('Ana Editor', 'ana@editor.com', 'EDITOR', '$2a$10$dummy.hash.for.testing'),
  ('Carlos Revisor', 'carlos@revisor.com', 'REVISOR', '$2a$10$dummy.hash.for.testing'),
  ('Crispim Boss', 'crispim@boss.com', 'CRISPIM', '$2a$10$dummy.hash.for.testing'),
  ('Sofia Social', 'sofia@social.com', 'SOCIAL', '$2a$10$dummy.hash.for.testing')
ON CONFLICT (email) DO NOTHING;

-- Inserir ordens de serviço de exemplo
INSERT INTO ordens_de_servico (
  titulo, marca, objetivo, tipo, status, prioridade, 
  responsavel_atual, sla_atual, gancho, cta,
  data_publicacao_prevista
) VALUES
  -- ROTEIRO
  (
    'Como fazer café perfeito', 'RAYTCHEL', 'ATRACAO', 'EDUCATIVO', 'ROTEIRO', 'MEDIUM',
    (SELECT id FROM users WHERE papel = 'COPY' LIMIT 1),
    NOW() + INTERVAL '20 hours',
    'Você está fazendo café errado há anos!',
    'Baixe nosso guia completo',
    NOW() + INTERVAL '3 days'
  ),
  -- AUDIO
  (
    'Top 5 erros na cozinha', 'ZAFFIRA', 'NUTRICAO', 'EDUCATIVO', 'AUDIO', 'HIGH',
    (SELECT id FROM users WHERE papel = 'AUDIO' LIMIT 1),
    NOW() - INTERVAL '2 hours', -- SLA vencido para teste
    'Estes erros estão sabotando suas receitas',
    'Acesse o curso completo',
    NOW() + INTERVAL '2 days'
  ),
  -- CAPTACAO
  (
    'Receita de bolo de chocolate', 'ZAFF', 'CONVERSAO', 'HISTORIA', 'CAPTACAO', 'MEDIUM',
    (SELECT id FROM users WHERE papel = 'VIDEO' LIMIT 1),
    NOW() + INTERVAL '18 hours',
    'A receita secreta da vovó',
    'Compre os ingredientes especiais',
    NOW() + INTERVAL '5 days'
  ),
  -- EDICAO
  (
    'Dicas de organização da cozinha', 'CRISPIM', 'ATRACAO', 'EDUCATIVO', 'EDICAO', 'LOW',
    (SELECT id FROM users WHERE papel = 'EDITOR' LIMIT 1),
    NOW() + INTERVAL '30 hours',
    'Transforme sua cozinha em 30 minutos',
    'Baixe o checklist gratuito',
    NOW() + INTERVAL '4 days'
  ),
  -- REVISAO
  (
    'Meal prep para a semana', 'FAZENDA', 'NUTRICAO', 'EDUCATIVO', 'REVISAO', 'HIGH',
    (SELECT id FROM users WHERE papel = 'REVISOR' LIMIT 1),
    NOW() + INTERVAL '12 hours',
    'Economize 5 horas por semana',
    'Acesse o planner completo',
    NOW() + INTERVAL '1 day'
  ),
  -- APROVACAO
  (
    'História da culinária brasileira', 'RAYTCHEL', 'ATRACAO', 'HISTORIA', 'APROVACAO', 'MEDIUM',
    (SELECT id FROM users WHERE papel = 'CRISPIM' LIMIT 1),
    NOW() + INTERVAL '8 hours',
    'Descubra as origens dos pratos típicos',
    'Compre o livro de receitas',
    NOW() + INTERVAL '6 days'
  ),
  -- AGENDAMENTO
  (
    'Sobremesas fit deliciosas', 'ZAFFIRA', 'CONVERSAO', 'EDUCATIVO', 'AGENDAMENTO', 'HIGH',
    (SELECT id FROM users WHERE papel = 'SOCIAL' LIMIT 1),
    NOW() + INTERVAL '6 hours',
    'Doces sem culpa que realmente funcionam',
    'Acesse todas as receitas',
    NOW() + INTERVAL '12 hours'
  ),
  -- POSTADO
  (
    'Temperos caseiros especiais', 'ZAFF', 'NUTRICAO', 'EDUCATIVO', 'POSTADO', 'MEDIUM',
    NULL,
    NULL,
    'Eleve o sabor dos seus pratos',
    'Compre o kit de temperos',
    NOW() - INTERVAL '1 day'
  )
ON CONFLICT DO NOTHING;

-- Criar checklist de exemplo para OS em ROTEIRO
INSERT INTO checklist_itens (os_id, nome, etapa, feito, obrigatorio)
SELECT 
  os.id,
  item.nome,
  'ROTEIRO',
  item.feito,
  item.obrigatorio
FROM ordens_de_servico os
CROSS JOIN (
  VALUES 
    ('Definir gancho principal', true, true),
    ('Estruturar roteiro completo', true, true),
    ('Revisar ortografia e gramática', false, true),
    ('Validar CTA (Call to Action)', true, false),
    ('Aprovar tom de voz da marca', false, false)
) AS item(nome, feito, obrigatorio)
WHERE os.status = 'ROTEIRO'
ON CONFLICT DO NOTHING;

-- Criar assets de exemplo
INSERT INTO assets (os_id, tipo, url, versao)
SELECT 
  os.id,
  'AUDIO',
  'https://example.com/audio/' || os.id || '.mp3',
  1
FROM ordens_de_servico os
WHERE os.status IN ('AUDIO', 'CAPTACAO', 'EDICAO', 'REVISAO', 'APROVACAO', 'AGENDAMENTO', 'POSTADO')
ON CONFLICT DO NOTHING;

INSERT INTO assets (os_id, tipo, url, versao)
SELECT 
  os.id,
  'VIDEO_BRUTO',
  'https://example.com/video/' || os.id || '.mp4',
  1
FROM ordens_de_servico os
WHERE os.status IN ('CAPTACAO', 'EDICAO', 'REVISAO', 'APROVACAO', 'AGENDAMENTO', 'POSTADO')
ON CONFLICT DO NOTHING;

-- Criar logs de exemplo
INSERT INTO logs_evento (os_id, user_id, acao, detalhe)
SELECT 
  os.id,
  (SELECT id FROM users WHERE papel = 'COPY' LIMIT 1),
  'CRIAR',
  'OS criada: ' || os.titulo
FROM ordens_de_servico os
ON CONFLICT DO NOTHING;