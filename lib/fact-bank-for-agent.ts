// Decide qual subset do fact_bank cada agente downstream recebe no prompt.
//
// Motivação: fact_bank pode crescer pra >300 facts em deals grandes. Passar tudo
// pra cada agente queima tokens em facts irrelevantes (ex.: numero_financeiro
// não importa pra agente kyc). Filtramos por fact_type baseado no papel do agente.
//
// Trade-off: filtragem por tipo é rule-based (não LLM nem semantic). Se um agente
// precisar de fact de outro tipo, isso vira gap. A regra inicial mira o caso comum;
// expandir conforme observar lacunas.

interface FactBank {
  facts?: unknown[]
  stats?: unknown
  consolidation_model?: string
}

interface ConsolidatedFact {
  fact_type:    string
  key:          string
  value:        unknown
  status?:      string
  confidence:   number
  sources?:     unknown[]
  conflicting_values?: unknown[]
}

/** Tipos de fato relevantes por agente do pipeline. */
const RELEVANT_TYPES: Record<string, ReadonlyArray<string>> = {
  // drive_intake: precisa do panorama completo (vai gerar o diagnóstico inicial)
  drive_intake:         ['*'],

  // orchestration: planeja o DRS — precisa visão ampla mas compacta
  orchestration:        ['*'],

  // Wave 1
  pesquisa:             ['evento_relevante', 'estrutura_societaria', 'numero_financeiro', 'indicador_calculado'],
  diagnostico:          ['numero_financeiro', 'passivo', 'evento_relevante', 'lacuna', 'indicador_calculado', 'risco_quantitativo'],
  kyc:                  ['estrutura_societaria', 'evento_relevante', 'passivo', 'documento_disponivel'],
  contratos:            ['contrato', 'garantia', 'evento_relevante'],

  // Wave 2 — núcleo analítico, recebe TUDO (importante pra valuation/estruturação)
  analise_ma:           ['*'],
  estruturacao:         ['*'],
  originacao:           ['numero_financeiro', 'estrutura_societaria', 'evento_relevante', 'contrato', 'indicador_calculado', 'risco_quantitativo'],

  // Síntese
  maturidade:           ['*'],
  revisao:              ['*'],

  // Auxiliares
  sentinela:            ['*'],
  mesa_consolidadora:   ['*'],
  coverage_validator:   ['*'],

  // Documentos de captação
  blind_teaser:         ['numero_financeiro', 'estrutura_societaria', 'evento_relevante', 'indicador_calculado'],
  sell_side_pitchbook:  ['*'],
  relatorio_consolidado:['*'],
}

/** Limite máximo de facts no contexto, ordenados por confidence desc. */
const MAX_FACTS_PER_AGENT = 150

/**
 * Retorna o fact_bank filtrado pro agente. Quando não há filtro (`*` ou agente
 * desconhecido), retorna fact_bank completo (até MAX_FACTS_PER_AGENT por safety).
 */
export function getFactBankForAgent(
  factBank: FactBank | null | undefined,
  agentKey: string,
): FactBank | null {
  if (!factBank) return null
  const facts = Array.isArray(factBank.facts) ? (factBank.facts as ConsolidatedFact[]) : []
  if (facts.length === 0) return factBank

  const relevant = RELEVANT_TYPES[agentKey] ?? ['*']
  const allowAll = relevant.includes('*')

  // Filtra por tipo (se não for *), depois ordena por confidence (desc), limita.
  const filtered = allowAll ? facts : facts.filter(f => relevant.includes(f.fact_type))
  const sorted   = [...filtered].sort((a, b) => (b.confidence ?? 0) - (a.confidence ?? 0))
  const limited  = sorted.slice(0, MAX_FACTS_PER_AGENT)

  return {
    ...factBank,
    facts: limited,
    stats: {
      ...(typeof factBank.stats === 'object' && factBank.stats !== null ? factBank.stats : {}),
      filtered_for_agent: agentKey,
      facts_in_context:   limited.length,
      facts_total:        facts.length,
    },
  }
}

/** Formata o fact_bank filtrado pra injeção em prompt (Markdown agrupado por tipo). */
export function formatFactBankForPrompt(factBank: FactBank | null): string {
  if (!factBank || !Array.isArray(factBank.facts) || factBank.facts.length === 0) {
    return ''
  }

  const facts = factBank.facts as ConsolidatedFact[]
  const grouped: Record<string, ConsolidatedFact[]> = {}
  for (const f of facts) (grouped[f.fact_type] ??= []).push(f)

  const sections = Object.entries(grouped).map(([type, list]) => {
    const lines = list.map(f => {
      const value = JSON.stringify(f.value)
      const conf  = (f.confidence * 100).toFixed(0)
      const conflict = f.status === 'conflict' ? ' ⚠️CONFLITO' : ''
      return `- **${f.key}** (${conf}% confidence${conflict}): ${value}`
    })
    return `### ${type} (${list.length})\n${lines.join('\n')}`
  })

  return `## FACT_BANK CONSOLIDADO (extraído de todos os documentos do deal)\n\n${sections.join('\n\n')}`
}
