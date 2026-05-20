// Pesos canônicos das 10 dimensões do score estruturado (Camada 2).
//
// IMPORTANTE: estes valores ESPELHAM os pesos hardcoded na função SQL
// `invest_match_buscar_candidatos` (migration 20260520). Se mudar um, mude o
// outro. Centralizamos aqui para o painel de insights usar como baseline ao
// sugerir recalibração — a SQL continua sendo a fonte de verdade em runtime.

export const DIMENSOES = [
  'setorial', 'ticket', 'stage', 'maturity', 'governance',
  'risk', 'geography', 'documentation', 'exit_horizon', 'urgency',
] as const

export type Dimensao = (typeof DIMENSOES)[number]

export const PESOS_ATUAIS: Record<Dimensao, number> = {
  setorial:      0.20,
  ticket:        0.15,
  stage:         0.10,
  maturity:      0.10,
  governance:    0.10,
  risk:          0.10,
  geography:     0.05,
  documentation: 0.10,
  exit_horizon:  0.05,
  urgency:       0.05,
}

export const DIMENSAO_LABEL: Record<Dimensao, string> = {
  setorial:      'Setorial',
  ticket:        'Ticket',
  stage:         'Estágio',
  maturity:      'Maturidade',
  governance:    'Governança',
  risk:          'Risco',
  geography:     'Geografia',
  documentation: 'Documentação',
  exit_horizon:  'Horizonte saída',
  urgency:       'Urgência',
}
