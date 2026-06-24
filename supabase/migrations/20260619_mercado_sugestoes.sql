-- ============================================================
-- Invest Match — Sugestões de Conexão de Mercado
-- ============================================================
-- Diferente de `matches` (relacionamento PRIVADO do escritório, "Match
-- Confirmado"), esta tabela guarda SUGESTÕES derivadas do Mapa do Mercado
-- (dado público redistribuível: CVM/BCB/Receita). NÃO são relacionamentos
-- validados, NÃO há contato confirmado — só aderência da tese a participantes
-- do mercado. A separação em tabela própria é proposital: sugestão nunca se
-- confunde com match por construção.
--
-- Origem do sinal:
--   semantico  → similaridade vetorial entre o embedding da tese e o da entidade
--   estrutural → entidade opera o veículo do mandato (FIDC/FIP) no histórico CVM
--
-- Apenas entidades com redistribuivel=true entram aqui (ANBIMA Feed/Coponto,
-- que são licenciados/uso interno, ficam de fora pela própria origem dos dados).
-- ============================================================

CREATE TABLE IF NOT EXISTS public.mercado_sugestoes (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  tese_id       uuid        NOT NULL REFERENCES public.teses(id)            ON DELETE CASCADE,
  escritorio_id uuid        NOT NULL REFERENCES public.escritorios(id)      ON DELETE CASCADE,
  entidade_id   uuid        NOT NULL REFERENCES public.mercado_entidades(id) ON DELETE CASCADE,

  -- Snapshot p/ render barato e estável (a entidade pode ser re-ETL'da/alterada).
  razao_social  text        NOT NULL,
  nome_fantasia text,
  tipos         text[]      NOT NULL DEFAULT '{}',
  uf            text,

  aderencia     numeric(5,2) NOT NULL,            -- 0-100
  origem_sinal  text[]       NOT NULL DEFAULT '{}', -- semantico | estrutural
  motivo        text,                              -- justificativa curta (regra, sem LLM)

  calculado_em  timestamptz  NOT NULL DEFAULT now(),
  CONSTRAINT mercado_sugestoes_tese_entidade_uk UNIQUE (tese_id, entidade_id),
  CONSTRAINT mercado_sugestoes_aderencia_range  CHECK (aderencia >= 0 AND aderencia <= 100)
);

CREATE INDEX IF NOT EXISTS idx_mercado_sugestoes_tese
  ON public.mercado_sugestoes (tese_id, aderencia DESC);

CREATE INDEX IF NOT EXISTS idx_mercado_sugestoes_escritorio
  ON public.mercado_sugestoes (escritorio_id);

-- ============================================================
-- RLS — mesmo modelo de `matches`/`teses`: membros do escritório leem;
-- service_role (ETL/motor) escreve.
-- ============================================================
ALTER TABLE public.mercado_sugestoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "mercado_sugestoes_read_escritorio_members" ON public.mercado_sugestoes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.perfis
      WHERE perfis.user_id = auth.uid()
        AND perfis.escritorio_id = mercado_sugestoes.escritorio_id
    )
    OR EXISTS (
      SELECT 1 FROM public.escritorios
      WHERE escritorios.id = mercado_sugestoes.escritorio_id
        AND escritorios.user_id = auth.uid()
    )
  );

CREATE POLICY "mercado_sugestoes_service" ON public.mercado_sugestoes
  FOR ALL TO service_role USING (true);
