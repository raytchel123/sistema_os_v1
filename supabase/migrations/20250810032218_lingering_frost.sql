/*
  # Estrutura SaaS Completa - OS Inteligente

  1. Novas Tabelas
    - `organizations` - Multi-tenant
    - `voice_profiles` - Perfis de voz (HeyGen/ElevenLabs)
    - `avatar_profiles` - Avatares HeyGen
    - `creative_templates` - Templates por plataforma
    - `distribution_links` - Links de publicação
    - `provider_settings` - Configurações de API por org

  2. Campos Adicionais em OS
    - Roteiro e voz
    - Templates e saídas
    - Links de mídia e finais
    - URLs de publicação

  3. Multi-tenant
    - org_id em todas as tabelas
    - Preparação para RLS
*/

-- Organizações (Multi-tenant)
CREATE TABLE IF NOT EXISTS organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  plan text CHECK (plan IN ('FREE','PRO','ENTERPRISE')) DEFAULT 'FREE',
  quota_os_monthly integer DEFAULT 10,
  quota_ai_requests_monthly integer DEFAULT 100,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Configurações de Providers por Organização
CREATE TABLE IF NOT EXISTS provider_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  provider text CHECK (provider IN ('HEYGEN','ELEVENLABS','OPENAI','ANTHROPIC')) NOT NULL,
  api_key text NOT NULL,
  settings jsonb DEFAULT '{}'::jsonb,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  UNIQUE(org_id, provider)
);

-- Perfis de Voz
CREATE TABLE IF NOT EXISTS voice_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  provider text CHECK (provider IN ('HEYGEN','ELEVENLABS','HUMAN')) NOT NULL,
  external_id text,
  default_params jsonb DEFAULT '{
    "speed": 1.0,
    "pitch": 0.0,
    "stability": 0.5,
    "similarity": 0.8
  }'::jsonb,
  brand_tag text,
  preview_url text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Perfis de Avatar
CREATE TABLE IF NOT EXISTS avatar_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  provider text CHECK (provider IN ('HEYGEN')) NOT NULL,
  external_id text,
  style_defaults jsonb DEFAULT '{
    "background": "office",
    "framing": "medium",
    "style": "professional"
  }'::jsonb,
  preview_image_url text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Templates Criativos
CREATE TABLE IF NOT EXISTS creative_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  platform text CHECK (platform IN ('REELS','TIKTOK','SHORTS','STORIES','FEED','YOUTUBE')) NOT NULL,
  aspect_ratio text NOT NULL CHECK (aspect_ratio IN ('9:16','1:1','16:9')),
  text_layers jsonb DEFAULT '[
    {"type": "hook", "position": {"x": 50, "y": 20}, "style": {"fontSize": 24, "color": "#FFFFFF"}},
    {"type": "subtitle", "position": {"x": 50, "y": 80}, "style": {"fontSize": 16, "color": "#FFFFFF"}},
    {"type": "cta", "position": {"x": 50, "y": 90}, "style": {"fontSize": 18, "color": "#FFD700"}}
  ]'::jsonb,
  brand_theme jsonb DEFAULT '{
    "primaryColor": "#007AFF",
    "secondaryColor": "#FFD700",
    "fontFamily": "Inter",
    "logoPosition": "top-right"
  }'::jsonb,
  render_params jsonb DEFAULT '{
    "duration": 30,
    "fps": 30,
    "quality": "high"
  }'::jsonb,
  is_favorite boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Links de Distribuição
CREATE TABLE IF NOT EXISTS distribution_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  os_id uuid NOT NULL REFERENCES ordens_de_servico(id) ON DELETE CASCADE,
  platform text CHECK (platform IN ('INSTAGRAM','TIKTOK','YOUTUBE','FACEBOOK','LINKEDIN')) NOT NULL,
  final_url text,
  scheduled_for timestamptz,
  status text CHECK (status IN ('DRAFT','SCHEDULED','POSTED','FAILED')) DEFAULT 'DRAFT',
  posted_at timestamptz,
  metrics jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  UNIQUE(os_id, platform)
);

