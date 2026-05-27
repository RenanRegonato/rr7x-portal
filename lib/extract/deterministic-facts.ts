// Extrator determinístico de fatos (Fase 1, #2).
//
// Usa os parsers pt-BR (br-parsers.ts) + regras de proximidade de rótulo para
// emitir fatos de ALTA confiança sem LLM. Produz o mesmo shape que o extrator
// Haiku (ChunkFact), então pode alimentar document_facts pelo mesmo caminho.
//
// Precisão > recall: só emite fato quando tem certeza. CNPJ/CPF são certeza
// (dígito verificador). Financeiros só são emitidos quando há um rótulo
// inequívoco adjacente ao valor (ex.: "EBITDA ... R$ 108,1 mi"). Valor solto,
// sem rótulo, NÃO vira fato (evita lixo/ambiguidade — isso fica para a IA).

import {
  findCNPJs, findCPFs, findMoniesBRL, findAreas, parseDateBR,
} from './br-parsers.ts'

// Mesmo shape do extrator Haiku (lib/ingestion/chunk-fact-extractor.ts).
export interface ChunkFact {
  fact_type:    string
  fact_key:     string
  fact_value:   string   // JSON.stringify do objeto
  source_quote: string | null
  source_page:  number | null
  confidence:   number   // 0-1
}

// Rótulos financeiros → chave canônica. Ordem: específico antes do genérico
// (ex.: "dívida líquida" antes de "dívida").
interface Label { re: RegExp; key: string }

const FIN_LABELS: Label[] = [
  { re: /d[ií]vida\s+l[ií]quida/i,         key: 'divida_liquida' },
  { re: /d[ií]vida\s+bruta/i,              key: 'divida_bruta' },
  { re: /ebitda/i,                          key: 'ebitda' },
  { re: /receita\s+l[ií]quida/i,           key: 'receita_liquida' },
  { re: /receita\s+bruta/i,                key: 'receita_bruta' },
  { re: /faturamento/i,                     key: 'faturamento' },
  { re: /receita/i,                         key: 'receita' },
  { re: /lucro\s+l[ií]quido/i,             key: 'lucro_liquido' },
  { re: /patrim[oô]nio\s+l[ií]quido/i,     key: 'patrimonio_liquido' },
  { re: /capital\s+social/i,                key: 'capital_social' },
  { re: /ativo\s+circulante/i,             key: 'ativo_circulante' },
  { re: /passivo\s+circulante/i,           key: 'passivo_circulante' },
  { re: /ativo\s+total/i,                   key: 'ativo_total' },
  { re: /passivo\s+total/i,                 key: 'passivo_total' },
  { re: /fluxo\s+de\s+caixa/i,             key: 'fluxo_de_caixa' },
  { re: /(disponibilidades|caixa\s+e\s+equivalentes)/i, key: 'caixa' },
  { re: /contas?\s+a\s+receber/i,          key: 'contas_a_receber' },
  { re: /estoques?/i,                       key: 'estoque' },
  { re: /(endividamento|d[ií]vida\s+total)/i, key: 'divida_total' },
  { re: /(capta[çc][ãa]o|valor\s+da\s+opera[çc][ãa]o|montante\s+da\s+opera[çc][ãa]o)/i, key: 'valor_operacao' },
]

// Rótulos de área (imobiliário/rural). 'área' genérico fica por último (fallback).
const AREA_LABELS: Label[] = [
  { re: /reserva\s+legal/i,                                          key: 'area_reserva_legal' },
  { re: /(\bAPP\b|preserva[çc][ãa]o\s+permanente)/i,                 key: 'area_app' },
  { re: /rural\s+consolidada/i,                                      key: 'area_rural_consolidada' },
  { re: /servid[ãa]o/i,                                              key: 'area_servidao' },
  { re: /remanescente/i,                                             key: 'area_remanescente' },
  { re: /constru[íi]da/i,                                            key: 'area_construida' },
  { re: /(terreno|\blote\b)/i,                                       key: 'area_terreno' },
  { re: /im[óo]vel/i,                                                key: 'area_imovel' },
  { re: /[áa]rea\s+total/i,                                          key: 'area_total' },
  { re: /[áa]rea/i,                                                  key: 'area' },
]

const LABEL_WINDOW = 60 // chars antes do valor onde procuramos o rótulo

