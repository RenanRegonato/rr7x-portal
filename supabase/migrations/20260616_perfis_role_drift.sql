-- Drift de schema capturado em 16/06/2026: as colunas `role` e `atualizado_em`
-- foram adicionadas manualmente em `perfis` na produção, sem migration. Sem isso
-- o schema não era reproduzível (descoberto ao montar o banco de homologação).
-- Esta migration documenta e reproduz a mudança. Idempotente — em produção
-- (onde as colunas já existem) é no-op.
ALTER TABLE public.perfis ADD COLUMN IF NOT EXISTS role          text        NOT NULL DEFAULT 'assessor';
ALTER TABLE public.perfis ADD COLUMN IF NOT EXISTS atualizado_em timestamptz NOT NULL DEFAULT now();
