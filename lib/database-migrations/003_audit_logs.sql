-- ============================================================
-- Fase 3 — Auditoria e Monitoramento
-- Rodar no Supabase SQL Editor
-- ============================================================

create table if not exists audit_logs (
  id         uuid        primary key default gen_random_uuid(),
  event      text        not null,
  user_id    uuid        references auth.users(id) on delete set null,
  target_id  text,
  metadata   jsonb,
  ip         text,
  user_agent text,
  created_at timestamptz not null default now()
);

-- Somente o service role acessa
alter table audit_logs enable row level security;
create policy "service role only" on audit_logs
  using (false) with check (false);

-- Índices para consultas eficientes no painel admin
create index if not exists audit_logs_created_at_idx on audit_logs (created_at desc);
create index if not exists audit_logs_user_id_idx    on audit_logs (user_id);
create index if not exists audit_logs_event_idx      on audit_logs (event);
create index if not exists audit_logs_target_id_idx  on audit_logs (target_id);

-- Limpeza automática: remove logs com mais de 90 dias
-- (opcional — ative se quiser controlar o tamanho da tabela)
-- create extension if not exists pg_cron;
-- select cron.schedule('audit-cleanup', '0 3 * * *',
--   $$delete from audit_logs where created_at < now() - interval '90 days'$$
-- );
