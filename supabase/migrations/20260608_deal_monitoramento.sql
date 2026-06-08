-- ============================================
-- Monitoramento contínuo de deals (MVP)
-- Transforma a análise (evento único) em vigilância recorrente: um cron
-- re-checa periodicamente sinais do deal e grava alertas. Primeiro sinal:
-- situação cadastral do CNPJ do detentor (reusa lib/auto-pull/cnpj.ts).
-- ============================================

-- Snapshot do último monitoramento por análise (para detectar mudança) +
-- carimbo de quando rodou (usado pelo cron para priorizar os mais antigos).
ALTER TABLE public.analises
  ADD COLUMN IF NOT EXISTS monitor       jsonb,
  ADD COLUMN IF NOT EXISTS monitorado_em timestamptz;

-- Feed de alertas por deal.
CREATE TABLE IF NOT EXISTS public.deal_alertas (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  analise_id    uuid        NOT NULL REFERENCES public.analises(id) ON DELETE CASCADE,
  tipo          text        NOT NULL,                 -- ex: 'cnpj_situacao'
  severidade    text        NOT NULL DEFAULT 'warn'
                            CHECK (severidade IN ('info', 'warn', 'critico')),
  titulo        text        NOT NULL,
  detalhe       text,
  criado_em     timestamptz NOT NULL DEFAULT now(),
  resolvido_em  timestamptz                            -- null = alerta aberto
);

CREATE INDEX IF NOT EXISTS idx_deal_alertas_analise
  ON public.deal_alertas (analise_id);

-- Acelera a busca de alertas abertos de um deal.
CREATE INDEX IF NOT EXISTS idx_deal_alertas_aberto
  ON public.deal_alertas (analise_id)
  WHERE resolvido_em IS NULL;

ALTER TABLE public.deal_alertas ENABLE ROW LEVEL SECURITY;

-- Escrita (cron) e leitura server-side usam service role. A leitura pelo
-- cliente passa pela API com canAccessAnalise (admin client bypassa RLS),
-- então não há política para usuários autenticados de propósito.
CREATE POLICY "deal_alertas_service_role" ON public.deal_alertas
  FOR ALL TO service_role USING (true) WITH CHECK (true);
