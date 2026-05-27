// Engine financeiro determinístico (Fase 1, #8 / doc 4.5).
//
// Calcula indicadores de crédito/M&A POR FÓRMULA a partir dos fatos numéricos
// já extraídos (fact_bank). A IA não recalcula: recebe o número pronto, o que
// elimina erro aritmético e "número alucinado", e é auditável (a fonte é a
// fórmula + os fatos de insumo). Defensivo: só emite um indicador quando os
// insumos existem e fazem sentido (denominador > 0).
//
// Puro e testável (financial-engine.test via scripts). Sem LLM, sem I/O.

export interface NumericFact { key: string; amount: number; periodo?: number; unit?: string }

// Aceita tanto o shape do fact_bank consolidado ({ key, value:{amount,periodo}, fact_type })
// quanto already-normalized. Extrai os fatos numéricos utilizáveis.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function toNumericFacts(facts: any[]): NumericFact[] {
  const out: NumericFact[] = []
  for (const f of facts ?? []) {
    if (f?.fact_type && f.fact_type !== 'numero_financeiro') continue
    const v = typeof f?.value === 'string' ? safeParse(f.value) : f?.value
    const amount = typeof v?.amount === 'number' ? v.amount : (typeof f?.amount === 'number' ? f.amount : null)
    if (amount === null) continue
    // periodo pode vir como número (extrator determinístico) ou string "2024"
    // (consolidador Haiku) — normaliza pra número p/ agrupar consistentemente.
    const rawP = v?.periodo ?? f?.periodo
    let periodo: number | undefined
    if (typeof rawP === 'number') periodo = rawP
    else if (typeof rawP === 'string') { const n = parseInt(rawP, 10); if (Number.isFinite(n) && n > 1900 && n < 2100) periodo = n }
    out.push({ key: String(f.key ?? ''), amount, periodo, unit: v?.unit ?? f?.unit })
  }
  return out
}

function safeParse(s: string): Record<string, unknown> | null {
  try { return JSON.parse(s) } catch { return null }
}

// Conceitos → regex sobre a chave do fato. Específico antes do genérico.
const CONCEPTS: Record<string, RegExp> = {
  ebitda:             /ebitda/i,
  receita:            /receita_l[ií]quida|receita_bruta|faturamento|receita/i,
  lucro_liquido:      /lucro_l[ií]quido/i,
  divida_liquida:     /d[ií]vida_l[ií]quida/i,
  divida_bruta:       /d[ií]vida_bruta|endividamento/i,
  patrimonio_liquido: /patrim[oô]nio_l[ií]quido/i,
  ativo_circulante:   /ativo_circulante/i,
  passivo_circulante: /passivo_circulante/i,
  valor_operacao:     /valor_opera[çc][ãa]o|capta[çc][ãa]o|montante/i,
  valor_garantia:     /garantia|colateral/i,
}

// Acha o valor de um conceito para um período (ou sem período).
function amountOf(facts: NumericFact[], concept: string, periodo?: number): number | null {
  const re = CONCEPTS[concept]
  if (!re) return null
  const matches = facts.filter(f => re.test(f.key))
  if (matches.length === 0) return null
  // prioridade: período exato > sem período > qualquer
  const exact = matches.find(f => f.periodo === periodo)
  if (exact) return exact.amount
  const noPeriod = matches.find(f => f.periodo == null)
  if (noPeriod) return noPeriod.amount
  return matches[0].amount
}

export interface ComputedMetric {
  key:     string
  value:   number
  unit:    'x' | '%' | 'BRL'
  formula: string
  inputs:  string[]
  periodo?: number
}

const r2 = (n: number) => Math.round(n * 100) / 100
const r1 = (n: number) => Math.round(n * 10) / 10

