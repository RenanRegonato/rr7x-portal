-- ============================================
-- Consistency Engine (Mandor) — Fase 9 — 2026-05-15
-- ============================================
-- Após todos os agentes rodarem, executa um conjunto de validações
-- determinísticas e armazena as inconsistências encontradas.
-- Issues bloqueantes mostram badge "REVISÃO PENDENTE" no relatório;
-- alertas exibem banner amarelo.

CREATE TABLE IF NOT EXISTS public.consistency_issues (
  id                 uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  analise_id         uuid        REFERENCES public.analises(id) ON DELETE CASCADE NOT NULL,

  -- Severidade
  --   'bloqueante' — número financeiro contraditório, eligibilidade violada
  --   'alerta'     — número fora de range esperado, fato divergente entre agentes
  --   'info'       — observação informativa, lacuna citada
  severidade         text        NOT NULL CHECK (severidade IN ('bloqueante', 'alerta', 'info')),

  -- Tipo de inconsistência
  --   'numero_divergente'        — claim numérico não bate com truth_layer
  --   'numero_inter_agente'      — dois agentes citam mesmo fact_id com valores diferentes
  --   'benchmark_violado'        — claim de recomendação viola benchmark (isEligible)
  --   'fato_contradito'          — claim contradiz fato registrado
  --   'lacuna_critica'           — agente fez claim que depende de lacuna registrada
  --   'recomendacao_sem_fonte'   — recomendação não cita fact_ids nem benchmark_ids
  tipo               text        NOT NULL,

  -- Resumo legível em PT
  resumo             text        NOT NULL,
  detalhes           jsonb,

  -- Rastreabilidade
  steps_envolvidos   text[]      NOT NULL DEFAULT '{}',
  fact_ids           text[]      NOT NULL DEFAULT '{}',
  benchmark_ids      text[]      NOT NULL DEFAULT '{}',
  claim_ids          uuid[]      NOT NULL DEFAULT '{}',

  -- Resolução manual (assessor revisou e marcou como ok)
  resolvido          boolean     NOT NULL DEFAULT false,
  resolvido_por      uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  resolvido_em       timestamptz,
  resolucao_nota     text,

  criado_em          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_consistency_analise
  ON public.consistency_issues (analise_id);

CREATE INDEX IF NOT EXISTS idx_consistency_analise_severidade
  ON public.consistency_issues (analise_id, severidade)
  WHERE resolvido = false;

ALTER TABLE public.consistency_issues ENABLE ROW LEVEL SECURITY;

CREATE POLICY "consistency_issues_read_owner" ON public.consistency_issues
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.analises WHERE id = analise_id AND user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.deal_members WHERE analise_id = consistency_issues.analise_id AND user_id = auth.uid())
  );

CREATE POLICY "consistency_issues_service" ON public.consistency_issues
  FOR ALL TO service_role USING (true);

-- Marca timestamp da última checagem na análise
ALTER TABLE public.analises
  ADD COLUMN IF NOT EXISTS consistency_checked_at timestamptz;
