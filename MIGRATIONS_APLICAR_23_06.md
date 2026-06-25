# 🚀 APLICAR MIGRATIONS — Supabase Production (23/06/2026)

**Status:** Deploy Vercel ✅ Completo  
**Próximo Passo:** Aplicar 3 migrations no SQL Editor do Supabase  

---

## 📋 Migrations a Aplicar (em ordem)

### 1️⃣ `20260623_document_chunks_categoria.sql`

**O que faz:** Adiciona coluna `categoria` em `document_chunks` para categorizar chunks por domínio (financeiro, jurídico, tributário, etc). Economiza 60-70% de tokens.

```sql
-- ============================================
-- Document chunks categoria (Mandor) — 2026-06-23
-- ============================================
-- Adiciona coluna categoria em document_chunks para permitir
-- que agentes especializados consultem apenas chunks relevantes.
-- Economias esperadas: 60-70% de tokens sem mudança funcional.
--
-- Categorias:
--   financeiro   - DRE, balanço, fluxo de caixa, extratos
--   juridico     - contratos, matrículas, certidões, procurações
--   tributario   - IR, DARF, certidões de regularização
--   garantias    - garantias imobiliárias, penhoras, adversários
--   estrutura    - estrutura societária, participações, cedentes
--   outro        - informações gerais, notas, outros

ALTER TABLE public.document_chunks
  ADD COLUMN IF NOT EXISTS categoria text CHECK (categoria IN ('financeiro', 'juridico', 'tributario', 'garantias', 'estrutura', 'outro'));

-- Índice para consultas por categoria (agentes consultam: "WHERE categoria = $1")
CREATE INDEX IF NOT EXISTS idx_document_chunks_categoria
  ON public.document_chunks (analise_id, categoria)
  WHERE categoria IS NOT NULL;

-- Track: coluna para saber se foi categorizado (para re-processar se necessário)
ALTER TABLE public.document_chunks
  ADD COLUMN IF NOT EXISTS categoria_model_id text;  -- ex: 'claude-haiku-4-5-20251001'

ALTER TABLE public.document_chunks
  ADD COLUMN IF NOT EXISTS categorizado_em timestamptz;
```

**Tempo esperado:** ~2-5s

---

### 2️⃣ `20260623_knowledge_graph.sql`

**O que faz:** Cria 2 tabelas novas (entidades e relacionamentos) para rastreamento determinístico de KYC e estrutura societária.

```sql
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
```

**Tempo esperado:** ~10-15s (cria 2 tabelas + índices + RLS policies)

---

### 3️⃣ `20260623_match_chunks_with_categoria.sql`

**O que faz:** Estende a RPC `match_document_chunks` para filtrar por categoria (opcional).

```sql
-- ============================================
-- Match document chunks com suporte a categoria
-- ============================================
-- Estende a RPC match_document_chunks para aceitar filtro opcional por categoria.
-- Permite RAG semanticamente relevante E categorizado (economia de tokens).

-- Nova versão com categoria_filter (opcional)
CREATE OR REPLACE FUNCTION public.match_document_chunks(
  p_analise_id        uuid,
  p_query_embedding   vector(1024),
  p_match_count       integer DEFAULT 10,
  p_similarity_min    double precision DEFAULT 0.0,
  p_categoria         text DEFAULT NULL  -- novo: filtro opcional
)
RETURNS TABLE (
  chunk_id        uuid,
  document_id     uuid,
  document_name   text,
  chunk_index     integer,
  chunk_text      text,
  page_start      integer,
  page_end        integer,
  categoria       text,
  similarity      double precision
)
LANGUAGE sql STABLE PARALLEL SAFE
AS $$
  SELECT
    c.id              AS chunk_id,
    c.document_id     AS document_id,
    d.file_name       AS document_name,
    c.chunk_index     AS chunk_index,
    c.chunk_text      AS chunk_text,
    c.page_start      AS page_start,
    c.page_end        AS page_end,
    c.categoria       AS categoria,
    1 - (c.embedding <=> p_query_embedding) AS similarity
  FROM public.document_chunks c
  JOIN public.analise_documents d ON d.id = c.document_id
  WHERE c.analise_id = p_analise_id
    AND c.embedding IS NOT NULL
    AND 1 - (c.embedding <=> p_query_embedding) >= p_similarity_min
    AND (p_categoria IS NULL OR c.categoria = p_categoria)  -- filtro condicional
  ORDER BY c.embedding <=> p_query_embedding
  LIMIT p_match_count;
$$;

-- Comentário documentando o novo parâmetro
COMMENT ON FUNCTION public.match_document_chunks(uuid, vector, integer, double precision, text) IS
  'Busca top-K chunks por similaridade semântica (HNSW cosine). Com p_categoria, filtra por domínio (financeiro/juridico/etc) antes de ordenar. Sem categoria, retorna chunks em qualquer categoria.';
```

