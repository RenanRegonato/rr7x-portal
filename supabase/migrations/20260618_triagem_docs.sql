-- ============================================
-- Triagem de documentos com falha (gate de documentos críticos) — 2026-06-18
-- ============================================
-- Quando a ingestão termina com algum documento em FALHA (status='failed') ou
-- com LEITURA VAZIA (status='completed' mas total_chunks=0, ex.: PDF escaneado
-- ilegível), a análise é SEGURADA antes do pipeline de agentes. O usuário decide
-- a relevância de cada falha; documentos relevantes precisam ser remediados
-- (reenvio, texto colado ou justificativa) antes de a análise prosseguir.
--
-- Estado por documento (decisão da triagem):
ALTER TABLE public.analise_documents
  ADD COLUMN IF NOT EXISTS relevancia            text,        -- null | 'relevante' | 'nao_relevante'
  ADD COLUMN IF NOT EXISTS resolucao             text,        -- null | 'reenviado' | 'substituido' | 'texto_colado' | 'justificado'
  ADD COLUMN IF NOT EXISTS justificativa         text,        -- texto quando 'justificado' (ou 'texto_colado')
  ADD COLUMN IF NOT EXISTS substituido_por       uuid REFERENCES public.analise_documents(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS triagem_decidida_em   timestamptz,
  ADD COLUMN IF NOT EXISTS triagem_decidida_por  uuid;

-- Estado do gate por análise:
--   null      → sem pendências / não avaliado (comportamento normal)
--   'pendente'→ há documento com falha não resolvido; pipeline está SEGURO
--   'liberada'→ triagem concluída; pipeline disparado (idempotente)
ALTER TABLE public.analises
  ADD COLUMN IF NOT EXISTS triagem_docs_status        text,
  ADD COLUMN IF NOT EXISTS triagem_docs_resolvida_em  timestamptz;
