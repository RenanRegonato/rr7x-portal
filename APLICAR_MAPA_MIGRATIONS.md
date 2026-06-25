# Aplicar Migrations do Mapa Inteligente do Mercado

**Data:** 2026-06-25  
**Status:** Pronto para aplicar  
**Tempo estimado:** ~30-40 segundos  
**Risco:** 🟡 MÉDIO (novas tabelas, mas sem impacto em dados existentes)

---

## 📋 O que será criado

7 migrations criarão o schema `mercado.*` (sem conflitar com schema `public.*` existente):

| Tabela | Descrição |
|--------|-----------|
| `mercado_entidades` | Participantes (gestoras, administradores, bancos, etc) |
| `mercado_veiculos` | Fundos, FIDCs, securitizações, emissões |
| `mercado_veiculo_prestadores` | Quem faz o quê em cada veículo (grafo) |
| `mercado_metricas` | Séries temporais (PL, captação, cotistas) |
| `mercado_rankings` | Rankings proprietários (snapshots periódicos) |
| `mercado_ingestion_runs` | Log de ingestão (auditoria de ETL) |
| `mercado_buscas_log` | Log de buscas IA (analytics) |
| `mercado_alvos` | Alvos de busca (para IA semântica — V2) |
| `mercado_perfis` | Perfis de usuário (preferências de busca) |
| `mercado_sugestoes` | Sugestões de conexão entre entidades |

Todos com:
- ✅ Índices de performance
- ✅ RLS (Row Level Security) — dados públicos, leitura restrita a usuários autenticados
- ✅ Full-text search (pg_trgm)
- ✅ Coluna `redistribuivel` (governança de licença)

---

## 🚀 Como Aplicar

### Opção 1: Via Supabase Dashboard (mais seguro)

1. Ir a: **https://supabase.com/dashboard**
2. Selecionar projeto: **rr7x-portal** (Production)
3. Ir a: **SQL Editor** (aba esquerda)
4. Clicar: **New Query** (ou ➕)
5. Copiar todo o conteúdo de `/tmp/mapa_consolidadas.sql` (757 linhas)
6. Colar no editor
7. Clicar: **▶️ Run** (ou Ctrl+Enter)
8. Verificar: ✅ **Success** (nenhum erro)

### Opção 2: Via CLI Supabase (se configurado)

```bash
cd /Users/renan/Desktop/rr7x-portal
supabase migration up --linked
# Verifica connection, aplica migrations pendentes no schema versioning
```

---

## ✅ Checklist Pós-Aplicação

No **SQL Editor**, executar:

```sql
-- 1. Verificar tabelas criadas
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public' AND table_name LIKE 'mercado%'
ORDER BY table_name;
-- Esperado: 10 linhas (entidades, veiculos, veiculo_prestadores, metricas, rankings, ingestion_runs, buscas_log, alvos, perfis, sugestoes)

-- 2. Verificar índices
SELECT indexname FROM pg_indexes
WHERE tablename LIKE 'mercado%'
ORDER BY indexname;
-- Esperado: ~25+ índices

-- 3. Verificar RLS habilitado
SELECT tablename, rowsecurity FROM pg_tables
WHERE tablename LIKE 'mercado%' AND schemaname = 'public'
ORDER BY tablename;
-- Esperado: RLS = true para todas
```

---

## 🔄 Próximos Passos

1. ✅ Aplicar migrations (agora)
2. ⏳ Implementar ETL (CVM, BCB, B3, Receita)
3. ⏳ Criar UI (busca, fichas, rankings)
4. ⏳ Aprimorar Kanban do Invest Match

---

## ⏮️ Rollback (se necessário)

Se algo der errado, remover tabelas:

```sql
DROP TABLE IF EXISTS public.mercado_sugestoes CASCADE;
DROP TABLE IF EXISTS public.mercado_perfis CASCADE;
DROP TABLE IF EXISTS public.mercado_alvos CASCADE;
DROP TABLE IF EXISTS public.mercado_buscas_log CASCADE;
DROP TABLE IF EXISTS public.mercado_ingestion_runs CASCADE;
DROP TABLE IF EXISTS public.mercado_rankings CASCADE;
DROP TABLE IF EXISTS public.mercado_metricas CASCADE;
DROP TABLE IF EXISTS public.mercado_veiculo_prestadores CASCADE;
DROP TABLE IF EXISTS public.mercado_veiculos CASCADE;
DROP TABLE IF EXISTS public.mercado_entidades CASCADE;
```

---

**Arquivo consolidado:** `/tmp/mapa_consolidadas.sql` (757 linhas)

Pronto para aplicar ao Supabase Production. ✨
