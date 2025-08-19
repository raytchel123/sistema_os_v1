/*
  # Seeds para OS Conteúdo

  Dados de teste para popular o banco com:
  - 6 usuários (um por papel)
  - 6 ordens de serviço em diferentes estágios
  - Checklist itens para cada OS
  - Assets de exemplo
  - Logs de eventos
*/

-- Inserir usuários (um por papel)
INSERT INTO users (id, nome, email, papel, senha_hash) VALUES
  ('550e8400-e29b-41d4-a716-446655440001', 'Ana Silva', 'ana.copy@osconteudo.com', 'COPY', '$2b$10$example_hash_copy'),
  ('550e8400-e29b-41d4-a716-446655440002', 'Bruno Santos', 'bruno.audio@osconteudo.com', 'AUDIO', '$2b$10$example_hash_audio'),
  ('550e8400-e29b-41d4-a716-446655440003', 'Carlos Oliveira', 'carlos.video@osconteudo.com', 'VIDEO', '$2b$10$example_hash_video'),
  ('550e8400-e29b-41d4-a716-446655440004', 'Diana Costa', 'diana.editor@osconteudo.com', 'EDITOR', '$2b$10$example_hash_editor'),
  ('550e8400-e29b-41d4-a716-446655440005', 'Eduardo Lima', 'eduardo.revisor@osconteudo.com', 'REVISOR', '$2b$10$example_hash_revisor'),
  ('550e8400-e29b-41d4-a716-446655440006', 'Crispim', 'crispim@osconteudo.com', 'CRISPIM', '$2b$10$example_hash_crispim');

-- Inserir ordens de serviço
INSERT INTO ordens_de_servico (id, titulo, marca, objetivo, tipo, status, data_publicacao_prevista, canais, responsavel_atual, prioridade, gancho, cta) VALUES
  ('660e8400-e29b-41d4-a716-446655440001', 'Como Escolher o Skincare Perfeito', 'RAYTCHEL', 'NUTRICAO', 'EDUCATIVO', 'ROTEIRO', '2024-02-15 10:00:00+00', '{"INSTAGRAM_REELS", "YT_SHORTS"}', '550e8400-e29b-41d4-a716-446655440001', 'HIGH', 'Você está cometendo esses erros no seu skincare?', 'Acesse o link na bio para descobrir seu tipo de pele'),
  
  ('660e8400-e29b-41d4-a716-446655440002', 'História de Transformação - Cliente Maria', 'ZAFFIRA', 'CONVERSAO', 'HISTORIA', 'AUDIO', '2024-02-16 14:00:00+00', '{"INSTAGRAM_FEED", "YT_LONG"}', '550e8400-e29b-41d4-a716-446655440002', 'MEDIUM', 'Ela perdeu 15kg em 3 meses - veja como', 'Agende sua consulta gratuita'),
  
  ('660e8400-e29b-41d4-a716-446655440003', 'Dicas de Maquiagem para Iniciantes', 'ZAFF', 'ATRACAO', 'EDUCATIVO', 'CAPTACAO', '2024-02-17 16:00:00+00', '{"INSTAGRAM_REELS", "TIKTOK"}', '550e8400-e29b-41d4-a716-446655440003', 'MEDIUM', '5 erros que toda iniciante comete na maquiagem', 'Salve este post para não esquecer'),
  
  ('660e8400-e29b-41d4-a716-446655440004', 'Receita Fit: Brownie de Batata Doce', 'CRISPIM', 'NUTRICAO', 'EDUCATIVO', 'EDICAO', '2024-02-18 12:00:00+00', '{"INSTAGRAM_REELS", "YT_SHORTS"}', '550e8400-e29b-41d4-a716-446655440004', 'LOW', 'Brownie fit que não parece fit - receita secreta', 'Baixe o e-book com 50 receitas fit'),
  
  ('660e8400-e29b-41d4-a716-446655440005', 'Tour pela Fazenda Orgânica', 'FAZENDA', 'ATRACAO', 'EDUCATIVO', 'REVISAO', '2024-02-19 08:00:00+00', '{"INSTAGRAM_FEED", "YT_LONG"}', '550e8400-e29b-41d4-a716-446655440005', 'HIGH', 'Você sabe de onde vem sua comida?', 'Visite nossa loja online'),
  
  ('660e8400-e29b-41d4-a716-446655440006', 'Webinar: Estratégias de Vendas 2024', 'CRISPIM', 'CONVERSAO', 'CONVERSAO', 'APROVACAO', '2024-02-20 19:00:00+00', '{"YT_LIVE", "INSTAGRAM_LIVE"}', '550e8400-e29b-41d4-a716-446655440006', 'HIGH', 'As 3 estratégias que triplicaram minhas vendas', 'Inscreva-se gratuitamente no webinar');

