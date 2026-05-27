// Risk engine determinístico (Fase 1, #8).
//
// O código aplica SCORECARDS / triggers quantitativos sobre os indicadores
// calculados (financial-engine). A IA (sentinela) deixa de "calcular risco" e
// passa a INTERPRETAR a combinação dos gatilhos em síndromes. Vantagem: o gatilho
// numérico é determinístico, auditável (regra + valor + limiar) e nunca alucina.
//
// Os limiares abaixo seguem convenção de análise de crédito middle-market. São
// ponto de partida calibrável; documentados com rationale para auditoria.
//
// Puro e testável. Sem LLM, sem I/O.

import type { ComputedMetric } from './financial-engine.ts'

export type Severity = 'critico' | 'alto' | 'medio'

export interface RiskTrigger {
  code:      string     // identificador estável (ex.: 'alavancagem_elevada')
  severity:  Severity
  label:     string
  metric:    string     // chave do indicador que disparou
  value:     number
  threshold: string     // limiar legível
  rationale: string
  periodo?:  number
}

interface Band { severity: Severity; threshold: string; code: string; label: string; rationale: string }

// Cada regra recebe o valor do indicador e devolve a pior banda atingida (ou null).
const RULES: Record<string, (v: number) => Band | null> = {
  alavancagem_liquida: (v) =>
    v > 5   ? { severity: 'critico', threshold: '> 5,0x', code: 'alavancagem_critica', label: 'Alavancagem crítica',
                rationale: 'Dívida líquida acima de 5x EBITDA: capacidade de pagamento severamente pressionada.' }
  : v > 3.5 ? { severity: 'alto',    threshold: '> 3,5x', code: 'alavancagem_elevada', label: 'Alavancagem elevada',
                rationale: 'Dívida líquida acima de 3,5x EBITDA: elevado para middle-market; pressiona serviço da dívida.' }
  : v > 2.5 ? { severity: 'medio',   threshold: '> 2,5x', code: 'alavancagem_moderada_alta', label: 'Alavancagem moderada-alta',
                rationale: 'Dívida líquida acima de 2,5x EBITDA: monitorar trajetória de desalavancagem.' }
  : null,

  margem_ebitda: (v) =>
    v < 5  ? { severity: 'alto',  threshold: '< 5%',  code: 'margem_ebitda_critica', label: 'Margem EBITDA muito baixa',
               rationale: 'Margem EBITDA abaixo de 5%: baixa geração operacional, pouco colchão para choques.' }
  : v < 12 ? { severity: 'medio', threshold: '< 12%', code: 'margem_ebitda_baixa', label: 'Margem EBITDA baixa',
               rationale: 'Margem EBITDA abaixo de 12%: rentabilidade operacional apertada para o porte.' }
  : null,

  margem_liquida: (v) =>
    v < 0 ? { severity: 'critico', threshold: '< 0', code: 'prejuizo_liquido', label: 'Prejuízo líquido',
              rationale: 'Resultado líquido negativo: a operação consome patrimônio no período.' }
  : v < 3 ? { severity: 'medio', threshold: '< 3%', code: 'margem_liquida_baixa', label: 'Margem líquida baixa',
              rationale: 'Margem líquida abaixo de 3%: resultado final frágil.' }
  : null,

  liquidez_corrente: (v) =>
    v < 1   ? { severity: 'alto',  threshold: '< 1,0x', code: 'liquidez_negativa', label: 'Liquidez corrente abaixo de 1',
                rationale: 'Passivo circulante maior que ativo circulante: risco de descasamento de curto prazo.' }
  : v < 1.2 ? { severity: 'medio', threshold: '< 1,2x', code: 'liquidez_apertada', label: 'Liquidez corrente apertada',
                rationale: 'Folga de liquidez de curto prazo reduzida.' }
  : null,

  capital_de_giro: (v) =>
    v < 0 ? { severity: 'alto', threshold: '< 0', code: 'capital_giro_negativo', label: 'Capital de giro negativo',
              rationale: 'Necessidade de capital de giro não coberta pelo ativo circulante.' }
  : null,

  cobertura_garantia: (v) =>
    v < 1   ? { severity: 'alto',  threshold: '< 1,0x', code: 'garantia_insuficiente', label: 'Garantia não cobre a operação',
                rationale: 'Valor da garantia inferior ao valor da operação: LTV acima de 100%.' }
  : v < 1.3 ? { severity: 'medio', threshold: '< 1,3x', code: 'garantia_justa', label: 'Cobertura de garantia justa',
                rationale: 'Margem de garantia sobre a operação reduzida (< 1,3x).' }
  : null,
}

// Deriva o conceito (sem sufixo de período) a partir da chave do indicador.
function conceptOf(m: ComputedMetric): string {
  return m.periodo ? m.key.replace(new RegExp(`_${m.periodo}$`), '') : m.key
}

export function evaluateRisk(metrics: ComputedMetric[]): RiskTrigger[] {
  const triggers: RiskTrigger[] = []
  for (const m of metrics) {
    const rule = RULES[conceptOf(m)]
    if (!rule) continue
    const band = rule(m.value)
    if (!band) continue
    triggers.push({
      code: band.code, severity: band.severity, label: band.label,
      metric: m.key, value: m.value, threshold: band.threshold,
      rationale: band.rationale, periodo: m.periodo,
    })
  }
  // Ordena por severidade (crítico primeiro).
  const rank: Record<Severity, number> = { critico: 0, alto: 1, medio: 2 }
  return triggers.sort((a, b) => rank[a.severity] - rank[b.severity])
}

// Vira fato 'risco_quantitativo' para o fact_bank (consumido pela sentinela/relatório).
export interface RiskFact {
  fact_type: 'risco_quantitativo'
  key:        string
  value:      { severity: Severity; label: string; metric: string; value: number; threshold: string; rationale: string; periodo?: number }
  status:     'consolidated'
  confidence: 1
  sources:    Array<{ doc_id: string; doc_name: string; page: number | null; quote: string }>
}
export function triggersToFacts(triggers: RiskTrigger[]): RiskFact[] {
  return triggers.map(t => ({
    fact_type: 'risco_quantitativo',
    key:        t.periodo ? `${t.code}_${t.periodo}` : t.code,
    value:      { severity: t.severity, label: t.label, metric: t.metric, value: t.value, threshold: t.threshold, rationale: t.rationale, periodo: t.periodo },
    status:     'consolidated',
    confidence: 1,
    sources:    [{ doc_id: 'risk_engine', doc_name: 'Risk Engine Mandor (scorecard determinístico)', page: null, quote: `${t.label}: ${t.metric}=${t.value} (${t.threshold})` }],
  }))
}
