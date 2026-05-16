-- ============================================
-- Regenerações de Steps (Mandor) — 2026-05-15
-- Cada regeneração captura: briefing do assessor, decisão da IA Revisora,
-- e (após confirmação do assessor) marca executada + snapshot do output.
-- ============================================

CREATE TABLE IF NOT EXISTS public.regeneracoes (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  analise_id      uuid        REFERENCES public.analises(id) ON DELETE CASCADE NOT NULL,
  step_key        text        NOT NULL,
  briefing_o_que  text        NOT NULL,
  briefing_motivo text        NOT NULL,
  ia_decisao      text        NOT NULL CHECK (ia_decisao IN ('aprovou', 'contra_argumentou')),
  ia_argumento    text        NOT NULL,
  ia_riscos       jsonb,
  output_anterior text,
  executada       boolean     NOT NULL DEFAULT false,
  executada_em    timestamptz,
  solicitada_por  uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  criado_em       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_regeneracoes_analise
  ON public.regeneracoes (analise_id, criado_em DESC);

-- Counter desnormalizado para checagem rápida do limite de 3 (Fase 4)
-- Incrementado quando uma regeneração é efetivamente executada.
ALTER TABLE public.analises
  ADD COLUMN IF NOT EXISTS regeneracoes_count integer NOT NULL DEFAULT 0;

ALTER TABLE public.regeneracoes ENABLE ROW LEVEL SECURITY;

-- Owner da análise e membros do deal podem ler
CREATE POLICY "regeneracoes_read_owner" ON public.regeneracoes
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.analises WHERE id = analise_id AND user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.deal_members WHERE analise_id = regeneracoes.analise_id AND user_id = auth.uid())
  );

-- Service role tem acesso total (escritas via API server-side)
CREATE POLICY "regeneracoes_service" ON public.regeneracoes
  FOR ALL TO service_role USING (true);
