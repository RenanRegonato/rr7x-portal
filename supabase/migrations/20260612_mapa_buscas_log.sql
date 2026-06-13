-- ============================================================
-- Mapa Inteligente do Mercado — Log de buscas IA (2026-06-12)
-- ============================================================
-- Registra cada busca semântica (IA) para aplicar o limite mensal
-- mapa_buscas_ia_mes por escritório. Uma linha por busca IA executada.
-- A contagem do "mês" usa o fuso America/Sao_Paulo (reset no dia 1 local).
-- ============================================================
CREATE TABLE IF NOT EXISTS public.mapa_buscas_log (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  escritorio_id uuid REFERENCES public.escritorios(id) ON DELETE CASCADE,
  user_id       uuid,
  q             text,
  resultados    int,
  criado_em     timestamptz NOT NULL DEFAULT now()
);

-- Índice para a contagem mensal por escritório (janela por criado_em).
CREATE INDEX IF NOT EXISTS idx_mapa_buscas_log_esc_data
  ON public.mapa_buscas_log (escritorio_id, criado_em DESC);

-- ============================================================
-- RPC: mercado_buscas_ia_mes_count — buscas IA do escritório no mês corrente
-- (fronteira do mês no fuso America/Sao_Paulo).
-- ============================================================
CREATE OR REPLACE FUNCTION public.mercado_buscas_ia_mes_count(p_escritorio_id uuid)
RETURNS int
LANGUAGE sql STABLE AS $$
  SELECT count(*)::int
  FROM public.mapa_buscas_log
  WHERE escritorio_id = p_escritorio_id
    AND criado_em >= (date_trunc('month', now() AT TIME ZONE 'America/Sao_Paulo')
                      AT TIME ZONE 'America/Sao_Paulo');
$$;
