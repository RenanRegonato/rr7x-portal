import * as XLSX from 'xlsx'

export interface FinancialData {
  exercicios:                 string[]
  receita_liquida:            (number | null)[]
  ebitda_reportado:           (number | null)[]
  ebitda_normalizado:         (number | null)[]
  lucro_liquido:              (number | null)[]
  margem_ebitda:              (number | null)[]
  divida_liquida:             number | null
  multiplo_ev_ebitda_min:     number
  multiplo_ev_ebitda_max:     number
  wacc_estimado:              number
  crescimento_projecao:       number[]  // % por ano (5 anos)
  crescimento_perpetuidade:   number
  valuation_ev_min:           number | null
  valuation_ev_max:           number | null
}

// Extrai o bloco <financial-data> do output do Davi
export function parseFinancialData(daviOutput: string): FinancialData | null {
  const match = daviOutput.match(/<financial-data>([\s\S]*?)<\/financial-data>/)
  if (!match) return null
  try {
    const raw = JSON.parse(match[1].trim())
    return {
      exercicios:               raw.exercicios               ?? [],
      receita_liquida:          raw.receita_liquida           ?? [],
      ebitda_reportado:         raw.ebitda_reportado          ?? [],
      ebitda_normalizado:       raw.ebitda_normalizado        ?? [],
      lucro_liquido:            raw.lucro_liquido             ?? [],
      margem_ebitda:            raw.margem_ebitda             ?? [],
      divida_liquida:           raw.divida_liquida            ?? null,
      multiplo_ev_ebitda_min:   raw.multiplo_ev_ebitda_min   ?? raw.multiplo_ev_ebitda_referencia?.[0] ?? 5,
      multiplo_ev_ebitda_max:   raw.multiplo_ev_ebitda_max   ?? raw.multiplo_ev_ebitda_referencia?.[1] ?? 8,
      wacc_estimado:            raw.wacc_estimado             ?? 15,
      crescimento_projecao:     raw.crescimento_projecao      ?? [10, 8, 6, 5, 5],
      crescimento_perpetuidade: raw.crescimento_perpetuidade  ?? 3,
      valuation_ev_min:         raw.valuation_ev_min          ?? null,
      valuation_ev_max:         raw.valuation_ev_max          ?? null,
    }
  } catch {
    return null
  }
}

function fmt(n: number | null, type: 'currency' | 'pct' | 'number' = 'number'): string | number {
  if (n === null || n === undefined) return '—'
  if (type === 'pct') return `${n.toFixed(1)}%`
  if (type === 'currency') return n
  return n
}

function pct(n: number | null): string {
  if (n === null) return '—'
  return `${n.toFixed(1)}%`
}

// Projeta 5 anos de FCF e calcula DCF
function buildDCFProjection(fd: FinancialData) {
  // Usa EBITDA normalizado do último ano como base
  const ebitdaBase = [...(fd.ebitda_normalizado)].reverse().find((v) => v !== null) ?? 0
  const wacc       = fd.wacc_estimado / 100
  const gPerp      = fd.crescimento_perpetuidade / 100
  const taxRate    = 0.34 // IRCS + CSLL padrão Brasil

  const years = ['Ano 1', 'Ano 2', 'Ano 3', 'Ano 4', 'Ano 5']
  const growthRates = [
    ...(fd.crescimento_projecao.slice(0, 5)),
    ...Array(Math.max(0, 5 - fd.crescimento_projecao.length)).fill(fd.crescimento_projecao.at(-1) ?? 5),
  ]

  let ebitdaPrev = ebitdaBase
  const projections: {
    year: string; growth: string; ebitda: number
    ebit: number; nopat: number; fcf: number; pvFcf: number
  }[] = []

  let totalPV = 0

  for (let i = 0; i < 5; i++) {
    const g      = growthRates[i] / 100
    const ebitda = ebitdaPrev * (1 + g)
    const ebit   = ebitda * 0.85       // assume D&A = 15% EBITDA
    const nopat  = ebit * (1 - taxRate)
    const fcf    = nopat + ebitda * 0.15 - ebitda * 0.08 // + D&A - Capex estimado
    const pv     = fcf / Math.pow(1 + wacc, i + 1)
    projections.push({ year: years[i], growth: pct(growthRates[i]), ebitda, ebit, nopat, fcf, pvFcf: pv })
    totalPV  += pv
    ebitdaPrev = ebitda
  }

  const lastFCF    = projections.at(-1)!.fcf
  const terminalV  = (lastFCF * (1 + gPerp)) / (wacc - gPerp)
  const pvTerminal = terminalV / Math.pow(1 + wacc, 5)
  const ev         = totalPV + pvTerminal

  return { projections, totalPV, pvTerminal, terminalV, ev }
}

