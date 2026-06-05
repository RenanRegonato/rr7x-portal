// Dados agregados do painel operacional do Invest Match.
// Uma única função server-side que monta tudo o que a página /invest-match
// precisa: KPIs, funil do pipeline, fila de ação, valor em jogo + top teses
// e atividade recente. Lê via os services existentes (listMatches/listTeses),
// mantendo a matemática de status/valor centralizada aqui.

import { listMatches, listTeses, type MatchEnriquecido } from './match-service'
import type { StatusMatch } from './types'

// Ordinal de avanço no funil. Estados rejeitados/descartados ficam fora (-1).
// aprovado_auto e aprovado_admin compartilham o mesmo degrau ("aprovados").
const FUNNEL_RANK: Record<StatusMatch, number> = {
  sugerido:             0,
  aprovado_auto:        1,
  aprovado_admin:       1,
  notificado:           2,
  em_negociacao:        3,
  nda:                  3,
  proposta:             3,
  dd:                   3,
  fechado:              4,
  rejeitado_admin:      -1,
  rejeitado_investidor: -1,
  rejeitado_projeto:    -1,
  descartado:           -1,
}

const rankOf = (s: string): number => FUNNEL_RANK[s as StatusMatch] ?? -1

export interface FunnelStage {
  id:    string
  label: string
  count: number          // matches que atingiram pelo menos este degrau (cumulativo)
  taxa:  number | null    // % de conversão vindo do degrau anterior (null no 1º)
}

export interface FilaItem {
  id:           string
  empresaNome:  string
  investidorNome: string
  score:        number
  teseId:       string
}

export interface TopTese {
  id:                 string
  empresaNome:        string
  status:             string
  capitalBuscadoBrl:  number
  matchesCount:       number
}

export interface AtividadeItem {
  id:             string
  empresaNome:    string
  investidorNome: string
  status:         string
  score:          number
  teseId:         string
  em:             string   // ISO timestamp da última mudança
}

export interface DashboardData {
  kpis: {
    investidoresAtivos: number
    investidoresTotal:  number
    teses:              number
    matchesAtivos:      number   // no pipeline, ainda não fechados
    fechados:           number
  }
  funil: FunnelStage[]
  fila: {
    sugeridos:               FilaItem[]   // aguardando curadoria
    sugeridosTotal:          number
    aprovadosNaoNotificados: FilaItem[]   // aprovados aguardando notificação
    aprovadosTotal:          number
  }
  valor: {
    emJogoBrl:    number
    fechadoBrl:   number
    tesesEmJogo:  number
  }
  topTeses:  TopTese[]
  atividade: AtividadeItem[]
}

const ATIVOS_STATUS: StatusMatch[] = [
  'sugerido', 'aprovado_auto', 'aprovado_admin', 'notificado',
  'em_negociacao', 'nda', 'proposta', 'dd',
]

function toFila(m: MatchEnriquecido): FilaItem {
  return {
    id:             m.id!,
    empresaNome:    m.tese?.empresa_nome ?? 'Empresa',
    investidorNome: m.investidor?.nome ?? 'Investidor',
    score:          Math.round(m.score_final ?? 0),
    teseId:         m.tese_id,
  }
}