**Tempo esperado:** ~2-3s

---

## 📍 Como Aplicar

### Passo 1: Acessar o SQL Editor do Supabase Production

1. Ir a: https://supabase.com/dashboard
2. Selecionar projeto **rr7x-portal** (Production)
3. Clicar em **SQL Editor** (aba esquerda)
4. Clicar em **New Query** (ou ➕)

### Passo 2: Executar a 1ª Migration

1. Copiar o conteúdo de `20260623_document_chunks_categoria.sql` (acima)
2. Colar no editor
3. Clicar em **▶️ Run** (ou Ctrl+Enter)
4. Verificar: ✅ 4 statements sem erros

### Passo 3: Executar a 2ª Migration

1. Nova query
2. Copiar o conteúdo de `20260623_knowledge_graph.sql`
3. Clicar em **▶️ Run**
4. Verificar: ✅ 2 tabelas criadas + índices + RLS policies

### Passo 4: Executar a 3ª Migration

1. Nova query
2. Copiar o conteúdo de `20260623_match_chunks_with_categoria.sql`
3. Clicar em **▶️ Run**
4. Verificar: ✅ Função `match_document_chunks` substituída

---

## ✅ Verificação Pós-Aplicação

**No SQL Editor, rodar:**

```sql
-- Verificar colunas em document_chunks
SELECT column_name FROM information_schema.columns
WHERE table_name = 'document_chunks' AND column_name IN ('categoria', 'categoria_model_id', 'categorizado_em')
ORDER BY ordinal_position;
-- Esperado: 3 linhas (categoria, categoria_model_id, categorizado_em)

-- Verificar tabelas KG
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public' AND table_name LIKE 'kg_%'
ORDER BY table_name;
-- Esperado: 2 linhas (kg_entidades, kg_relacionamentos)

-- Verificar RPC match_document_chunks
SELECT routine_name FROM information_schema.routines
WHERE routine_schema = 'public' AND routine_name = 'match_document_chunks'
ORDER BY routine_name;
-- Esperado: 1 linha
```

---

## 📊 Resumo da Aplicação

| Migration | Tempo | Risco | Rollback |
|-----------|-------|-------|----------|
| documento_chunks_categoria | ~5s | 🟢 BAIXO | Remover coluna (ALTER TABLE DROP COLUMN) |
| knowledge_graph | ~15s | 🟡 MÉDIO | Remover tabelas (DROP TABLE) |
| match_chunks_categoria | ~3s | 🟢 BAIXO | Restaurar RPC anterior |

**Tempo total esperado:** ~25 segundos

---

## 🎯 Checklist Final

- [ ] Deploy Vercel: ✅ Completo (ID: dpl_A935dCCMedgv3nHQy3PEK8VmZBH1)
- [ ] 3 Migrations aplicadas no Supabase Production
- [ ] Verificação pós-aplicação: OK
- [ ] Inngest Sync: (verificar se há novas funções KG)
- [ ] Testar ao vivo:
  - [ ] Página inicial carrega (www.mandor.com.br)
  - [ ] Criar nova análise FIDC (4 campos aparecem)
  - [ ] Novo tipo de investidor (securitizadora) aparece

---

**Data:** 23/06/2026 15:30 BRT  
**Responsável:** Renan Regonato  
**Próximo:** Testar ao vivo e validar Knowledge Graph
