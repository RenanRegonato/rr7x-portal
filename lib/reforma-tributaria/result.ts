// Contrato PURO do módulo Adequação à Reforma Tributária (Ferrante).
// Sem dependências de servidor (não importa callLLM/SDK) — pode ser usado tanto
// no agente (server) quanto na renderização (client component da análise).

export const FERRANTE = {
  key:  'reforma_tributaria',
  name: 'Ferrante',
  role: 'Auditor de Adequação à Reforma Tributária',
} as const

export type Severidade = 'critico' | 'alto' | 'medio' | 'baixo'

export interface RiscoFiscal {
  titulo:      string
  severidade:  Severidade
  descricao:   string
  fundamento?: string   // dispositivo/regra que embasa
}

export interface RecomendacaoTributaria {
  titulo:     string
  prioridade: Severidade
  acao:       string
}

export interface ChecklistItem {
  item:        string
  status:      'ok' | 'pendente' | 'nao_aplicavel'
  observacao?: string
}

/** Saída estruturada do Ferrante — alimenta score, mapa de risco, checklist e relatório. */
export interface FerranteResult {
  conformidade_score:        number   // 0-100
  resumo_executivo:          string
  riscos:                    RiscoFiscal[]
  impactos_operacionais:     string[]
  pontos_criticos_captacao:  string[]   // o que pode travar valuation / M&A / crédito
  oportunidades:             string[]
  recomendacoes:             RecomendacaoTributaria[]
  checklist_adequacao:       ChecklistItem[]
}

/** Insumos que o pipeline monta para o Ferrante. */
export interface FerranteInput {
  intakeResumo:       string
  factBank:           string
  outputsRelevantes:  string   // diagnostico/estruturacao já gerados
  baseRegras:         string   // (reservado; a base v1 é injetada no system prompt)
}

/** Nota exibida na UI quando o módulo foi ativado mas ainda não há output. */
export const FERRANTE_PENDING_NOTE =
  'Módulo ativado. O diagnóstico de adequação tributária será gerado ao rodar a análise.'

/**
 * Parser tolerante da saída JSON do agente. Retorna null se a estrutura mínima
 * (conformidade_score) não estiver presente.
 */
export function parseFerranteResult(raw: string): FerranteResult | null {
  try {
    const match = raw.match(/\{[\s\S]*\}/)
    if (!match) return null
    const obj = JSON.parse(match[0]) as Partial<FerranteResult>
    if (typeof obj.conformidade_score !== 'number') return null
    return {
      conformidade_score:       obj.conformidade_score,
      resumo_executivo:         obj.resumo_executivo ?? '',
      riscos:                   Array.isArray(obj.riscos) ? obj.riscos : [],
      impactos_operacionais:    Array.isArray(obj.impactos_operacionais) ? obj.impactos_operacionais : [],
      pontos_criticos_captacao: Array.isArray(obj.pontos_criticos_captacao) ? obj.pontos_criticos_captacao : [],
      oportunidades:            Array.isArray(obj.oportunidades) ? obj.oportunidades : [],
      recomendacoes:            Array.isArray(obj.recomendacoes) ? obj.recomendacoes : [],
      checklist_adequacao:      Array.isArray(obj.checklist_adequacao) ? obj.checklist_adequacao : [],
    }
  } catch {
    return null
  }
}
