-- ============================================
-- Knowledge Graph — Entidades e Relacionamentos
-- ============================================
-- Tabelas para manter uma representação estruturada de entidades (pessoas, empresas,
-- imóveis, garantias) e seus relacionamentos (sócio, proprietário, garante, etc).
--
-- Finalidade:
-- 1. Evitar que LLM "calcule" relacionamentos (alucinação)
-- 2. Rastreabilidade total (cada relacionamento cita chunk_fonte)
-- 3. Queries determinísticas em vez de semânticas
-- 4. Auditoria de KYC/estrutura societária

-- ============================================
-- Tabela 1: Entidades
-- ============================================
CREATE TABLE IF NOT EXISTS public.kg_entidades (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  analise_id          uuid        NOT NULL REFERENCES public.analises(id) ON DELETE CASCADE,
  tipo                text        NOT NULL,  -- pessoa_fisica | pessoa_juridica | imovel | veiculo | direitos | outro
  identificador       text,                  -- CPF, CNPJ, matricula, chassi, etc
  nome                text        NOT NULL,
  dados               jsonb       NOT NULL DEFAULT '{}',  -- {cpf, cnpj, rg, razao_social, endereco, etc}
  confianca_extracao  numeric(3,2) DEFAULT 0.9,
  chunk_fonte_id      uuid REFERENCES public.document_chunks(id) ON DELETE SET NULL,
  extraido_em         timestamptz NOT NULL DEFAULT now(),
  atualizado_em       timestamptz NOT NULL DEFAULT now(),
  UNIQUE (analise_id, tipo, identificador)
);

CREATE INDEX IF NOT EXISTS idx_kg_entidades_analise ON public.kg_entidades (analise_id);
CREATE INDEX IF NOT EXISTS idx_kg_entidades_tipo ON public.kg_entidades (analise_id, tipo);
CREATE INDEX IF NOT EXISTS idx_kg_entidades_identificador ON public.kg_entidades (identificador);

-- ============================================
-- Tabela 2: Relacionamentos
-- ============================================
CREATE TABLE IF NOT EXISTS public.kg_relacionamentos (
  id                    uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  analise_id            uuid        NOT NULL REFERENCES public.analises(id) ON DELETE CASCADE,
  entidade_origem_id    uuid        NOT NULL REFERENCES public.kg_entidades(id) ON DELETE CASCADE,
  entidade_destino_id   uuid        NOT NULL REFERENCES public.kg_entidades(id) ON DELETE CASCADE,
  tipo                  text        NOT NULL,  -- socio | proprietario | garante | avalista | beneficiario | cedente | sacado | etc
  percentual            numeric(5,2),          -- para participação/quota (0-100)
  dados_adicionais      jsonb DEFAULT '{}',   -- {data_inicio, data_fim, status, etc}
  confianca_extracao    numeric(3,2) DEFAULT 0.85,
  validacao_necessaria  boolean     DEFAULT false,  -- TRUE se confiança < 90%
  validado_em           timestamptz,
  chunk_fonte_id        uuid REFERENCES public.document_chunks(id) ON DELETE SET NULL,
  extraido_em           timestamptz NOT NULL DEFAULT now(),
  atualizado_em         timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT origem_destino_diferentes CHECK (entidade_origem_id != entidade_destino_id)
);

CREATE INDEX IF NOT EXISTS idx_kg_relacionamentos_analise ON public.kg_relacionamentos (analise_id);
CREATE INDEX IF NOT EXISTS idx_kg_relacionamentos_origem ON public.kg_relacionamentos (entidade_origem_id);
CREATE INDEX IF NOT EXISTS idx_kg_relacionamentos_destino ON public.kg_relacionamentos (entidade_destino_id);
CREATE INDEX IF NOT EXISTS idx_kg_relacionamentos_tipo ON public.kg_relacionamentos (analise_id, tipo);
CREATE INDEX IF NOT EXISTS idx_kg_relacionamentos_validacao ON public.kg_relacionamentos (analise_id, validacao_necessaria);

