-- Queries de observabilidade de custo de LLM (Fase 0).
-- Rodar no SQL editor do Supabase depois que a migration 20260526_llm_usage_log.sql
-- estiver aplicada e algumas análises tiverem rodado.
-- Objetivo: descobrir ONDE o custo realmente está antes de otimizar.

-- 1) Custo total e por subsistema nos últimos 30 dias
SELECT
  context,
  count(*)                         AS chamadas,
  sum(input_tokens)                AS in_tokens,
  sum(output_tokens)               AS out_tokens,
  sum(cache_read_tokens)           AS cache_read,
  round(sum(cost_usd), 2)          AS custo_usd
FROM public.llm_usage_log
WHERE criado_em > now() - interval '30 days'
GROUP BY context
ORDER BY custo_usd DESC NULLS LAST;

-- 2) Custo por step/agente (quem come o orçamento) — o ranking que decide prioridade
SELECT
  context,
  step,
  model,
  count(*)                                       AS chamadas,
  round(avg(input_tokens))                       AS in_medio,
  round(avg(output_tokens))                      AS out_medio,
  round(sum(cost_usd), 2)                         AS custo_total_usd,
  round(sum(cost_usd) / nullif(count(DISTINCT analise_id), 0), 4) AS custo_por_analise
FROM public.llm_usage_log
WHERE criado_em > now() - interval '30 days'
GROUP BY context, step, model
ORDER BY custo_total_usd DESC NULLS LAST;

-- 3) Cache-hit por step (decisivo para troca de provider: step com cache alto
--    pode ficar MAIS caro fora da Anthropic). hit_ratio perto de 1 = muito cache.
SELECT
  step,
  model,
  sum(cache_read_tokens)                                                          AS cache_read,
  sum(cache_write_tokens)                                                         AS cache_write,
  sum(input_tokens)                                                               AS in_nao_cacheado,
  round(
    sum(cache_read_tokens)::numeric
    / nullif(sum(cache_read_tokens + cache_write_tokens + input_tokens), 0), 3
  )                                                                               AS cache_hit_ratio
FROM public.llm_usage_log
WHERE criado_em > now() - interval '30 days'
GROUP BY step, model
ORDER BY cache_hit_ratio DESC NULLS LAST;

-- 4) Custo de uma análise específica (cole o uuid)
SELECT step, model, input_tokens, output_tokens, cache_read_tokens, cost_usd, latency_ms, criado_em
FROM public.llm_usage_log
WHERE analise_id = '00000000-0000-0000-0000-000000000000'
ORDER BY criado_em;

-- 5) Custo médio por análise completa (só pipeline + ingestão, exclui invest-match)
SELECT
  round(avg(custo_analise), 4) AS custo_medio_usd,
  round(max(custo_analise), 4) AS custo_max_usd,
  count(*)                     AS analises
FROM (
  SELECT analise_id, sum(cost_usd) AS custo_analise
  FROM public.llm_usage_log
  WHERE analise_id IS NOT NULL
    AND context IN ('analise_pipeline', 'ingestion', 'validators')
  GROUP BY analise_id
) t;
