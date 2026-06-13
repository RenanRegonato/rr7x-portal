-- ============================================================
-- Regenerações — atomicidade do contador + anti-reuso (2026-06-12)
-- ============================================================
-- 1) Incremento atômico de analises.regeneracoes_count (evita lost-update
--    quando duas regenerações distintas confirmam quase ao mesmo tempo).
-- 2) Coluna aplicada_em em regeneracoes: marca quando o briefing já foi
--    efetivamente aplicado por um /step, para impedir reaplicar o mesmo
--    briefing (pago) em chamadas repetidas.
-- ============================================================

CREATE OR REPLACE FUNCTION public.increment_regeneracoes_count(p_analise_id uuid)
RETURNS int
LANGUAGE sql AS $$
  UPDATE public.analises
     SET regeneracoes_count = COALESCE(regeneracoes_count, 0) + 1,
         atualizado_em = now()
   WHERE id = p_analise_id
  RETURNING regeneracoes_count;
$$;

ALTER TABLE public.regeneracoes
  ADD COLUMN IF NOT EXISTS aplicada_em timestamptz;
