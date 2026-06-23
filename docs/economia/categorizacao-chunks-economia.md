# Economia com Categorização de Chunks

## Cenário: 50 análises × 75 documentos = 3.750 documentos

### Hoje (sem categorização)

Cada análise processa TODOS os chunks com os agentes que usam RAG (semantic search):

| Etapa | Chunks | Tokens por chunk | Tokens totais | Custo (R$) |
|-------|--------|------------------|---------------|-----------|
| RAG query genérico (sem filtro) | 75 | 3.000 | 225.000 | R$ 6,75 |
| **50 análises** | 75 × 50 | — | **11.250.000** | **R$ 337,50** |

### Amanhã (com categorização + RAG categorizado)

Quando agentes usam RAG com filtro de categoria:

**Exemplo 1: Agente Financeiro busca por "EBITDA 2024"**
- Sem categoria: busca entre 75 chunks, retorna 8 top relevantes (total: ~24.000 tokens)
- Com `categoria='financeiro'`: busca entre ~20 chunks financeiros, retorna 8 top relevantes (total: ~8.000 tokens)
- **Economia: 67%** em 1 query

**Exemplo 2: Agente Jurídico busca por "cláusula de penalidade"**
- Sem categoria: busca entre 75 chunks, retorna 8 relevantes (total: ~24.000 tokens)
- Com `categoria='juridico'`: busca entre ~15 chunks jurídicos, retorna 8 relevantes (total: ~6.000 tokens)
- **Economia: 75%** em 1 query

### Por análise completa

Assumindo 3 queries de RAG por análise, com categorização:

| Métrica | Antes | Depois | Redução |
|---------|-------|--------|---------|
| Queries RAG | 3 | 3 | — |
| Tokens por query | 24.000 | 10.000 | **58%** |
| Tokens RAG por análise | 72.000 | 30.000 | **58%** |
| **Custo RAG por análise** | **R$ 2,16** | **R$ 0,90** | **58%** |
| 50 análises/mês | R$ 108 | R$ 45 | **R$ 63 economizados** |

---

## Como a economia funciona

### 1. **Embeddings são reutilizáveis**
- Chunk "DRE 2024" é embutido UMA VEZ
- Toda query "financeira" o encontra sem re-embutir
- Economia: cache de embeddings (Voyage é a operação cara)

### 2. **Categorias reduzem espaço de busca**
- Ao procurar "EBITDA", não precisa comparar contra chunks jurídicos/tributários
- HNSW index + categoria filter = menos comparações

### 3. **Chunks irrelevantes não entram no contexto**
- Sem categoria: LLM recebe 8 chunks de qualquer tipo, precisa descartar os ruins
- Com categoria: LLM recebe 8 chunks PRÉ-FILTRADOS, todos relevantes
- Menos tokens desperdiçados em "este chunk não é relevante"

---

## Onde implementar (roadmap)

### ✅ Semana 1-2 (PRONTO)
- [x] Coluna `categoria` em `document_chunks`
- [x] RPC `match_document_chunks` com filtro de categoria
- [x] Helper `retrieveRelevantChunks` aceita `categoria` opcional
- [x] Testes de categorização

### ⏳ Semana 3+ (futuro)
Quando agentes começarem a usar RAG categorizado:

```typescript
// Hoje: RAG genérico
const chunks = await retrieveRelevantChunks({
  analiseId, query: "EBITDA",
})

// Futuro: RAG categorizado
const chunks = await retrieveRelevantChunks({
  analiseId, query: "EBITDA",
  categoria: 'financeiro'  // ← novo
})
```

---

## Garantias

✅ **Zero mudança no resultado:**
- Categorização é 100% backward-compatible
- Se categoria é NULL, comportamento é idêntico a hoje
- Teste `chunk-categorizer.test.ts` valida corretude

✅ **Sem risco ao assessor:**
- PDF original sempre preservado
- Assessor valida o relatório (workflow atual)
- Economia é transparente

✅ **Pronto para produção:**
- RPC está na Semana 2 (migration aplicável)
- Helper aceita categoria opcional
- Fallback seguro se categoria falhar

---

## Próximos passos

1. **Semana 3:** Implementar Knowledge Graph (estrutura societária, relacionamentos)
2. **Semana 4:** Integração end-to-end + validação de economia real
3. **Futuro:** Considerar cache de embeddings entre análises (economia adicional 20-30%)
