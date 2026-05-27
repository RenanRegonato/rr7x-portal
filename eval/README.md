# Golden-set / Harness de Avaliação (Fase 0.3)

A rede de segurança da iniciativa de custo x qualidade. Existe para **provar** que uma otimização (trocar modelo, extração determinística, cross-reading via claims, tiers) não reduziu a qualidade analítica. Sem ele, todo corte de custo é uma aposta cega contra a regra absoluta da Mandor (nunca reduzir qualidade/auditabilidade).

Ver a revisão de arquitetura: [docs/arquitetura/revisao-2026-05-26-custo-qualidade.md](../docs/arquitetura/revisao-2026-05-26-custo-qualidade.md).

## Filosofia: regressão, não verdade absoluta

Não pedimos um gabarito hand-made perfeito. Capturamos o output de uma análise **real e validada** (que você considera correta hoje) como **baseline**. Qualquer mudança futura é pontuada contra esse baseline: derrubou um fato? mudou um número? aumentou hallucination? piorou cobertura? Um humano pode refinar o gabarito depois (marcar quais fatos são de fato corretos), mas o baseline já pega regressão.

## Métricas e limiares (conservadores)

| Métrica | O que mede | Limiar para PASSAR |
|---|---|---|
| `fact_recall` | % dos fatos do gabarito que sobreviveram | >= 0.95 |
| `numeric_fidelity` | números-chave (EBITDA, receita, dívida…) batem em até 1% | >= 0.98 |
| `hallucination_delta` | variação de claims sem fonte | <= +0.02 |
| `consistency_bloqueante_delta` | novas inconsistências bloqueantes | <= 0 |
| `coverage_delta` | variação do score de cobertura | >= -0.02 |

PASS exige **todas** passarem. Números são sagrados (limiar mais alto).

## Workflow

1. **Capturar o baseline** (uma vez, de um deal real bom):
   ```
   node scripts/eval-snapshot.mjs <analise_id> <slug>
   # ex: node scripts/eval-snapshot.mjs 1234-abcd resort-campo-alegre
   ```
   Grava `eval/goldenset/<slug>.json`. Use 2-3 deals reais variados (não o vitrine Cobalto, que é seedado sem facts/claims reais).

2. **Antes de promover qualquer otimização**: rode o MESMO deal com a mudança aplicada (nova análise), e pontue:
   ```
   node scripts/eval-score.mjs <candidate_analise_id> <slug>
   ```
   Imprime o relatório, salva em `eval/reports/`, e sai com código 0 (PASS) ou 1 (FAIL). FAIL = a otimização regrediu qualidade → não promover.

3. Combine com a observabilidade de custo (`docs/arquitetura/queries-custo.sql`): a regra de aprovação é **custo caiu E golden-set deu PASS**.

## Sinais capturados

Do banco, por `analise_id`: `analise_facts` (fatos + confidence + source), `agent_claims` (claims + fact_ids/benchmark_ids), `consistency_issues` (inconsistências determinísticas), `analises.coverage_check` (cobertura). Tudo read-only.

## Arquivos

- `scripts/eval-snapshot.mjs` — captura gabarito.
- `scripts/eval-score.mjs` — pontua candidate vs gabarito.
- `scripts/lib/goldenset.mjs` — lógica pura de scoring (sem dependências).
- `scripts/lib/eval-fetch.mjs` — leitura dos sinais no Supabase.
- `eval/goldenset/` — gabaritos versionados (commitados).
- `eval/reports/` — relatórios gerados (gitignored).
