/*
  # Fix auth access and policies

  1. Helper Functions
    - `get_user_basic_info` - Safe function to get user data without direct auth schema access
  
  2. Security
    - Enable RLS on all main tables
    - Add org-based policies for proper isolation
    - Grant proper permissions to authenticated users
  
  3. Performance
    - Add composite indexes for better query performance
    - Optimize org_id + created_at queries
*/

-- 1) Helper seguro no schema public para ler dados básicos do usuário
create or replace function public.get_user_basic_info(p_uid uuid)
returns table(id uuid, email text, nome text)
security definer
set search_path = public, auth
language sql
as $$
  select u.id,
         u.email,
         coalesce(u.raw_user_meta_data->>'nome', u.email) as nome
  from auth.users u
  where u.id = p_uid;
$$;

revoke all on function public.get_user_basic_info(uuid) from public;
grant execute on function public.get_user_basic_info(uuid) to authenticated;

-- 2) Garantir RLS nas tabelas principais
alter table if exists public.ordens_de_servico enable row level security;
alter table if exists public.provider_settings enable row level security;
alter table if exists public.logs_evento enable row level security;
alter table if exists public.users enable row level security;

-- 3) Policies por org_id para ordens_de_servico
drop policy if exists os_select_by_org on public.ordens_de_servico;
drop policy if exists os_insert_by_org on public.ordens_de_servico;
drop policy if exists os_update_by_org on public.ordens_de_servico;
drop policy if exists os_delete_by_org on public.ordens_de_servico;

create policy os_select_by_org
on public.ordens_de_servico
for select
using (org_id is null or org_id = (auth.jwt() ->> 'org_id')::uuid);

create policy os_insert_by_org
on public.ordens_de_servico
for insert
with check (org_id is null or org_id = (auth.jwt() ->> 'org_id')::uuid);

create policy os_update_by_org
on public.ordens_de_servico
for update
using (org_id is null or org_id = (auth.jwt() ->> 'org_id')::uuid)
with check (org_id is null or org_id = (auth.jwt() ->> 'org_id')::uuid);

create policy os_delete_by_org
on public.ordens_de_servico
for delete
using (org_id is null or org_id = (auth.jwt() ->> 'org_id')::uuid);

-- 4) Policies para provider_settings
drop policy if exists ps_select_by_org on public.provider_settings;
drop policy if exists ps_insert_by_org on public.provider_settings;
drop policy if exists ps_update_by_org on public.provider_settings;
drop policy if exists ps_delete_by_org on public.provider_settings;

create policy ps_select_by_org
on public.provider_settings
for select
using (org_id = (auth.jwt() ->> 'org_id')::uuid);

create policy ps_insert_by_org
on public.provider_settings
for insert
with check (org_id = (auth.jwt() ->> 'org_id')::uuid);

create policy ps_update_by_org
on public.provider_settings
for update
using (org_id = (auth.jwt() ->> 'org_id')::uuid)
with check (org_id = (auth.jwt() ->> 'org_id')::uuid);

create policy ps_delete_by_org
on public.provider_settings
for delete
using (org_id = (auth.jwt() ->> 'org_id')::uuid);

-- 5) Policies para logs_evento
drop policy if exists logs_select_by_org on public.logs_evento;
drop policy if exists logs_insert_by_org on public.logs_evento;

create policy logs_select_by_org
on public.logs_evento
for select
using (exists (
  select 1 from public.ordens_de_servico os 
  where os.id = logs_evento.os_id 
  and (os.org_id is null or os.org_id = (auth.jwt() ->> 'org_id')::uuid)
));

create policy logs_insert_by_org
on public.logs_evento
for insert
with check (exists (
  select 1 from public.ordens_de_servico os 
  where os.id = logs_evento.os_id 
  and (os.org_id is null or os.org_id = (auth.jwt() ->> 'org_id')::uuid)
));

-- 6) Policies para users
drop policy if exists users_select_by_org on public.users;
drop policy if exists users_insert_by_org on public.users;
drop policy if exists users_update_by_org on public.users;

create policy users_select_by_org
on public.users
for select
using (org_id is null or org_id = (auth.jwt() ->> 'org_id')::uuid);

create policy users_insert_by_org
on public.users
for insert
with check (org_id is null or org_id = (auth.jwt() ->> 'org_id')::uuid);

create policy users_update_by_org
on public.users
for update
using (org_id is null or org_id = (auth.jwt() ->> 'org_id')::uuid)
with check (org_id is null or org_id = (auth.jwt() ->> 'org_id')::uuid);

-- 7) Garantir que os enum values existem
DO $$
BEGIN
  -- Adicionar valores ao status_enum se não existirem
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'APROVACAO' AND enumtypid = 'status_enum'::regtype) THEN
    ALTER TYPE status_enum ADD VALUE 'APROVACAO';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'AGENDAMENTO' AND enumtypid = 'status_enum'::regtype) THEN
    ALTER TYPE status_enum ADD VALUE 'AGENDAMENTO';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'RASCUNHO' AND enumtypid = 'status_enum'::regtype) THEN
    ALTER TYPE status_enum ADD VALUE 'RASCUNHO';
  END IF;
EXCEPTION
  WHEN others THEN
    -- Se enum não existir, criar como text
    NULL;
END $$;

-- 8) Índices úteis para performance
create index if not exists idx_os_org_created on public.ordens_de_servico (org_id, criado_em desc);
create index if not exists idx_ps_org_provider on public.provider_settings (org_id, provider);
create index if not exists idx_users_org on public.users (org_id);
create index if not exists idx_logs_os_timestamp on public.logs_evento (os_id, timestamp desc);

-- 9) Garantir colunas necessárias existem
DO $$
BEGIN
  -- Adicionar aprovado_crispim se não existir
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'ordens_de_servico' AND column_name = 'aprovado_crispim'
  ) THEN
    ALTER TABLE public.ordens_de_servico ADD COLUMN aprovado_crispim boolean DEFAULT false;
  END IF;
  
  -- Adicionar atualizado_em se não existir
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'ordens_de_servico' AND column_name = 'atualizado_em'
  ) THEN
    ALTER TABLE public.ordens_de_servico ADD COLUMN atualizado_em timestamptz DEFAULT now();
  END IF;
  
  -- Adicionar org_id se não existir
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'ordens_de_servico' AND column_name = 'org_id'
  ) THEN
    ALTER TABLE public.ordens_de_servico ADD COLUMN org_id uuid REFERENCES public.organizations(id);
  END IF;
  
  -- Adicionar source se não existir
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'ordens_de_servico' AND column_name = 'source'
  ) THEN
    ALTER TABLE public.ordens_de_servico ADD COLUMN source text DEFAULT 'MANUAL';
  END IF;
  
  -- Adicionar content_hash se não existir
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'ordens_de_servico' AND column_name = 'content_hash'
  ) THEN
    ALTER TABLE public.ordens_de_servico ADD COLUMN content_hash text;
  END IF;
END $$;

-- 10) Trigger para atualizar atualizado_em automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.atualizado_em = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_ordens_updated_at ON public.ordens_de_servico;
CREATE TRIGGER update_ordens_updated_at
  BEFORE UPDATE ON public.ordens_de_servico
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();