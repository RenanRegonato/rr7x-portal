// Parsers determinísticos para documentos financeiros brasileiros (Fase 1, #2).
//
// Por que determinístico > IA aqui: CNPJ/CPF têm dígito verificador, valores e
// datas têm formato canônico pt-BR. Um regex + validação acerta 100% e é
// AUDITÁVEL (a fonte é a regra, não um palpite do modelo). Isto reduz chamadas
// LLM e elimina números "alucinados". Regra de ouro: NUNCA emitir um fato que o
// parser não tem certeza — precisão acima de recall.
//
// Tudo aqui é puro e testável (ver br-parsers.test.ts). Sem LLM, sem I/O.

// ── helpers ──────────────────────────────────────────────────────────────────

const onlyDigits = (s: string): string => s.replace(/\D/g, '')

// Rejeita sequências de dígito repetido (00000000000000, 111...), que passam na
// aritmética mas nunca são documentos reais.
const allSame = (s: string): boolean => /^(\d)\1+$/.test(s)

// ── CNPJ (com dígito verificador) ────────────────────────────────────────────

export function isValidCNPJ(raw: string): boolean {
  const d = onlyDigits(raw)
  if (d.length !== 14 || allSame(d)) return false
  const calc = (len: number): number => {
    const weights = len === 12
      ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
      : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
    let sum = 0
    for (let i = 0; i < len; i++) sum += Number(d[i]) * weights[i]
    const r = sum % 11
    return r < 2 ? 0 : 11 - r
  }
  return calc(12) === Number(d[12]) && calc(13) === Number(d[13])
}

export function formatCNPJ(raw: string): string {
  const d = onlyDigits(raw)
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12, 14)}`
}

export interface FoundCNPJ { raw: string; formatted: string; index: number }

// Acha CNPJs (com ou sem máscara) e SÓ retorna os com DV válido.
export function findCNPJs(text: string): FoundCNPJ[] {
  const out: FoundCNPJ[] = []
  const seen = new Set<string>()
  // máscara cheia OU 14 dígitos seguidos
  const re = /\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}/g
  let m: RegExpExecArray | null
  while ((m = re.exec(text)) !== null) {
    const digits = onlyDigits(m[0])
    if (digits.length !== 14 || !isValidCNPJ(digits) || seen.has(digits)) continue
    seen.add(digits)
    out.push({ raw: m[0], formatted: formatCNPJ(digits), index: m.index })
  }
  return out
}

// ── CPF (com dígito verificador) ─────────────────────────────────────────────

export function isValidCPF(raw: string): boolean {
  const d = onlyDigits(raw)
  if (d.length !== 11 || allSame(d)) return false
  const dv = (len: number): number => {
    let sum = 0
    for (let i = 0; i < len; i++) sum += Number(d[i]) * (len + 1 - i)
    const r = (sum * 10) % 11
    return r === 10 ? 0 : r
  }
  return dv(9) === Number(d[9]) && dv(10) === Number(d[10])
}

export function formatCPF(raw: string): string {
  const d = onlyDigits(raw)
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9, 11)}`
}

export interface FoundCPF { raw: string; formatted: string; index: number }

export function findCPFs(text: string): FoundCPF[] {
  const out: FoundCPF[] = []
  const seen = new Set<string>()
  const re = /(?<!\d)\d{3}\.?\d{3}\.?\d{3}-?\d{2}(?!\d)/g
  let m: RegExpExecArray | null
  while ((m = re.exec(text)) !== null) {
    const digits = onlyDigits(m[0])
    // evita capturar pedaço de CNPJ (14 dígitos) como CPF
    if (digits.length !== 11 || !isValidCPF(digits) || seen.has(digits)) continue
    seen.add(digits)
    out.push({ raw: m[0], formatted: formatCPF(digits), index: m.index })
  }
  return out
}

// ── número pt-BR ─────────────────────────────────────────────────────────────

// "1.234.567,89" → 1234567.89 ; "2,3" → 2.3 ; "2.300.000" → 2300000
export function parsePtBrNumber(raw: string): number | null {
  const s = raw.trim()
  if (!/\d/.test(s)) return null
  if (!/^[\d.,]+$/.test(s)) return null
  const cleaned = s.includes(',')
    ? s.replace(/\./g, '').replace(',', '.')  // vírgula = decimal, ponto = milhar
    : s.replace(/\./g, '')                    // sem vírgula: ponto = milhar
  const n = Number(cleaned)
  return Number.isFinite(n) ? n : null
}

// ── valores monetários (R$) ──────────────────────────────────────────────────

interface Multiplier { re: RegExp; factor: number }
const MULTIPLIERS: Multiplier[] = [
  { re: /^(bilh(ão|ões|oes)|bi)$/i,                factor: 1e9 },
  { re: /^(milh(ão|ões|oes)|mi|mm)$/i,             factor: 1e6 },
  { re: /^(mil|k)$/i,                              factor: 1e3 },
]

function multiplierFor(word: string | undefined): number {
  if (!word) return 1
  for (const m of MULTIPLIERS) if (m.re.test(word.trim())) return m.factor
  return 1
}

export interface Money { amount: number; unit: 'BRL' }