export function buildFinancialModelSheet(fd: FinancialData): XLSX.WorkSheet {
  const rows: (string | number | null)[][] = []

  const H  = (title: string): (string | number | null)[] => [title, '', '', '', '', '', '']
  const R  = (...cells: (string | number | null)[]): (string | number | null)[] => cells
  const HR = (): (string | number | null)[] => ['', '', '', '', '', '', '']

  // ── Premissas ────────────────────────────────────────────────────────────
  rows.push(H('PREMISSAS DO MODELO'))
  rows.push(R('WACC estimado',             `${fd.wacc_estimado}%`))
  rows.push(R('Taxa IRCS + CSLL',          '34%'))
  rows.push(R('Crescimento na perpetuidade', `${fd.crescimento_perpetuidade}%`))
  rows.push(R('Múltiplo EV/EBITDA setor (min)', `${fd.multiplo_ev_ebitda_min}x`))
  rows.push(R('Múltiplo EV/EBITDA setor (max)', `${fd.multiplo_ev_ebitda_max}x`))
  rows.push(HR())

  // ── DRE Histórica ────────────────────────────────────────────────────────
  rows.push(H('DRE HISTÓRICA'))
  rows.push(R('Exercício', ...fd.exercicios))
  rows.push(R('Receita Líquida (R$)', ...fd.receita_liquida.map((v) => fmt(v, 'currency'))))
  rows.push(R('EBITDA Reportado (R$)', ...fd.ebitda_reportado.map((v) => fmt(v, 'currency'))))
  rows.push(R('EBITDA Normalizado (R$)', ...fd.ebitda_normalizado.map((v) => fmt(v, 'currency'))))
  rows.push(R('Margem EBITDA', ...fd.margem_ebitda.map((v) => fmt(v, 'pct'))))
  rows.push(R('Lucro Líquido (R$)', ...fd.lucro_liquido.map((v) => fmt(v, 'currency'))))
  rows.push(HR())

  // ── Projeção DCF ─────────────────────────────────────────────────────────
  const dcf = buildDCFProjection(fd)

  rows.push(H('PROJEÇÃO DCF — 5 ANOS'))
  rows.push(R('', ...dcf.projections.map((p) => p.year)))
  rows.push(R('Crescimento YoY', ...dcf.projections.map((p) => p.growth)))
  rows.push(R('EBITDA Projetado (R$)', ...dcf.projections.map((p) => Math.round(p.ebitda))))
  rows.push(R('EBIT (R$)', ...dcf.projections.map((p) => Math.round(p.ebit))))
  rows.push(R('NOPAT (R$)', ...dcf.projections.map((p) => Math.round(p.nopat))))
  rows.push(R('Free Cash Flow (R$)', ...dcf.projections.map((p) => Math.round(p.fcf))))
  rows.push(R('PV do FCF (R$)', ...dcf.projections.map((p) => Math.round(p.pvFcf))))
  rows.push(HR())
  rows.push(R('Soma PV FCFs (R$)',    Math.round(dcf.totalPV)))
  rows.push(R('Valor Terminal (R$)',  Math.round(dcf.terminalV)))
  rows.push(R('PV do Valor Terminal (R$)', Math.round(dcf.pvTerminal)))
  rows.push(R('Enterprise Value — DCF (R$)', Math.round(dcf.ev)))
  if (fd.divida_liquida !== null) {
    rows.push(R('(−) Dívida Líquida (R$)', fd.divida_liquida))
    rows.push(R('Equity Value — DCF (R$)', Math.round(dcf.ev - fd.divida_liquida)))
  }
  rows.push(HR())

  // ── Múltiplos ────────────────────────────────────────────────────────────
  const ebitdaLast = [...(fd.ebitda_normalizado)].reverse().find((v) => v !== null) ?? 0
  const evMin      = ebitdaLast * fd.multiplo_ev_ebitda_min
  const evMax      = ebitdaLast * fd.multiplo_ev_ebitda_max

  rows.push(H('VALUATION POR MÚLTIPLOS — EV/EBITDA'))
  rows.push(R('EBITDA Normalizado Base (R$)', ebitdaLast))
  rows.push(R('EV mínimo (R$)', Math.round(evMin), `(${fd.multiplo_ev_ebitda_min}x EBITDA)`))
  rows.push(R('EV máximo (R$)', Math.round(evMax), `(${fd.multiplo_ev_ebitda_max}x EBITDA)`))
  if (fd.divida_liquida !== null) {
    rows.push(R('Equity Value mín. (R$)', Math.round(evMin - fd.divida_liquida)))
    rows.push(R('Equity Value máx. (R$)', Math.round(evMax - fd.divida_liquida)))
  }
  rows.push(HR())

  // ── Análise de Sensibilidade ──────────────────────────────────────────────
  rows.push(H('SENSIBILIDADE — Enterprise Value DCF (R$)'))
  rows.push(R('WACC \\ Cresc. Perpetuidade', '1%', '2%', '3%', '4%', '5%'))

  const waccRange = [-2, -1, 0, 1, 2].map((d) => fd.wacc_estimado + d)
  for (const w of waccRange) {
    const gRange = [1, 2, 3, 4, 5]
    const rowData = gRange.map((g) => {
      const tempFd = { ...fd, wacc_estimado: w, crescimento_perpetuidade: g }
      const { ev } = buildDCFProjection(tempFd)
      return Math.round(ev)
    })
    rows.push(R(`WACC ${w}%`, ...rowData))
  }

  rows.push(HR())
  rows.push(R('* Modelo com premissas estimadas — ajustar com dados auditados'))
  rows.push(R('* Fonte das premissas: análise Davi Diagnóstico (Otto Intelligence)'))

  const ws = XLSX.utils.aoa_to_sheet(rows)
  ws['!cols'] = [
    { wch: 36 }, { wch: 18 }, { wch: 18 }, { wch: 18 }, { wch: 18 }, { wch: 18 }, { wch: 18 },
  ]
  return ws
}