export async function getDashboardData(escritorioId: string): Promise<DashboardData> {
  // Carrega o pipeline inteiro e as teses do escritório.
  // Limites altos cobrem com folga um pipeline real (dezenas–centenas).
  const [{ rows: matches }, { rows: teses, total: tesesTotal }] = await Promise.all([
    listMatches({ escritorioId, limit: 1000, offset: 0 }),
    listTeses({ escritorioId, limit: 1000, offset: 0 }),
  ])

  // Mapa de capital buscado por tese (para o valor em jogo)
  const capitalPorTese = new Map<string, number>()
  for (const t of teses) capitalPorTese.set(t.id!, t.capital_buscado_brl ?? 0)

  // --- Funil cumulativo (degraus ≥ rank) ---
  const reached = (minRank: number) =>
    matches.filter(m => rankOf(m.status) >= minRank).length

  const sugeridosMais  = reached(0)
  const aprovadosMais  = reached(1)
  const notificadosMais = reached(2)
  const negociacaoMais = reached(3)
  const fechados       = reached(4)

  const pct = (cur: number, prev: number): number | null =>
    prev > 0 ? Math.round((cur / prev) * 100) : null

  const funil: FunnelStage[] = [
    { id: 'sugeridos',  label: 'Sugeridos',     count: sugeridosMais,   taxa: null },
    { id: 'aprovados',  label: 'Aprovados',     count: aprovadosMais,   taxa: pct(aprovadosMais, sugeridosMais) },
    { id: 'notificados', label: 'Notificados',  count: notificadosMais, taxa: pct(notificadosMais, aprovadosMais) },
    { id: 'negociacao', label: 'Em negociação', count: negociacaoMais,  taxa: pct(negociacaoMais, notificadosMais) },
    { id: 'fechados',   label: 'Fechados',      count: fechados,        taxa: pct(fechados, negociacaoMais) },
  ]

  // --- Valor em jogo: classifica cada tese pelo melhor match ativo ---
  const maxRankPorTese = new Map<string, number>()
  for (const m of matches) {
    const r = rankOf(m.status)
    if (r < 0) continue
    maxRankPorTese.set(m.tese_id, Math.max(maxRankPorTese.get(m.tese_id) ?? -1, r))
  }
  let emJogoBrl = 0, fechadoBrl = 0, tesesEmJogo = 0
  for (const [teseId, r] of maxRankPorTese) {
    const capital = capitalPorTese.get(teseId) ?? 0
    if (r === 4) {
      fechadoBrl += capital
    } else {
      emJogoBrl += capital
      tesesEmJogo += 1
    }
  }

  // --- Fila de ação ---
  const sugeridos = matches.filter(m => m.status === 'sugerido')
  const aprovados = matches.filter(m => m.status === 'aprovado_auto' || m.status === 'aprovado_admin')

  // --- Top teses por nº de matches qualificados (matches_count vem do service) ---
  const topTeses: TopTese[] = [...teses]
    .filter(t => (t.matches_count ?? 0) > 0)
    .sort((a, b) =>
      (b.matches_count ?? 0) - (a.matches_count ?? 0) ||
      (b.capital_buscado_brl ?? 0) - (a.capital_buscado_brl ?? 0))
    .slice(0, 5)
    .map(t => ({
      id:                t.id!,
      empresaNome:       t.empresa_nome,
      status:            t.status,
      capitalBuscadoBrl: t.capital_buscado_brl ?? 0,
      matchesCount:      t.matches_count ?? 0,
    }))

  // --- Atividade recente: por última mudança de status ---
  const tsOf = (m: MatchEnriquecido) =>
    m.atualizado_em ?? m.calculado_em ?? m.criado_em ?? ''
  const atividade: AtividadeItem[] = [...matches]
    .sort((a, b) => (tsOf(b)).localeCompare(tsOf(a)))
    .slice(0, 8)
    .map(m => ({
      id:             m.id!,
      empresaNome:    m.tese?.empresa_nome ?? 'Empresa',
      investidorNome: m.investidor?.nome ?? 'Investidor',
      status:         m.status,
      score:          Math.round(m.score_final ?? 0),
      teseId:         m.tese_id,
      em:             tsOf(m),
    }))

  return {
    kpis: {
      investidoresAtivos: 0,  // preenchido pela página (counts diretos)
      investidoresTotal:  0,
      teses:              tesesTotal,
      matchesAtivos:      matches.filter(m => ATIVOS_STATUS.includes(m.status)).length,
      fechados,
    },
    funil,
    fila: {
      sugeridos:               sugeridos.slice(0, 6).map(toFila),
      sugeridosTotal:          sugeridos.length,
      aprovadosNaoNotificados: aprovados.slice(0, 6).map(toFila),
      aprovadosTotal:          aprovados.length,
    },
    valor: { emJogoBrl, fechadoBrl, tesesEmJogo },
    topTeses,
    atividade,
  }
}