-- Adicionar org_id nas tabelas existentes
DO $$
BEGIN
  -- Adicionar org_id se não existir
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'ordens_de_servico' AND column_name = 'org_id'
  ) THEN
    ALTER TABLE ordens_de_servico ADD COLUMN org_id uuid;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'org_id'
  ) THEN
    ALTER TABLE users ADD COLUMN org_id uuid;
  END IF;
END $$;

-- Adicionar novos campos na tabela ordens_de_servico
DO $$
BEGIN
  -- Roteiro e Voz
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ordens_de_servico' AND column_name = 'script_text') THEN
    ALTER TABLE ordens_de_servico ADD COLUMN script_text text;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ordens_de_servico' AND column_name = 'script_version') THEN
    ALTER TABLE ordens_de_servico ADD COLUMN script_version integer DEFAULT 1;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ordens_de_servico' AND column_name = 'script_language') THEN
    ALTER TABLE ordens_de_servico ADD COLUMN script_language text CHECK (script_language IN ('PT_BR','EN','ES')) DEFAULT 'PT_BR';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ordens_de_servico' AND column_name = 'voice_provider') THEN
    ALTER TABLE ordens_de_servico ADD COLUMN voice_provider text CHECK (voice_provider IN ('HEYGEN','ELEVENLABS','HUMAN')) DEFAULT 'HUMAN';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ordens_de_servico' AND column_name = 'voice_profile_id') THEN
    ALTER TABLE ordens_de_servico ADD COLUMN voice_profile_id uuid REFERENCES voice_profiles(id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ordens_de_servico' AND column_name = 'tts_params') THEN
    ALTER TABLE ordens_de_servico ADD COLUMN tts_params jsonb DEFAULT '{}'::jsonb;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ordens_de_servico' AND column_name = 'avatar_id') THEN
    ALTER TABLE ordens_de_servico ADD COLUMN avatar_id uuid REFERENCES avatar_profiles(id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ordens_de_servico' AND column_name = 'heygen_scene') THEN
    ALTER TABLE ordens_de_servico ADD COLUMN heygen_scene jsonb DEFAULT '{}'::jsonb;
  END IF;
  
  -- Templates e Saídas
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ordens_de_servico' AND column_name = 'output_templates') THEN
    ALTER TABLE ordens_de_servico ADD COLUMN output_templates text[] DEFAULT '{}'::text[];
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ordens_de_servico' AND column_name = 'raw_media_links') THEN
    ALTER TABLE ordens_de_servico ADD COLUMN raw_media_links text[] DEFAULT '{}'::text[];
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ordens_de_servico' AND column_name = 'final_media_links') THEN
    ALTER TABLE ordens_de_servico ADD COLUMN final_media_links jsonb[] DEFAULT '{}'::jsonb[];
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ordens_de_servico' AND column_name = 'platform_publish_urls') THEN
    ALTER TABLE ordens_de_servico ADD COLUMN platform_publish_urls jsonb DEFAULT '{}'::jsonb;
  END IF;
  
  -- Campos de IA e análise
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ordens_de_servico' AND column_name = 'ai_analysis') THEN
    ALTER TABLE ordens_de_servico ADD COLUMN ai_analysis jsonb DEFAULT '{}'::jsonb;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ordens_de_servico' AND column_name = 'suggested_cuts') THEN
    ALTER TABLE ordens_de_servico ADD COLUMN suggested_cuts jsonb DEFAULT '[]'::jsonb;
  END IF;
END $$;

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_os_org ON ordens_de_servico(org_id);
CREATE INDEX IF NOT EXISTS idx_os_status ON ordens_de_servico(status);
CREATE INDEX IF NOT EXISTS idx_os_voice_provider ON ordens_de_servico(voice_provider);
CREATE INDEX IF NOT EXISTS idx_voice_profiles_org ON voice_profiles(org_id);
CREATE INDEX IF NOT EXISTS idx_avatar_profiles_org ON avatar_profiles(org_id);
CREATE INDEX IF NOT EXISTS idx_creative_templates_org ON creative_templates(org_id);
CREATE INDEX IF NOT EXISTS idx_distribution_links_os ON distribution_links(os_id);

-- Criar organização padrão para desenvolvimento
INSERT INTO organizations (id, name, plan) 
VALUES ('00000000-0000-0000-0000-000000000001', 'Raytchel Media', 'PRO')
ON CONFLICT DO NOTHING;

-- Atualizar registros existentes com org_id padrão
UPDATE ordens_de_servico SET org_id = '00000000-0000-0000-0000-000000000001' WHERE org_id IS NULL;
UPDATE users SET org_id = '00000000-0000-0000-0000-000000000001' WHERE org_id IS NULL;

-- Perfis de voz padrão
INSERT INTO voice_profiles (org_id, name, provider, external_id, brand_tag, default_params) VALUES
('00000000-0000-0000-0000-000000000001', 'Raytchel Feminina', 'ELEVENLABS', 'voice_001', 'RAYTCHEL', '{"speed": 1.0, "pitch": 0.2, "stability": 0.7, "similarity": 0.8}'),
('00000000-0000-0000-0000-000000000001', 'Crispim Masculina', 'ELEVENLABS', 'voice_002', 'CRISPIM', '{"speed": 0.9, "pitch": -0.1, "stability": 0.8, "similarity": 0.9}'),
('00000000-0000-0000-0000-000000000001', 'Narrador Neutro', 'ELEVENLABS', 'voice_003', 'GERAL', '{"speed": 1.0, "pitch": 0.0, "stability": 0.6, "similarity": 0.7}')
ON CONFLICT DO NOTHING;

-- Avatares padrão
INSERT INTO avatar_profiles (org_id, name, provider, external_id, style_defaults) VALUES
('00000000-0000-0000-0000-000000000001', 'Avatar Feminino Profissional', 'HEYGEN', 'avatar_001', '{"background": "office", "framing": "medium", "style": "professional"}'),
('00000000-0000-0000-0000-000000000001', 'Avatar Masculino Casual', 'HEYGEN', 'avatar_002', '{"background": "studio", "framing": "close", "style": "casual"}')
ON CONFLICT DO NOTHING;

-- Templates padrão
INSERT INTO creative_templates (org_id, name, platform, aspect_ratio, brand_theme, is_favorite) VALUES
('00000000-0000-0000-0000-000000000001', 'Reels Raytchel', 'REELS', '9:16', '{"primaryColor": "#007AFF", "secondaryColor": "#FFD700", "fontFamily": "Inter"}', true),
('00000000-0000-0000-0000-000000000001', 'TikTok Viral', 'TIKTOK', '9:16', '{"primaryColor": "#FF0050", "secondaryColor": "#00F2EA", "fontFamily": "Poppins"}', true),
('00000000-0000-0000-0000-000000000001', 'YouTube Shorts', 'SHORTS', '9:16', '{"primaryColor": "#FF0000", "secondaryColor": "#FFFFFF", "fontFamily": "Roboto"}', false),
('00000000-0000-0000-0000-000000000001', 'Stories Elegante', 'STORIES', '9:16', '{"primaryColor": "#8B5CF6", "secondaryColor": "#F59E0B", "fontFamily": "Inter"}', false),
('00000000-0000-0000-0000-000000000001', 'Feed Quadrado', 'FEED', '1:1', '{"primaryColor": "#059669", "secondaryColor": "#DC2626", "fontFamily": "Inter"}', false),
('00000000-0000-0000-0000-000000000001', 'YouTube Horizontal', 'YOUTUBE', '16:9', '{"primaryColor": "#1F2937", "secondaryColor": "#F97316", "fontFamily": "Inter"}', false)
ON CONFLICT DO NOTHING;

-- Preparação para RLS (comentado para desenvolvimento)
/*
-- Habilitar RLS em todas as tabelas
ALTER TABLE ordens_de_servico ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE voice_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE avatar_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE creative_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE distribution_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE provider_settings ENABLE ROW LEVEL SECURITY;

-- Políticas RLS (usuários só veem dados da própria org)
CREATE POLICY "Users can only see own org data" ON ordens_de_servico
  FOR ALL USING (org_id = (SELECT org_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Users can only see own org profiles" ON voice_profiles
  FOR ALL USING (org_id = (SELECT org_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Users can only see own org avatars" ON avatar_profiles
  FOR ALL USING (org_id = (SELECT org_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Users can only see own org templates" ON creative_templates
  FOR ALL USING (org_id = (SELECT org_id FROM users WHERE id = auth.uid()));
*/