// Calcula os indicadores para cada período presente (e um cálculo sem período).
export function computeFinancials(rawFacts: unknown[]): ComputedMetric[] {
  const facts = toNumericFacts(rawFacts as never[])
  if (facts.length === 0) return []

  const periodos = Array.from(new Set(facts.map(f => f.periodo).filter((p): p is number => p != null)))
  const buckets: (number | undefined)[] = periodos.length ? periodos : [undefined]

  const out: ComputedMetric[] = []
  const seen = new Set<string>()
  const push = (m: ComputedMetric) => {
    const id = `${m.key}:${m.periodo ?? ''}`
    if (seen.has(id)) return
    seen.add(id); out.push(m)
  }

  for (const p of buckets) {
    const ebitda    = amountOf(facts, 'ebitda', p)
    const receita   = amountOf(facts, 'receita', p)
    const lucro     = amountOf(facts, 'lucro_liquido', p)
    const dLiq      = amountOf(facts, 'divida_liquida', p)
    const dBruta    = amountOf(facts, 'divida_bruta', p)
    const ativoC    = amountOf(facts, 'ativo_circulante', p)
    const passivoC  = amountOf(facts, 'passivo_circulante', p)
    const garantia  = amountOf(facts, 'valor_garantia', p)
    const operacao  = amountOf(facts, 'valor_operacao', p)
    const sfx = p ? `_${p}` : ''

    if (dLiq != null && ebitda != null && ebitda > 0)
      push({ key: `alavancagem_liquida${sfx}`, value: r2(dLiq / ebitda), unit: 'x',
             formula: 'dívida líquida ÷ EBITDA', inputs: ['divida_liquida', 'ebitda'], periodo: p })

    if (dBruta != null && ebitda != null && ebitda > 0)
      push({ key: `alavancagem_bruta${sfx}`, value: r2(dBruta / ebitda), unit: 'x',
             formula: 'dívida bruta ÷ EBITDA', inputs: ['divida_bruta', 'ebitda'], periodo: p })

    if (ebitda != null && receita != null && receita > 0)
      push({ key: `margem_ebitda${sfx}`, value: r1((ebitda / receita) * 100), unit: '%',
             formula: 'EBITDA ÷ receita × 100', inputs: ['ebitda', 'receita'], periodo: p })

    if (lucro != null && receita != null && receita > 0)
      push({ key: `margem_liquida${sfx}`, value: r1((lucro / receita) * 100), unit: '%',
             formula: 'lucro líquido ÷ receita × 100', inputs: ['lucro_liquido', 'receita'], periodo: p })

    if (ativoC != null && passivoC != null && passivoC > 0)
      push({ key: `liquidez_corrente${sfx}`, value: r2(ativoC / passivoC), unit: 'x',
             formula: 'ativo circulante ÷ passivo circulante', inputs: ['ativo_circulante', 'passivo_circulante'], periodo: p })

    if (ativoC != null && passivoC != null)
      push({ key: `capital_de_giro${sfx}`, value: ativoC - passivoC, unit: 'BRL',
             formula: 'ativo circulante − passivo circulante', inputs: ['ativo_circulante', 'passivo_circulante'], periodo: p })

    if (garantia != null && operacao != null && operacao > 0)
      push({ key: `cobertura_garantia${sfx}`, value: r2(garantia / operacao), unit: 'x',
             formula: 'valor da garantia ÷ valor da operação', inputs: ['valor_garantia', 'valor_operacao'], periodo: p })
  }

  return out
}

// Converte indicadores em fatos (fact_type 'indicador_calculado') para persistir
// junto dos demais, quando integrarmos no pipeline.
export interface CalcFact {
  fact_type: 'indicador_calculado'
  fact_key: string
  fact_value: string
  source_quote: string
  source_page: null
  confidence: 1
}
export function metricsToFacts(metrics: ComputedMetric[]): CalcFact[] {
  return metrics.map(m => ({
    fact_type: 'indicador_calculado',
    fact_key: m.key,
    fact_value: JSON.stringify({ value: m.value, unit: m.unit, periodo: m.periodo, formula: m.formula, inputs: m.inputs }),
    source_quote: `Calculado: ${m.formula} (insumos: ${m.inputs.join(', ')})`,
    source_page: null,
    confidence: 1,
  }))
}

// Shape do fact_bank consolidado (analises.fact_bank.facts) — para anexar os
// indicadores calculados junto dos fatos consolidados.
export interface ConsolidatedCalcFact {
  fact_type: 'indicador_calculado'
  key:        string
  value:      { value: number; unit: string; periodo?: number; formula: string; inputs: string[] }
  status:     'consolidated'
  confidence: 1
  sources:    Array<{ doc_id: string; doc_name: string; page: number | null; quote: string }>
}
export function metricsToConsolidatedFacts(metrics: ComputedMetric[]): ConsolidatedCalcFact[] {
  return metrics.map(m => ({
    fact_type: 'indicador_calculado',
    key:        m.key,
    value:      { value: m.value, unit: m.unit, periodo: m.periodo, formula: m.formula, inputs: m.inputs },
    status:     'consolidated',
    confidence: 1,
    sources:    [{ doc_id: 'engine_financeiro', doc_name: 'Engine Financeiro Mandor (cálculo determinístico)', page: null, quote: m.formula }],
  }))
}