-- Inserir checklist itens
INSERT INTO checklist_itens (os_id, nome, etapa, feito, obrigatorio) VALUES
  -- OS 1 (ROTEIRO)
  ('660e8400-e29b-41d4-a716-446655440001', 'Pesquisar referências', 'ROTEIRO', true, true),
  ('660e8400-e29b-41d4-a716-446655440001', 'Escrever roteiro', 'ROTEIRO', false, true),
  ('660e8400-e29b-41d4-a716-446655440001', 'Revisar roteiro', 'ROTEIRO', false, true),
  
  -- OS 2 (AUDIO)
  ('660e8400-e29b-41d4-a716-446655440002', 'Gravar áudio', 'AUDIO', true, true),
  ('660e8400-e29b-41d4-a716-446655440002', 'Editar áudio', 'AUDIO', false, true),
  ('660e8400-e29b-41d4-a716-446655440002', 'Aprovar áudio', 'AUDIO', false, false),
  
  -- OS 3 (CAPTACAO)
  ('660e8400-e29b-41d4-a716-446655440003', 'Preparar equipamentos', 'CAPTACAO', true, true),
  ('660e8400-e29b-41d4-a716-446655440003', 'Gravar vídeo', 'CAPTACAO', true, true),
  ('660e8400-e29b-41d4-a716-446655440003', 'Backup dos arquivos', 'CAPTACAO', false, true),
  
  -- OS 4 (EDICAO)
  ('660e8400-e29b-41d4-a716-446655440004', 'Cortar vídeo', 'EDICAO', true, true),
  ('660e8400-e29b-41d4-a716-446655440004', 'Adicionar efeitos', 'EDICAO', false, false),
  ('660e8400-e29b-41d4-a716-446655440004', 'Criar thumbnail', 'EDICAO', false, true),
  
  -- OS 5 (REVISAO)
  ('660e8400-e29b-41d4-a716-446655440005', 'Revisar conteúdo', 'REVISAO', true, true),
  ('660e8400-e29b-41d4-a716-446655440005', 'Verificar qualidade', 'REVISAO', false, true),
  
  -- OS 6 (APROVACAO)
  ('660e8400-e29b-41d4-a716-446655440006', 'Aprovação final', 'APROVACAO', false, true),
  ('660e8400-e29b-41d4-a716-446655440006', 'Preparar para agendamento', 'APROVACAO', false, true);

-- Inserir assets
INSERT INTO assets (os_id, tipo, url, versao) VALUES
  -- OS 1
  ('660e8400-e29b-41d4-a716-446655440001', 'ROTEIRO', 'https://example.com/roteiro-skincare-v1.pdf', 1),
  ('660e8400-e29b-41d4-a716-446655440001', 'ROTEIRO', 'https://example.com/roteiro-skincare-v2.pdf', 2),
  
  -- OS 2
  ('660e8400-e29b-41d4-a716-446655440002', 'ROTEIRO', 'https://example.com/roteiro-historia-maria.pdf', 1),
  ('660e8400-e29b-41d4-a716-446655440002', 'AUDIO', 'https://example.com/audio-historia-maria.mp3', 1),
  
  -- OS 3
  ('660e8400-e29b-41d4-a716-446655440003', 'ROTEIRO', 'https://example.com/roteiro-maquiagem.pdf', 1),
  ('660e8400-e29b-41d4-a716-446655440003', 'VIDEO_BRUTO', 'https://example.com/video-maquiagem-bruto.mp4', 1),
  
  -- OS 4
  ('660e8400-e29b-41d4-a716-446655440004', 'VIDEO_BRUTO', 'https://example.com/video-brownie-bruto.mp4', 1),
  ('660e8400-e29b-41d4-a716-446655440004', 'EDIT_V1', 'https://example.com/video-brownie-edit-v1.mp4', 1),
  
  -- OS 5
  ('660e8400-e29b-41d4-a716-446655440005', 'EDIT_V1', 'https://example.com/video-fazenda-edit.mp4', 1),
  ('660e8400-e29b-41d4-a716-446655440005', 'THUMB', 'https://example.com/thumb-fazenda.jpg', 1),
  
  -- OS 6
  ('660e8400-e29b-41d4-a716-446655440006', 'EDIT_V1', 'https://example.com/webinar-edit.mp4', 1),
  ('660e8400-e29b-41d4-a716-446655440006', 'ARTE', 'https://example.com/arte-webinar.jpg', 1);

-- Inserir logs de evento
INSERT INTO logs_evento (os_id, user_id, acao, detalhe) VALUES
  -- OS 1
  ('660e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440001', 'CRIAR', 'OS criada para skincare educativo'),
  ('660e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440001', 'ANEXAR_ASSET', 'Roteiro v1 anexado'),
  
  -- OS 2
  ('660e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440002', 'CRIAR', 'OS criada para história de transformação'),
  ('660e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440002', 'MUDAR_STATUS', 'Status alterado para AUDIO'),
  
  -- OS 3
  ('660e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440003', 'CRIAR', 'OS criada para dicas de maquiagem'),
  ('660e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440003', 'MUDAR_STATUS', 'Status alterado para CAPTACAO'),
  
  -- OS 4
  ('660e8400-e29b-41d4-a716-446655440004', '550e8400-e29b-41d4-a716-446655440004', 'CRIAR', 'OS criada para receita fit'),
  ('660e8400-e29b-41d4-a716-446655440004', '550e8400-e29b-41d4-a716-446655440004', 'MUDAR_STATUS', 'Status alterado para EDICAO'),
  
  -- OS 5
  ('660e8400-e29b-41d4-a716-446655440005', '550e8400-e29b-41d4-a716-446655440005', 'CRIAR', 'OS criada para tour da fazenda'),
  ('660e8400-e29b-41d4-a716-446655440005', '550e8400-e29b-41d4-a716-446655440005', 'MUDAR_STATUS', 'Status alterado para REVISAO'),
  
  -- OS 6
  ('660e8400-e29b-41d4-a716-446655440006', '550e8400-e29b-41d4-a716-446655440006', 'CRIAR', 'OS criada para webinar de vendas'),
  ('660e8400-e29b-41d4-a716-446655440006', '550e8400-e29b-41d4-a716-446655440006', 'MUDAR_STATUS', 'Status alterado para APROVACAO');