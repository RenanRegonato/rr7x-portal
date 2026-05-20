// Labels e helpers de apresentação do Invest Match.
// Centraliza a tradução dos vocabulários canônicos (snake_case) para PT-BR
// e classes de cor, evitando repetição nas páginas.

import type { StatusMatch, StatusTese } from './types'

export const TIPO_INVESTIDOR_LABEL: Record<string, string> = {
  pessoa_fisica:           'Pessoa física',
  holding_familiar:        'Holding familiar',
  family_office:           'Family office',
  fundo:                   'Fundo',
  financeira:              'Financeira',
  pj:                      'Pessoa jurídica',
  estrategico_corporativo: 'Estratégico corporativo',
  gestora:                 'Gestora',
  clube_investimento:      'Clube de investimento',
}

export const ESTAGIO_LABEL: Record<string, string> = {
  ideia:         'Ideia',
  mvp:           'MVP',
  early_revenue: 'Receita inicial',
  growth:        'Growth',
  mature:        'Madura',
  turnaround:    'Turnaround',
}

export const TIPO_DEAL_LABEL: Record<string, string> = {
  equity:              'Equity',
  debt:                'Dívida',
  convertible:         'Conversível',
  m_and_a_sale:        'M&A — Venda',
  m_and_a_acquisition: 'M&A — Aquisição',
  earn_out:            'Earn-out',
  growth_equity:       'Growth equity',
  special_situations:  'Special situations',
}

// === Status do match — coluna do Kanban ===
export interface StatusMatchMeta {
  label: string
  cls:   string   // classes de badge/borda
  group: 'novo' | 'curadoria' | 'pipeline' | 'fechado' | 'rejeitado'
}

export const STATUS_MATCH: Record<StatusMatch, StatusMatchMeta> = {
  sugerido:              { label: 'Sugerido',       cls: 'bg-surface-2 text-ink-2 border-border',      group: 'curadoria' },
  aprovado_auto:         { label: 'Aprovado (auto)', cls: 'bg-sky/15 text-sky-700 border-sky/30',      group: 'curadoria' },
  aprovado_admin:        { label: 'Aprovado',       cls: 'bg-accent-soft text-accent-ink border-accent-strong/30', group: 'curadoria' },
  notificado:            { label: 'Notificado',     cls: 'bg-sky/15 text-sky-700 border-sky/30',       group: 'pipeline' },
  em_negociacao:         { label: 'Em negociação',  cls: 'bg-warn/10 text-warn border-warn/30',        group: 'pipeline' },
  nda:                   { label: 'NDA',            cls: 'bg-warn/10 text-warn border-warn/30',        group: 'pipeline' },
  proposta:              { label: 'Proposta',       cls: 'bg-warn/10 text-warn border-warn/30',        group: 'pipeline' },
  dd:                    { label: 'Due diligence',  cls: 'bg-warn/10 text-warn border-warn/30',        group: 'pipeline' },
  fechado:               { label: 'Fechado',        cls: 'bg-ok/15 text-ok border-ok/30',              group: 'fechado' },
  rejeitado_admin:       { label: 'Rejeitado',      cls: 'bg-surface-2 text-ink-3 border-border',      group: 'rejeitado' },
  rejeitado_investidor:  { label: 'Rejeit. investidor', cls: 'bg-surface-2 text-ink-3 border-border',  group: 'rejeitado' },
  rejeitado_projeto:     { label: 'Rejeit. projeto', cls: 'bg-surface-2 text-ink-3 border-border',     group: 'rejeitado' },
  descartado:            { label: 'Descartado',     cls: 'bg-surface-2 text-ink-3 border-border',      group: 'rejeitado' },
}

export const STATUS_TESE_LABEL: Record<StatusTese, string> = {
  lead:        'Lead',
  atendimento: 'Em atendimento',
  matches:     'Com matches',
  negociacao:  'Em negociação',
  realizado:   'Realizado',
  suspenso:    'Suspenso',
  arquivado:   'Arquivado',
}

export const TAG_LABEL: Record<string, string> = {
  nda_assinado:     'NDA assinado',
  reuniao_realizada: 'Reunião realizada',
  proposta_enviada: 'Proposta enviada',
  em_diligencia:    'Em diligência',
}

export const TAGS_NEGOCIACAO = ['nda_assinado', 'reuniao_realizada', 'proposta_enviada', 'em_diligencia'] as const

// Colunas do Kanban (ordem)
export const KANBAN_COLUNAS: Array<{ id: StatusMatch; titulo: string }> = [
  { id: 'sugerido',      titulo: 'Sugeridos' },
  { id: 'aprovado_auto', titulo: 'Aprovados (auto)' },
  { id: 'aprovado_admin', titulo: 'Aprovados' },
  { id: 'notificado',    titulo: 'Notificados' },
  { id: 'em_negociacao', titulo: 'Em negociação' },
  { id: 'nda',           titulo: 'NDA' },
  { id: 'proposta',      titulo: 'Proposta' },
  { id: 'dd',            titulo: 'Due diligence' },
  { id: 'fechado',       titulo: 'Fechados' },
]

export function formatBRL(v: number | null | undefined): string {
  if (v == null) return '—'
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(v)
}

// Cor do score (0-100) — verde alto, âmbar médio, cinza baixo
export function scoreColor(score: number): string {
  if (score >= 85) return 'text-ok'
  if (score >= 70) return 'text-sky-700'
  return 'text-ink-2'
}

export function scoreBg(score: number): string {
  if (score >= 85) return 'bg-ok/15 text-ok border-ok/30'
  if (score >= 70) return 'bg-sky/15 text-sky-700 border-sky/30'
  return 'bg-surface-2 text-ink-2 border-border'
}
