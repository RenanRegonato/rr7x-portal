import { createAdminClient } from '@/lib/supabase-server'
import { computeCostUsd, type TokenUsage } from '@/lib/llm/pricing'

// Observabilidade de custo de LLM (Fase 0).
//
// Regra de ouro: logging JAMAIS pode quebrar o pipeline. Toda esta função é
// best-effort — engole qualquer erro (inclusive "tabela não existe", caso a
// migration 20260526_llm_usage_log.sql ainda não tenha sido aplicada em prod).

export type LlmContext = 'analise_pipeline' | 'ingestion' | 'validators' | 'invest_match'

export interface LlmUsageParams {
  analiseId?:  string | null
  context:     LlmContext
  step:        string
  model:       string
  provider?:   string          // default 'anthropic'
  usage:       TokenUsage | null | undefined
  latencyMs?:  number | null
  thinking?:   boolean
  meta?:       Record<string, unknown> | null
}

export async function logLlmUsage(params: LlmUsageParams): Promise<void> {
  try {
    const admin = createAdminClient()
    const u = params.usage ?? {}
    await admin.from('llm_usage_log').insert({
      analise_id:         params.analiseId ?? null,
      context:            params.context,
      step:               params.step,
      provider:           params.provider ?? 'anthropic',
      model:              params.model,
      input_tokens:       u.input_tokens                ?? 0,
      output_tokens:      u.output_tokens               ?? 0,
      cache_write_tokens: u.cache_creation_input_tokens ?? 0,
      cache_read_tokens:  u.cache_read_input_tokens     ?? 0,
      cost_usd:           computeCostUsd(params.model, u),
      latency_ms:         params.latencyMs ?? null,
      thinking:           params.thinking ?? false,
      meta:               params.meta ?? null,
    })
  } catch (e) {
    console.error('[logLlmUsage]', e)
  }
}