// Parseia uma expressão monetária inteira: "R$ 2,3 mi", "R$ 1.234.567,89", "2,3 milhões".
export function parseMoneyBRL(raw: string): Money | null {
  const m = raw.trim().match(/^R?\$?\s*([\d][\d.,]*)\s*(bilh[õoães]+|bi|milh[õoães]+|mi|mm|mil|k)?\.?$/i)
  if (!m) return null
  const base = parsePtBrNumber(m[1])
  if (base === null) return null
  const amount = base * multiplierFor(m[2])
  return { amount, unit: 'BRL' }
}

export interface FoundMoney { raw: string; amount: number; unit: 'BRL'; index: number }

// Acha valores ANCORADOS em "R$" no texto (alta precisão; evita confundir com
// telefones/CNPJs/anos). Captura o multiplicador textual seguinte se houver.
export function findMoniesBRL(text: string): FoundMoney[] {
  const out: FoundMoney[] = []
  const re = /R\$\s*([\d][\d.,]*)\s*(bilh(?:ão|ões|oes)|bi|milh(?:ão|ões|oes)|mi|mm|mil|k)?/gi
  let m: RegExpExecArray | null
  while ((m = re.exec(text)) !== null) {
    const base = parsePtBrNumber(m[1])
    if (base === null) continue
    const amount = base * multiplierFor(m[2])
    out.push({ raw: m[0].trim(), amount, unit: 'BRL', index: m.index })
  }
  return out
}

// ── áreas (imobiliário/rural) ────────────────────────────────────────────────

export interface FoundArea { raw: string; amount: number; unit: string; index: number }

function canonArea(u: string): string {
  const s = u.toLowerCase()
  if (/hectare|^ha$/.test(s)) return 'ha'
  if (/m²|m2|metros/.test(s)) return 'm2'
  if (/alqueire/.test(s))     return 'alqueire'
  if (/m[óo]dulo/.test(s))    return 'modulo_fiscal'
  return s
}

// Acha "1.234,56 ha", "350 m²", "12 alqueires", "4 módulos fiscais".
// Lookahead garante que a unidade termina em espaço/pontuação (evita "hab" etc.).
export function findAreas(text: string): FoundArea[] {
  const out: FoundArea[] = []
  const re = /([\d][\d.,]*)\s*(hectares?|ha|m²|m2|metros\s+quadrados|alqueires?|m[óo]dulos\s+fiscais)(?=[\s.,;:)]|$)/gi
  let m: RegExpExecArray | null
  while ((m = re.exec(text)) !== null) {
    const amount = parsePtBrNumber(m[1])
    if (amount === null) continue
    out.push({ raw: m[0].trim(), amount, unit: canonArea(m[2]), index: m.index })
  }
  return out
}

// ── datas pt-BR ──────────────────────────────────────────────────────────────

const MESES: Record<string, number> = {
  janeiro: 1, fevereiro: 2, marco: 3, 'março': 3, abril: 4, maio: 5, junho: 6,
  julho: 7, agosto: 8, setembro: 9, outubro: 10, novembro: 11, dezembro: 12,
}

export interface DateBR { iso: string | null; year: number; month?: number; day?: number }

function toIso(y: number, mo?: number, d?: number): string | null {
  if (!mo || !d) return null
  const dt = new Date(Date.UTC(y, mo - 1, d))
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== mo - 1 || dt.getUTCDate() !== d) return null
  return dt.toISOString().slice(0, 10)
}

// "15/03/2025", "15-03-2025", "15 de março de 2025", "março de 2025", "2025".
export function parseDateBR(raw: string): DateBR | null {
  const s = raw.trim().toLowerCase()
  let m = s.match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{2,4})$/)
  if (m) {
    const day = +m[1], month = +m[2]
    let year = +m[3]
    if (year < 100) year += year < 50 ? 2000 : 1900
    if (month < 1 || month > 12 || day < 1 || day > 31) return null
    return { iso: toIso(year, month, day), year, month, day }
  }
  m = s.match(/^(\d{1,2})\s+de\s+([a-zç]+)\s+de\s+(\d{4})$/)
  if (m && MESES[m[2]]) {
    const day = +m[1], month = MESES[m[2]], year = +m[3]
    return { iso: toIso(year, month, day), year, month, day }
  }
  m = s.match(/^([a-zç]+)\s+de\s+(\d{4})$/)
  if (m && MESES[m[1]]) {
    const month = MESES[m[1]], year = +m[2]
    return { iso: null, year, month }
  }
  m = s.match(/^(19|20)\d{2}$/)
  if (m) return { iso: null, year: +s }
  return null
}

// ── percentuais / taxas (com indexador) ──────────────────────────────────────

export interface Percent { value: number; indexador?: string }

// "12,5%", "CDI + 3,5%", "IPCA + 5%", "100% do CDI".
export function parsePercent(raw: string): Percent | null {
  const s = raw.trim()
  let m = s.match(/^(CDI|IPCA|IGP-?M|SELIC|TR)\s*\+\s*([\d.,]+)\s*%$/i)
  if (m) {
    const v = parsePtBrNumber(m[2]); if (v === null) return null
    return { value: v, indexador: m[1].toUpperCase() }
  }
  m = s.match(/^([\d.,]+)\s*%\s*(?:d[oae]\s+)?(CDI|IPCA|IGP-?M|SELIC|TR)?$/i)
  if (m) {
    const v = parsePtBrNumber(m[1]); if (v === null) return null
    return m[2] ? { value: v, indexador: m[2].toUpperCase() } : { value: v }
  }
  return null
}
