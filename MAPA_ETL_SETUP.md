# Mapa Inteligente do Mercado — ETL Setup

## Status

✅ **Schema criado** — 10 tabelas em `mercado.*`  
✅ **Endpoints criados** — `/api/mapa-mercado/etl/seed` e `/api/mapa-mercado/etl/trigger`  
✅ **Handlers Inngest registrados** — CVM, BCB, Receita, Embed  
⏳ **Dados de teste** — seed pronto para disparar

---

## 1. Disparar Seed (10 gestoras + 20 FIDCs)

```bash
# Via script
./scripts/etl-seed.sh seed

# Via curl
curl -X POST "https://www.mandor.com.br/api/mapa-mercado/etl/seed" \
  -H "Content-Type: application/json" \
  -d '{}'
```

**Resultado esperado:**
```json
{
  "success": true,
  "message": "Seed executado com sucesso",
  "result": {
    "rows_inserted": 13,
    "rows_updated": 0,
    "rows_failed": 0,
    "errors": []
  }
}
```

---

## 2. Disparar ETL CVM (dados de fundos)

Baixa o cadastro de fundos (cad_fi.csv) do Portal de Dados Abertos da CVM.
Processa ~60k fundos em lotes de 8000 (paginado, ~7 steps de 300s cada).

```bash
./scripts/etl-seed.sh cvm

# Ou com limite (ex: só os 100 primeiros fundos para teste)
curl -X POST "https://www.mandor.com.br/api/mapa-mercado/etl/trigger" \
  -H "Content-Type: application/json" \
  -d '{"etl": "cvm", "max": 100}'
```

**Timeline:** ~30-40 min para dados completos (rodando em background)

---

## 3. Disparar ETL BCB (dados de bancos)

Baixa carteira PJ de bancos do IF.data (Banco Central).
Atualizado mensalmente no dia 5.

```bash
./scripts/etl-seed.sh bcb

# Ou especificar período (ex: junho 2026)
curl -X POST "https://www.mandor.com.br/api/mapa-mercado/etl/trigger" \
  -H "Content-Type: application/json" \
  -d '{"etl": "bcb", "anoMes": "202606"}'
```

**Timeline:** ~5-10 min

---

## 4. Disparar ETL Receita Federal (enriquecimento)

Busca dados de constituição, endereços, situação cadastral via API Receita.

```bash
./scripts/etl-seed.sh receita
```

**Timeline:** ~10-15 min (rate-limited)

---

## 5. Disparar ETL Embeddings (busca semântica)

Gera embeddings das entidades via Voyage AI para busca semântica.

```bash
./scripts/etl-seed.sh embed
```

**Timeline:** ~5-10 min

---

## Sequência Recomendada (primeira vez)

```bash
# 1. Dados de teste (imediato)
./scripts/etl-seed.sh seed

# 2. Dados públicos CVM (30-40 min) — roda em background
./scripts/etl-seed.sh cvm

# 3. Depois de CVM terminar: Receita (10-15 min)
./scripts/etl-seed.sh receita

# 4. Depois de Receita: Embeddings (5-10 min)
./scripts/etl-seed.sh embed

# 5. Bancos BCB (5-10 min, independente)
./scripts/etl-seed.sh bcb
```

**Tempo total:** ~60-75 min em background

---

## Estrutura de Dados

### Tabelas Criadas

| Tabela | Registros | Descrição |
|--------|-----------|-----------|
| `mercado_entidades` | ~62k (CVM) + seed | Participantes (gestoras, bancos, etc) |
| `mercado_veiculos` | ~60k (CVM) | Fundos, FIDCs, FIIs, etc |
| `mercado_veiculo_prestadores` | ~200k | Grafo de relacionamentos |
| `mercado_metricas` | ~500k (CVM) + BCB | PL, captação, cotistas, carteira PJ |
| `mercado_rankings` | — | Rankings proprietários (snapshots) |
| `mercado_ingestion_runs` | — | Auditoria de ETL |
| `mercado_buscas_log` | — | Analytics de busca |
| `mercado_alvos` | — | Alvos semânticos (V2) |
| `mercado_perfis` | — | Perfis de usuário |
| `mercado_sugestoes` | — | Sugestões de conexão |

---

## Monitoramento

### Verificar ingestionRuns

```sql
SELECT fonte, dataset, status, rows_upserted, error_message, finished_at
FROM mercado_ingestion_runs
ORDER BY started_at DESC
LIMIT 10;
```

### Contar registros

```sql
SELECT 'entidades' as tabela, COUNT(*) as total FROM mercado_entidades
UNION ALL
SELECT 'veiculos', COUNT(*) FROM mercado_veiculos
UNION ALL
SELECT 'prestadores', COUNT(*) FROM mercado_veiculo_prestadores
UNION ALL
SELECT 'metricas', COUNT(*) FROM mercado_metricas
UNION ALL
SELECT 'rankings', COUNT(*) FROM mercado_rankings;
```

---

## Próximos Passos

- [ ] Re-habilitar UI do Mapa (busca, fichas, rankings)
- [ ] Testar busca semântica (embeddings)
- [ ] Conectar sugestões do Kanban ao Mapa
- [ ] Implementar sincronização contínua (jobs cron)

---

## Troubleshooting

**Erro: "supabaseKey is required"**  
→ Verificar env vars `SUPABASE_SERVICE_ROLE_KEY` em Vercel

**Erro: "table mercado_entidades does not exist"**  
→ Aplicar migrations: `/APLICAR_MAPA_MIGRATIONS.md`

**ETL travado/pendente**  
→ Verificar logs do Inngest no painel de deployment
