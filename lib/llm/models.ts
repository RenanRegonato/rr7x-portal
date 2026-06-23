// Registro ÚNICO de roteamento de modelo por task/agente (Fase 0.2).
//
// Antes, os model IDs viviam hardcoded e espalhados em 8+ arquivos. Aqui passa a
// ser a fonte da verdade: qual provider + modelo cada etapa usa. Trocar o modelo
// (ou, no futuro, o provider) de uma etapa = mudar UMA linha aqui.
//
// Roadmap: ler este mapa de uma tabela (agent_prompts / llm_routing) para trocar
// modelo sem deploy e permitir A/B por escritório. Hoje é estático e o
// comportamento é IDÊNTICO ao anterior (mesmos modelos por etapa).

export type Provider = 'anthropic'

export interface ModelChoice {
  provider:        Provider
  model:           string
  thinkingBudget?: number   // se definido, a etapa pode usar extended thinking
}

// IDs base centralizados (verificados em 2026-05-26).
export const MODELS = {
  sonnet: 'claude-sonnet-4-6',
  haiku:  'claude-haiku-4-5-20251001',
} as const

const sonnet = (thinkingBudget?: number): ModelChoice => ({ provider: 'anthropic', model: MODELS.sonnet, thinkingBudget })
const haiku  = (): ModelChoice => ({ provider: 'anthropic', model: MODELS.haiku })

// Espelha EXATAMENTE o roteamento atual:
//   - Haiku: orchestration, blind_teaser, + auxiliares estruturados.
//   - Sonnet: raciocínio profundo. Thinking 8k: diagnostico, analise_ma, estruturacao.
export const ROUTING: Record<string, ModelChoice> = {
  // ── pipeline (steps streaming no route) ──
  drive_intake:          sonnet(),
  orchestration:         haiku(),
  pesquisa:              sonnet(),
  diagnostico:           sonnet(8000),
  kyc:                   sonnet(),
  contratos:             sonnet(),
  analise_ma:            sonnet(8000),
  originacao:            sonnet(),
  estruturacao:          sonnet(8000),
  maturidade:            sonnet(),
  blind_teaser:          haiku(),
  sell_side_pitchbook:   sonnet(),
  relatorio_consolidado: sonnet(),

  // ── Adequação à Reforma Tributária (Ferrante) — premium, opt-in ──
  // Raciocínio jurídico-tributário complexo → Sonnet com thinking. O prompt
  // analítico e a base de regras (PDF) entram na Fase 2.
  reforma_tributaria:    sonnet(8000),

  // ── ingestão (non-streaming) ──
  chunk_fact_extract:    haiku(),
  chunk_categorizer:     haiku(),  // categoriza chunks em domínios (financeiro, jurídico, etc)
  consolidate_fact_bank: sonnet(),

  // ── validadores (non-streaming) ──
  coverage_check:        haiku(),
  risk_correlation:      sonnet(),
  mesa_revisao:          sonnet(),
  fact_extract_post:     haiku(),
  revisor_regeneracao:   haiku(),
  cascade_detect:        haiku(),

  // ── invest-match (ainda não migrado, registrado para completude) ──
  thesis_builder:        sonnet(),
  match_judge:           sonnet(),
}

export function routeFor(task: string): ModelChoice {
  return ROUTING[task] ?? sonnet()
}
