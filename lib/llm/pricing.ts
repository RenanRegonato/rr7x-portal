// Preços de modelos de LLM, em USD por 1.000.000 (1M) de tokens.
//
// Valores conferidos em 2026-05-26 contra a pricing oficial da Anthropic
// (claude.com/pricing). Reconferir periodicamente. O custo é calculado e
// PERSISTIDO no momento da chamada (lib/llm/usage-logger.ts), então alterar
// aqui só afeta chamadas futuras: o histórico mantém o preço da época.
//
// Lever futuro: a Batch API da Anthropic dá 50% de desconto em trabalho
// assíncrono. A ingestão (chunk_fact_extract, consolidate_fact_bank) já roda
// async via Inngest e é candidata natural a batch sem perda de qualidade.
//
// Convenções da Anthropic sobre prompt caching:
//   - input_tokens NÃO inclui tokens de cache (cache é cobrado à parte).
//   - cache_read  ≈ 0,1x do input (10%).
//   - cache_write ≈ 1,25x (TTL 5min) ou 2x (TTL 1h) do input.
//     O pipeline usa cache ephemeral de 1h, então cacheWrite = 2x input.

export interface ModelPricing {
  input:      number  // USD / 1M tokens
  output:     number
  cacheWrite: number
  cacheRead:  number
}

export const PRICING: Record<string, ModelPricing> = {
  // Sonnet 4.6 — raciocínio profundo (agentes principais, mesa, sentinela, relatório).
  'claude-sonnet-4-6': {
    input:      3,
    output:     15,
    cacheWrite: 6,     // 2x input (TTL 1h)
    cacheRead:  0.30,  // 0.1x input
  },
  // Haiku 4.5 — tarefas estruturadas (extração, validação, classificação).
  'claude-haiku-4-5-20251001': {
    input:      1,
    output:     5,
    cacheWrite: 2,     // 2x input (TTL 1h)
    cacheRead:  0.10,  // 0.1x input
  },
}

export interface TokenUsage {
  input_tokens?:                 number | null
  output_tokens?:                number | null
  cache_creation_input_tokens?:  number | null
  cache_read_input_tokens?:      number | null
}

// Retorna o custo em USD de uma chamada, ou null se o modelo não tiver preço
// cadastrado (caller ainda registra os tokens, só fica sem cost_usd).
export function computeCostUsd(model: string, u: TokenUsage | null | undefined): number | null {
  const p = PRICING[model]
  if (!p || !u) return null
  const input  = u.input_tokens                ?? 0
  const output = u.output_tokens               ?? 0
  const cWrite = u.cache_creation_input_tokens ?? 0
  const cRead  = u.cache_read_input_tokens     ?? 0
  const cost =
    (input * p.input + output * p.output + cWrite * p.cacheWrite + cRead * p.cacheRead) / 1_000_000
  // Arredonda para 6 casas (precisão da coluna numeric(12,6)).
  return Math.round(cost * 1e6) / 1e6
}
