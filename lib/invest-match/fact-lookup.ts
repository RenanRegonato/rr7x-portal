// Helpers para consultar fact_bank consolidado.
// O fact_bank é um array plano de ConsolidatedFact. Estas funções dão
// uma camada tipada por cima pra evitar repetir o filter+JSON.parse em
// todo lugar que precisar de um número específico.

import type { FactBank, ConsolidatedFact } from './mandor-mapping'

/** Retorna o primeiro fact que bate (fact_type, key). */
export function getFact(
  bank: FactBank | null | undefined,
  fact_type: string,
  key: string,
): ConsolidatedFact | null {
  if (!bank?.facts) return null
  return bank.facts.find(f => f.fact_type === fact_type && f.key === key) ?? null
}

/** Retorna TODOS os facts de um tipo. */
export function getFactsByType(
  bank: FactBank | null | undefined,
  fact_type: string,
): ConsolidatedFact[] {
  if (!bank?.facts) return []
  return bank.facts.filter(f => f.fact_type === fact_type)
}

/** Verifica se há fact desse tipo (útil pra deduzir presença de docs). */
export function hasFact(
  bank: FactBank | null | undefined,
  fact_type: string,
  keyPattern?: string | RegExp,
): boolean {
  if (!bank?.facts) return false
  return bank.facts.some(f => {
    if (f.fact_type !== fact_type) return false
    if (!keyPattern) return true
    if (typeof keyPattern === 'string') return f.key.includes(keyPattern)
    return keyPattern.test(f.key)
  })
}

// ============================================================
// Extratores numéricos (numero_financeiro)
// ============================================================
// Convenção das keys do fact-extractor: '<metrica>_<ano>'
//   ex: 'receita_2024', 'ebitda_2024', 'dre_2023', 'patrimonio_liquido_2024'
// value típico: { amount: number, unit: 'BRL', periodo: string, descricao?: string }

interface NumericValue {
  amount?:   number
  unit?:     string
  periodo?:  string
  descricao?: string
}

function isNumericValue(v: unknown): v is NumericValue {
  return !!v && typeof v === 'object' && typeof (v as NumericValue).amount === 'number'
}

/**
 * Pega o valor numérico mais recente de uma métrica financeira.
 * Procura facts com fact_type='numero_financeiro' e key começando com `metric`.
 * Ordena por ano descendente (extraído da key) e retorna o primeiro.
 *
 * Ex: getLatestFinancialAmount(bank, 'receita') → 12500000 (de 'receita_2024').
 */
export function getLatestFinancialAmount(
  bank: FactBank | null | undefined,
  metric: string,
): { amount: number; periodo: string; confidence: number } | null {
  const facts = getFactsByType(bank, 'numero_financeiro')
    .filter(f => f.key.startsWith(metric))
    .filter(f => isNumericValue(f.value))

  if (facts.length === 0) return null

  // Ordena por ano extraído do final da key (ex: 'ebitda_2024' → 2024)
  const withYear = facts.map(f => {
    const m = f.key.match(/(\d{4})$/)
    return { fact: f, ano: m ? parseInt(m[1], 10) : 0 }
  })
  withYear.sort((a, b) => b.ano - a.ano)

  const winner = withYear[0]
  const value = winner.fact.value as NumericValue
  return {
    amount:     value.amount ?? 0,
    periodo:    value.periodo ?? String(winner.ano || 'desconhecido'),
    confidence: winner.fact.confidence,
  }
}

/**
 * Crescimento YoY de uma métrica, comparando o ano mais recente com o anterior.
 * Retorna null se não houver dois anos disponíveis.
 */
export function getGrowthYoY(
  bank: FactBank | null | undefined,
  metric: string,
): { yoy_pct: number; ano_atual: number; ano_anterior: number } | null {
  const facts = getFactsByType(bank, 'numero_financeiro')
    .filter(f => f.key.startsWith(metric))
    .filter(f => isNumericValue(f.value))

  const withYear = facts
    .map(f => {
      const m = f.key.match(/(\d{4})$/)
      return { fact: f, ano: m ? parseInt(m[1], 10) : 0 }
    })
    .filter(x => x.ano > 0)
    .sort((a, b) => b.ano - a.ano)

  if (withYear.length < 2) return null

  const atual    = withYear[0]
  const anterior = withYear[1]
  const amountAtual    = (atual.fact.value as NumericValue).amount ?? 0
  const amountAnterior = (anterior.fact.value as NumericValue).amount ?? 0
  if (amountAnterior === 0) return null

  return {
    yoy_pct:      ((amountAtual - amountAnterior) / amountAnterior) * 100,
    ano_atual:    atual.ano,
    ano_anterior: anterior.ano,
  }
}

// ============================================================
// Heurísticas booleanas
// ============================================================

/** Há indicação de balanço auditado nos documentos disponíveis? */
export function hasAuditedFinancials(bank: FactBank | null | undefined): boolean {
  const docs = getFactsByType(bank, 'documento_disponivel')
  return docs.some(f => {
    const key = f.key.toLowerCase()
    if (key.includes('auditad') || key.includes('audit')) return true
    const v = f.value as Record<string, unknown>
    if (typeof v?.tipo_documento === 'string' && /audit/i.test(v.tipo_documento)) return true
    if (typeof v?.descricao === 'string' && /audit/i.test(v.descricao)) return true
    return false
  })
}

/**
 * Cobertura documental aproximada (0-100). Razão entre docs presentes
 * (documento_disponivel com disponivel=true) e (presentes + lacunas).
 * Útil quando coverage_check ainda não rodou.
 */
export function approximateDocumentationCoverage(bank: FactBank | null | undefined): number | null {
  if (!bank?.facts || bank.facts.length === 0) return null
  const docsPresentes = getFactsByType(bank, 'documento_disponivel').filter(f => {
    const v = f.value as Record<string, unknown>
    return v?.disponivel !== false
  }).length
  const lacunas = getFactsByType(bank, 'lacuna').length
  const total   = docsPresentes + lacunas
  if (total === 0) return null
  return Math.round((docsPresentes / total) * 100)
}

// ============================================================
// Resumo compacto pra prompt do LLM
// ============================================================
// Quando passamos fact_bank pra LLM, não precisamos enviar sources/quotes —
// só o sinal estruturado. Esta função gera Markdown enxuto agrupado por tipo,
// com truncamento por tipo (limita explosão de prompt em deals grandes).

const MAX_FACTS_PER_TYPE_IN_PROMPT = 25

export function formatFactBankCompact(bank: FactBank | null | undefined): string {
  if (!bank?.facts || bank.facts.length === 0) return '(fact_bank vazio)'

  const byType: Record<string, ConsolidatedFact[]> = {}
  for (const f of bank.facts) (byType[f.fact_type] ??= []).push(f)

  const lines: string[] = []
  for (const [type, list] of Object.entries(byType)) {
    const limited = list.slice(0, MAX_FACTS_PER_TYPE_IN_PROMPT)
    lines.push(`### ${type} (${list.length})`)
    for (const f of limited) {
      const conflict = f.status === 'conflict' ? ' ⚠️' : ''
      const conf     = Math.round(f.confidence * 100)
      lines.push(`- **${f.key}**${conflict} (${conf}%): ${JSON.stringify(f.value)}`)
    }
    if (list.length > limited.length) {
      lines.push(`- _(${list.length - limited.length} adicionais omitidos)_`)
    }
    lines.push('')
  }
  return lines.join('\n')
}