-- ============================================
-- RLS (Row Level Security)
-- ============================================
ALTER TABLE public.kg_entidades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kg_relacionamentos ENABLE ROW LEVEL SECURITY;

-- Owners e membros do deal podem ler entidades e relacionamentos
CREATE POLICY "kg_entidades_read_owner_or_member" ON public.kg_entidades
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.analises a
      WHERE a.id = kg_entidades.analise_id
        AND (a.user_id = auth.uid()
             OR EXISTS (SELECT 1 FROM public.deal_members m WHERE m.analise_id = a.id AND m.user_id = auth.uid()))
    )
  );

CREATE POLICY "kg_relacionamentos_read_owner_or_member" ON public.kg_relacionamentos
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.analises a
      WHERE a.id = kg_relacionamentos.analise_id
        AND (a.user_id = auth.uid()
             OR EXISTS (SELECT 1 FROM public.deal_members m WHERE m.analise_id = a.id AND m.user_id = auth.uid()))
    )
  );

-- Service role (workers/admin) pode INSERT/UPDATE
CREATE POLICY "kg_entidades_write_service_role" ON public.kg_entidades
  FOR INSERT WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "kg_entidades_update_service_role" ON public.kg_entidades
  FOR UPDATE USING (auth.role() = 'service_role');

CREATE POLICY "kg_relacionamentos_write_service_role" ON public.kg_relacionamentos
  FOR INSERT WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "kg_relacionamentos_update_service_role" ON public.kg_relacionamentos
  FOR UPDATE USING (auth.role() = 'service_role');

-- ============================================
-- Helper Views
-- ============================================

-- Vista: Estrutura societária (sócios e participações)
CREATE OR REPLACE VIEW public.kg_estrutura_societaria AS
SELECT
  r.analise_id,
  eo.nome AS entidade_origem,
  eo.tipo AS tipo_origem,
  eo.identificador AS identificador_origem,
  r.tipo AS relacao,
  ed.nome AS entidade_destino,
  ed.tipo AS tipo_destino,
  ed.identificador AS identificador_destino,
  r.percentual,
  r.confianca_extracao,
  r.validacao_necessaria
FROM public.kg_relacionamentos r
JOIN public.kg_entidades eo ON eo.id = r.entidade_origem_id
JOIN public.kg_entidades ed ON ed.id = r.entidade_destino_id
WHERE r.tipo IN ('socio', 'proprietario', 'quota_holder');

-- Vista: Garantias (imóveis, penhoras, avalistas)
CREATE OR REPLACE VIEW public.kg_garantias AS
SELECT
  r.analise_id,
  ed.nome AS garantia,
  ed.tipo AS tipo_garantia,
  ed.dados ->> 'matricula' AS matricula,
  eo.nome AS garante,
  eo.tipo AS tipo_garante,
  r.confianca_extracao,
  r.validacao_necessaria
FROM public.kg_relacionamentos r
JOIN public.kg_entidades ed ON ed.id = r.entidade_destino_id
JOIN public.kg_entidades eo ON eo.id = r.entidade_origem_id
WHERE r.tipo IN ('garante', 'avalista', 'penhor');

-- ============================================
-- Comments
-- ============================================
COMMENT ON TABLE public.kg_entidades IS
  'Entidades extraídas de documentos: pessoas físicas (CPF), empresas (CNPJ), imóveis (matrícula), etc. Fonte única de verdade para KYC/estrutura.';

COMMENT ON TABLE public.kg_relacionamentos IS
  'Relacionamentos entre entidades: sócio de, proprietário de, garante de, etc. Cada um rastreia sua fonte (chunk_fonte_id) e confiança.';

COMMENT ON COLUMN public.kg_entidades.chunk_fonte_id IS
  'Qual chunk extraiu esta entidade — rastreabilidade 100% auditável.';

COMMENT ON COLUMN public.kg_relacionamentos.validacao_necessaria IS
  'TRUE se confiança < 90% — agente deve relê o documento original antes de usar.';
