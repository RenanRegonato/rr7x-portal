// Contrato PURO do módulo Adequação à CVM 175/22 (Elegibilidade de CRI/CRA).
// Sem dependências de servidor — pode ser usado em agente e client components.

export const CVM_175_22 = {
  key:  'cvm_175_22',
  name: 'Validador CVM 175/22',
  role: 'Especialista em Elegibilidade de CRI/CRA (CVM 175/22 e Res. CVM 19)',
} as const

export type Severidade = 'critico' | 'alto' | 'medio' | 'baixo'

export interface ChecklistItem {
  item:        string
  status:      'ok' | 'pendente' | 'nao_aplicavel' | 'falha'
  severidade?: Severidade
  observacao?: string
}

export interface AcessibilidadeInvestidor {
  restricoes:  string[]        // ex.: "ICVM 476: máx 75 profissionais"
  requisitos:  string[]        // ex.: "Rating obrigatório (ICVM 400)"
}

export interface RiscoElegibilidade {
  titulo:      string
  severidade:  Severidade
  descricao:   string
  condicao:    string          // ex.: "Concentração > 20%"
  remediacao?: string          // como resolver
}

/** Saída estruturada do Validador CVM 175/22. */
export interface CVMResult {
  elegibilidade_score:      number                    // 0-100: quanto mais alto, mais elegível
  resumo_executivo:         string                    // parecer de conformidade
  tipo_estrutura:           'cri' | 'cra' | 'ambos'
  riscos_elegibilidade:     RiscoElegibilidade[]
  checklist_conformidade:   ChecklistItem[]
  acessibilidade_investidor: AcessibilidadeInvestidor
  recomendacoes:            string[]
  bloqueios:                string[]                  // alterações CRÍTICAS exigidas antes de prosseguir
}

/** Insumos para o Validador. */
export interface CVMInput {
  intakeResumo:       string
  nomeAtivo:          string
  tipoAtivo:          string
  tipoOferta?:        string                        // icvm_400 | icvm_476
  categoriaCri?:      string                        // residencial | corporativo | hibrido
  concentracaoCri?:   string                        // pulverizado | concentrado
  segmentoCri?:       string
  cedenteCotistaSubordinado?: string                // sim | nao
  estruturaCotas?:    string                        // legado: string livre
  cotaSeniorPct?:     number                        // % sênior (soma com mez+sub deve ser 100)
  cotaMezaninoPct?:   number                        // % mezanino
  cotaSubordinadaPct?: number                       // % subordinada
  revolvenciaCra?:    string                        // com_revolvencia | sem_revolvencia
  atividadeDevedor?:  string
  segmentoCra?:       string
}

export const CVM_175_22_PENDING_NOTE =
  'Módulo CVM 175/22 ativado. A validação de elegibilidade será gerada ao rodar a análise.'

/**
 * Parser tolerante da saída JSON. Retorna null se elegibilidade_score não estiver.
 */
export function parseCVMResult(raw: string): CVMResult | null {
  try {
    const match = raw.match(/\{[\s\S]*\}/)
    if (!match) return null
    const obj = JSON.parse(match[0]) as Partial<CVMResult>
    if (typeof obj.elegibilidade_score !== 'number') return null
    return {
      elegibilidade_score:       obj.elegibilidade_score,
      resumo_executivo:          obj.resumo_executivo ?? '',
      tipo_estrutura:            obj.tipo_estrutura ?? 'ambos',
      riscos_elegibilidade:      Array.isArray(obj.riscos_elegibilidade) ? obj.riscos_elegibilidade : [],
      checklist_conformidade:    Array.isArray(obj.checklist_conformidade) ? obj.checklist_conformidade : [],
      acessibilidade_investidor: obj.acessibilidade_investidor ?? { restricoes: [], requisitos: [] },
      recomendacoes:             Array.isArray(obj.recomendacoes) ? obj.recomendacoes : [],
      bloqueios:                 Array.isArray(obj.bloqueios) ? obj.bloqueios : [],
    }
  } catch {
    return null
  }
}
