-- ============================================================
-- Fase 4 — Auditoria de RLS Policies
-- Execute cada bloco separadamente no Supabase SQL Editor
-- ============================================================

-- ----------------------------------------
-- DIAGNÓSTICO: tabelas sem RLS ativo
-- ----------------------------------------
-- Execute esta query primeiro para ver o estado atual
select
  schemaname,
  tablename,
  rowsecurity as rls_enabled
from pg_tables
where schemaname = 'public'
order by rls_enabled, tablename;

-- ----------------------------------------
-- DIAGNÓSTICO: tabelas com RLS ativo mas sem políticas
-- (ficam totalmente bloqueadas para todos)
-- ----------------------------------------
select t.tablename
from pg_tables t
left join pg_policies p on p.tablename = t.tablename and p.schemaname = t.schemaname
where t.schemaname = 'public'
  and t.rowsecurity = true
  and p.policyname is null;

-- ----------------------------------------
-- DIAGNÓSTICO: listar todas as políticas existentes
-- ----------------------------------------
select
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
from pg_policies
where schemaname = 'public'
order by tablename, policyname;

-- ============================================================
-- CORREÇÕES — execute apenas as que se aplicam ao seu banco
-- ============================================================

-- ----------------------------------------
-- Tabela: analises
-- Usuário vê apenas as próprias análises.
-- Admin (service role) acessa tudo via createAdminClient().
-- ----------------------------------------
alter table analises enable row level security;

drop policy if exists "usuarios veem proprias analises" on analises;
create policy "usuarios veem proprias analises" on analises
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ----------------------------------------
-- Tabela: subscriptions
-- Usuário vê apenas a própria assinatura.
-- ----------------------------------------
alter table subscriptions enable row level security;

drop policy if exists "usuarios veem propria subscription" on subscriptions;
create policy "usuarios veem propria subscription" on subscriptions
  for select
  using (auth.uid() = user_id);

-- ----------------------------------------
-- Tabela: perfis
-- Usuário lê e atualiza apenas o próprio perfil.
-- ----------------------------------------
alter table perfis enable row level security;

drop policy if exists "usuarios gerenciam proprio perfil" on perfis;
create policy "usuarios gerenciam proprio perfil" on perfis
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ----------------------------------------
-- Tabela: escritorios
-- Membros do escritório podem ler. Apenas dono atualiza.
-- ----------------------------------------
alter table escritorios enable row level security;

drop policy if exists "membros leem escritorio" on escritorios;
create policy "membros leem escritorio" on escritorios
  for select
  using (
    id in (
      select escritorio_id from perfis where user_id = auth.uid()
    )
    or user_id = auth.uid()
  );

drop policy if exists "dono atualiza escritorio" on escritorios;
create policy "dono atualiza escritorio" on escritorios
  for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- ----------------------------------------
-- Tabela: webhook_events (criada na Fase 1)
-- Já está bloqueada com RLS — nenhuma mudança necessária.
-- ----------------------------------------

-- ----------------------------------------
-- Tabela: rate_limits (criada na Fase 2)
-- Já está bloqueada com RLS — nenhuma mudança necessária.
-- ----------------------------------------

-- ----------------------------------------
-- Tabela: share_revocations (criada na Fase 2)
-- Já está bloqueada com RLS — nenhuma mudança necessária.
-- ----------------------------------------

-- ----------------------------------------
-- Tabela: audit_logs (criada na Fase 3)
-- Já está bloqueada com RLS — nenhuma mudança necessária.
-- ----------------------------------------

-- ----------------------------------------
-- VERIFICAÇÃO FINAL: confirmar que todas as tabelas têm RLS
-- ----------------------------------------
select
  tablename,
  rowsecurity as rls_enabled,
  (select count(*) from pg_policies p
   where p.tablename = t.tablename and p.schemaname = 'public') as policy_count
from pg_tables t
where schemaname = 'public'
order by tablename;
