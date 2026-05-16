-- ============================================
-- Truth Layer / Memória Factual Consolidada (Mandor) — 2026-05-15
-- Fase 6 da reformulação multiagente.
--
-- Cada fato extraído da ingestão documental vira uma linha estruturada.
-- Agentes downstream consultam esta camada ANTES de afirmar disponibilidade
-- documental ou citar números financeiros, eliminando contradições entre
-- "DRE ausente" e "EBITDA calculado a partir da DRE".
-- ============================================

CREATE TABLE IF NOT EXISTS public.analise_facts (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  analise_id    uuid        REFERENCES public.analises(id) ON DELETE CASCADE NOT NULL,

  -- Taxonomia dos fatos. Mantém aberta (text + check de valores conhecidos
  -- por convenção, sem CHECK constraint pra permitir evolução).
  fact_type     text        NOT NULL,
  -- Exemplos esperados:
  --   'documento_disponivel'  → presença/ausência de docs
  --   'numero_financeiro'     → receita, ebitda, fluxo, dívida
  --   'estrutura_societaria'  → sócios e participações
  --   'contrato'              → contratos identificados
  --   'garantia'              → colaterais
  --   'passivo'               → passivos descobertos
  --   'evento_relevante'      → M&A history, processos
  --   'lacuna'                → o que NÃO foi encontrado (registrar é importante)

  -- Chave canônica do fato dentro do tipo (ex: 'dre_2024', 'ebitda_2024',
  -- 'socio_majoritario'). Permite getFact(analise, 'numero_financeiro', 'ebitda_2024').
  key           text        NOT NULL,

  -- Valor estruturado. Pode ser:
  --   numero: { "amount": 12500000, "unit": "BRL", "periodo": "2024" }
  --   booleano: { "value": true }
  --   string: { "value": "balanço_2024.pdf" }
  --   objeto complexo: { "nome": "João Silva", "participacao": 0.6 }
  value         jsonb       NOT NULL,

  -- Rastreabilidade
  source_doc    text,                       -- nome do arquivo de origem
  source_page   integer,                    -- página dentro do PDF (1-indexed)
  source_quote  text,                       -- trecho literal opcional do documento
  asserted_by   text        NOT NULL,       -- 'fact_extractor' | 'davi' | 'clara' | etc

  -- Confiança 0.00–1.00, calculada pelo extractor
  confidence    numeric(3,2) NOT NULL DEFAULT 0.50 CHECK (confidence >= 0 AND confidence <= 1),

  -- Notas livres (justificativa de baixa confiança, observações do extractor)
  notes         text,

  criado_em     timestamptz NOT NULL DEFAULT now(),

  -- Unique constraint: para um mesmo type+key na mesma análise, só 1 fato
  -- (atualiza ao invés de duplicar). Quando precisar versionar, usar nova key.
  CONSTRAINT analise_facts_unique UNIQUE (analise_id, fact_type, key)
);

CREATE INDEX IF NOT EXISTS idx_analise_facts_analise
  ON public.analise_facts (analise_id);

CREATE INDEX IF NOT EXISTS idx_analise_facts_analise_type
  ON public.analise_facts (analise_id, fact_type);

ALTER TABLE public.analise_facts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "analise_facts_read_owner" ON public.analise_facts
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.analises WHERE id = analise_id AND user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.deal_members WHERE analise_id = analise_facts.analise_id AND user_id = auth.uid())
  );

CREATE POLICY "analise_facts_service" ON public.analise_facts
  FOR ALL TO service_role USING (true);

-- Flag denormalizado: indica se a extração de fatos já rodou pra essa análise.
-- Usado pelo /step para decidir se já pode injetar truth layer.
ALTER TABLE public.analises
  ADD COLUMN IF NOT EXISTS facts_extracted_at timestamptz;