// Última ocorrência do padrão na janela = a mais próxima do valor (que fica no
// fim da janela). Usar a primeira ocorrência mislabela quando o rótulo se repete.
function lastMatch(window: string, re: RegExp): { end: number; len: number } | null {
  const g = new RegExp(re.source, re.flags.includes('g') ? re.flags : re.flags + 'g')
  let m: RegExpExecArray | null, last: { end: number; len: number } | null = null
  while ((m = g.exec(window)) !== null) {
    last = { end: m.index + m[0].length, len: m[0].length }
    if (m.index === g.lastIndex) g.lastIndex++
  }
  return last
}

// Acha o rótulo mais PRÓXIMO (à esquerda) do valor. Em empate de posição,
// prefere o match mais longo (mais específico, ex.: "dívida líquida" > "dívida").
function closestLabel(window: string, labels: Label[]): string | null {
  let best: { key: string; end: number; len: number } | null = null
  for (const { re, key } of labels) {
    const lm = lastMatch(window, re)
    if (lm && (!best || lm.end > best.end || (lm.end === best.end && lm.len > best.len))) {
      best = { key, end: lm.end, len: lm.len }
    }
  }
  return best?.key ?? null
}

// Acha um ano (19xx/20xx) logo após o valor, para anotar o período.
function periodoAfter(text: string, from: number): number | null {
  const after = text.slice(from, from + 40)
  const m = after.match(/\b(19|20)\d{2}\b/)
  return m ? Number(m[0]) : null
}

function quote(text: string, start: number, end: number): string {
  const q = text.slice(Math.max(0, start), Math.min(text.length, end)).replace(/\s+/g, ' ').trim()
  return q.slice(0, 240)
}

export interface ExtractOpts { sourcePage?: number | null }

export function extractDeterministicFacts(text: string, opts: ExtractOpts = {}): ChunkFact[] {
  const page = opts.sourcePage ?? null
  const facts: ChunkFact[] = []

  // CNPJ — certeza (dígito verificador). Cada CNPJ vira um fato societário.
  for (const c of findCNPJs(text)) {
    facts.push({
      fact_type:    'estrutura_societaria',
      fact_key:     `cnpj_${c.formatted.replace(/\D/g, '')}`,
      fact_value:   JSON.stringify({ cnpj: c.formatted }),
      source_quote: quote(text, c.index - 40, c.index + c.raw.length + 20),
      source_page:  page,
      confidence:   0.99,
    })
  }

  // CPF — certeza.
  for (const c of findCPFs(text)) {
    facts.push({
      fact_type:    'estrutura_societaria',
      fact_key:     `cpf_${c.formatted.replace(/\D/g, '')}`,
      fact_value:   JSON.stringify({ cpf: c.formatted }),
      source_quote: quote(text, c.index - 40, c.index + c.raw.length + 20),
      source_page:  page,
      confidence:   0.99,
    })
  }

  // Financeiros rotulados — valor parseado com certeza + rótulo adjacente.
  for (const money of findMoniesBRL(text)) {
    const window = text.slice(Math.max(0, money.index - LABEL_WINDOW), money.index)
    const key = closestLabel(window, FIN_LABELS)
    if (!key) continue // sem rótulo inequívoco → não emite (precisão > recall)
    const periodo = periodoAfter(text, money.index + money.raw.length)
    const value: Record<string, unknown> = { amount: money.amount, unit: money.unit }
    if (periodo) value.periodo = periodo
    facts.push({
      fact_type:    'numero_financeiro',
      fact_key:     periodo ? `${key}_${periodo}` : key,
      fact_value:   JSON.stringify(value),
      source_quote: quote(text, money.index - LABEL_WINDOW, money.index + money.raw.length + 12),
      source_page:  page,
      confidence:   0.92, // alta, mas < CNPJ: o pareamento rótulo-valor é heurístico
    })
  }

  // Áreas (imobiliário/rural) — número + unidade, rotulado por proximidade.
  // 'modulo_fiscal' é auto-rotulado; as demais exigem um rótulo de área reconhecível.
  for (const area of findAreas(text)) {
    const key = area.unit === 'modulo_fiscal'
      ? 'modulos_fiscais'
      : closestLabel(text.slice(Math.max(0, area.index - LABEL_WINDOW), area.index), AREA_LABELS)
    if (!key) continue
    facts.push({
      fact_type:    'numero_financeiro',
      fact_key:     key,
      fact_value:   JSON.stringify({ amount: area.amount, unit: area.unit }),
      source_quote: quote(text, area.index - LABEL_WINDOW, area.index + area.raw.length + 8),
      source_page:  page,
      confidence:   0.9,
    })
  }

  return facts
}

// Reexport util para o classificador (Fase 1, 1c).
export { parseDateBR }
