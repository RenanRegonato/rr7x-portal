-- ============================================
-- Agent Claims (Mandor) — Fase 8 — 2026-05-15
-- Cada agente passa a emitir, ao final do seu output, um bloco
-- <!--CLAIMS-START-->{"claims":[...]}<!--CLAIMS-END--> com afirmações
-- estruturadas (assertion + fact_ids + benchmark_ids + confidence).
-- Essas claims viram a fonte da Consistency Engine (Fase 9) e da auditoria
-- granular de conclusões.
-- ============================================

CREATE TABLE IF NOT EXISTS public.agent_claims (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  analise_id      uuid        REFERENCES public.analises(id) ON DELETE CASCADE NOT NULL,

  -- Qual agente produziu (matching com chaves do DETAIL_TABS)
  step_key        text        NOT NULL,

  -- Tipo da afirmação (convenção textual):
  --   'numero'        — fato numérico (receita, EBITDA, ticket)
  --   'fato'          — afirmação binária ou de estado (doc disponível, sócio identificado)
  --   'recomendacao'  — ação proposta (recomendar FIDC, sugerir LOI)
  --   'risco'         — risco identificado
  --   'avaliacao'     — julgamento qualitativo (DRS, viabilidade, prioridade)
  claim_type      text        NOT NULL,

  -- A afirmação em si, em 1 frase
  assertion       text        NOT NULL,

  -- Referências a fatos no truth layer: ['F:tipo:chave', ...]
  fact_ids        text[]      NOT NULL DEFAULT '{}',

  -- Referências a benchmarks: ['B:INSTRUMENT:parameter', ...]
  benchmark_ids   text[]      NOT NULL DEFAULT '{}',

  -- Citação literal opcional (do documento de origem)
  source_quote    text,

  -- 0.00 — 1.00
  confidence      numeric(3,2) NOT NULL DEFAULT 0.50 CHECK (confidence >= 0 AND confidence <= 1),

  -- Metadata livre (linkagem com outras claims, contexto extra)
  metadata        jsonb,

  -- Versionamento: cada execução de step gera um set de claims; ao re-rodar,
  -- as claims antigas deste (analise_id, step_key) são deletadas e novas inseridas.
  -- run_at marca a execução que gerou.
  run_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_agent_claims_analise
  ON public.agent_claims (analise_id);

CREATE INDEX IF NOT EXISTS idx_agent_claims_analise_step
  ON public.agent_claims (analise_id, step_key);

CREATE INDEX IF NOT EXISTS idx_agent_claims_analise_type
  ON public.agent_claims (analise_id, claim_type);

ALTER TABLE public.agent_claims ENABLE ROW LEVEL SECURITY;

CREATE POLICY "agent_claims_read_owner" ON public.agent_claims
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.analises WHERE id = analise_id AND user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.deal_members WHERE analise_id = agent_claims.analise_id AND user_id = auth.uid())
  );

CREATE POLICY "agent_claims_service" ON public.agent_claims
  FOR ALL TO service_role USING (true);
