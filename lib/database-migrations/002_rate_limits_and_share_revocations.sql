-- ============================================================
-- Fase 2 — Rate Limiting + Share Token Revocation
-- Rodar no Supabase SQL Editor
-- ============================================================

-- ----------------------------------------
-- 1. Tabela de rate limiting
-- ----------------------------------------
create table if not exists rate_limits (
  key          text primary key,
  count        integer      not null default 1,
  window_start timestamptz  not null default now()
);

-- Somente o service role acessa (sem RLS pública)
alter table rate_limits enable row level security;
create policy "service role only" on rate_limits
  using (false) with check (false);

-- ----------------------------------------
-- 2. Função atômica de rate limiting
-- ----------------------------------------
-- Usa FOR UPDATE para evitar race conditions.
-- Retorna: { allowed, remaining, reset_in }
create or replace function upsert_rate_limit(
  p_key            text,
  p_max            integer,
  p_window_seconds integer
) returns jsonb
language plpgsql
security definer
as $$
declare
  v_count        integer;
  v_window_start timestamptz;
  v_now          timestamptz := now();
  v_elapsed      float;
begin
  select count, window_start
    into v_count, v_window_start
    from rate_limits
   where key = p_key
     for update;

  if not found then
    insert into rate_limits (key, count, window_start) values (p_key, 1, v_now);
    return jsonb_build_object('allowed', true, 'remaining', p_max - 1, 'reset_in', p_window_seconds);
  end if;

  v_elapsed := extract(epoch from (v_now - v_window_start));

  -- Janela expirou: reinicia contagem
  if v_elapsed >= p_window_seconds then
    update rate_limits set count = 1, window_start = v_now where key = p_key;
    return jsonb_build_object('allowed', true, 'remaining', p_max - 1, 'reset_in', p_window_seconds);
  end if;

  -- Limite atingido
  if v_count >= p_max then
    return jsonb_build_object(
      'allowed',   false,
      'remaining', 0,
      'reset_in',  ceil(p_window_seconds - v_elapsed)::integer
    );
  end if;

  -- Incrementa e permite
  update rate_limits set count = count + 1 where key = p_key;
  return jsonb_build_object(
    'allowed',   true,
    'remaining', p_max - v_count - 1,
    'reset_in',  ceil(p_window_seconds - v_elapsed)::integer
  );
end;
$$;

-- ----------------------------------------
-- 3. Tabela de revogação de share tokens
-- ----------------------------------------
create table if not exists share_revocations (
  analise_id  uuid primary key references analises(id) on delete cascade,
  revoked_at  timestamptz not null default now()
);

alter table share_revocations enable row level security;
create policy "service role only" on share_revocations
  using (false) with check (false);
