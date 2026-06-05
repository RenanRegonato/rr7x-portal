// CVM Open Data integration — dados.cvm.gov.br
// CSVs são cacheados por 24h via Next.js Data Cache (revalidate: 86400)
// Encoding: arquivos CVM usam latin-1

const URLS = {
  debentures: 'https://dados.cvm.gov.br/dados/DEBENTURES/CAD/DADOS/deb_cad.csv',
  cri:        'https://dados.cvm.gov.br/dados/CRI/CAD/DADOS/cri_cad.csv',
  cra:        'https://dados.cvm.gov.br/dados/CRA/CAD/DADOS/cra_cad.csv',
  empresas:   'https://dados.cvm.gov.br/dados/CIA_ABERTA/CAD/DADOS/cad_cia_aberta.csv',
}

async function fetchCVMCsv(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      signal:  AbortSignal.timeout(14000),
      // @ts-ignore — Next.js extended fetch options
      next:    { revalidate: 86400 },
    })
    if (!res.ok) return null
    // CVM usa latin-1
    const buf = await res.arrayBuffer()
    return new TextDecoder('latin-1').decode(buf)
  } catch {
    return null
  }
}

function parseCSV(text: string, delimiter = ';'): Record<string, string>[] {
  const lines = text.split('\n')
  if (lines.length < 2) return []
  const headers = lines[0].split(delimiter).map((h) => h.trim().replace(/\r/g, ''))
  const records: Record<string, string>[] = []
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue
    const values = line.split(delimiter)
    const record: Record<string, string> = {}
    headers.forEach((h, j) => { record[h] = (values[j] ?? '').trim() })
    records.push(record)
  }
  return records
}

// DD/MM/AAAA → Date
function parsebrDate(s: string): Date | null {
  const p = s.split('/')
  if (p.length !== 3) return null
  const d = new Date(`${p[2]}-${p[1].padStart(2, '0')}-${p[0].padStart(2, '0')}`)
  return isNaN(d.getTime()) ? null : d
}

function isRecent(dateStr: string, yearsBack = 3): boolean {
  const d = parsebrDate(dateStr)
  if (!d) return false
  const cutoff = new Date()
  cutoff.setFullYear(cutoff.getFullYear() - yearsBack)
  return d >= cutoff
}

function keywordMatch(record: Record<string, string>, keywords: string[]): boolean {
  if (!keywords.length) return true
  const text = Object.values(record).join(' ').toLowerCase()
  return keywords.some((k) => text.includes(k.toLowerCase()))
}

// Extrai keywords do setor do deal intake para filtragem
export function extractSectorKeywords(tipoAtivo: string, resumo: string): string[] {
  const base: Record<string, string[]> = {
    'Imóvel / Real Estate': ['imob', 'real estate', 'fii', 'loteament', 'incorpora', 'cri'],
    'Agronegócio':          ['agro', 'rural', 'soja', 'milho', 'carne', 'cra', 'agric'],
    'Portfólio de Crédito': ['crédito', 'carteira', 'fidc', 'receivab', 'recebív'],
    'Empresa (M&A)':        [],
    'Startup / Scale-up':   ['tech', 'startup', 'softw', 'saas', 'fintech'],
    'Franquia':             ['franq', 'rede', 'licen'],
  }
  const keywords = base[tipoAtivo] ?? []
  // Adiciona palavras significativas do resumo do ativo (>5 chars, sem stopwords)
  const stopwords = new Set(['para', 'com', 'que', 'uma', 'dos', 'das', 'como', 'este', 'essa'])
  const resumoWords = resumo
    .toLowerCase()
    .split(/\s+/)
    .filter((w) => w.length > 5 && !stopwords.has(w))
    .slice(0, 5)
  return [...new Set([...keywords, ...resumoWords])]
}

// Dados para Estruturação de Crédito: emissões recentes de debentures, CRI, CRA
export async function fetchCapitalMarketsData(keywords: string[]): Promise<string> {
  const [debRaw, criRaw, craRaw] = await Promise.allSettled([
    fetchCVMCsv(URLS.debentures),
    fetchCVMCsv(URLS.cri),
    fetchCVMCsv(URLS.cra),
  ])

  const sections: string[] = []

  // Debêntures
  if (debRaw.status === 'fulfilled' && debRaw.value) {
    const records = parseCSV(debRaw.value)
    const recent  = records.filter((r) => isRecent(r['DT_Emissao'] ?? '', 3))
    const matches = keywords.length ? recent.filter((r) => keywordMatch(r, keywords)) : recent
    const top = (matches.length > 0 ? matches : recent).slice(-20)

    if (top.length > 0) {
      const rows = top
        .map((r) => {
          const emissor  = r['Denom_Emis'] ?? r['CNPJ_Emis'] ?? '—'
          const emissao  = r['DT_Emissao'] ?? '—'
          const venci    = r['DT_Venci']   ?? '—'
          const indx     = r['INDX']       ?? '—'
          const taxa     = r['Tx_Jur_Ano'] ? `${r['Tx_Jur_Ano']}% a.a.` : (r['Rentab_Deb'] ?? '—')
          const garantia = r['Desc_Garantia'] ?? '—'
          return `  ${emissao} | ${emissor.slice(0, 30)} | ${indx} + ${taxa} | Venc: ${venci} | Garantia: ${garantia}`
        })
        .join('\n')
      sections.push(`DEBÊNTURES — emissões recentes registradas na CVM:\n${rows}\n[Fonte: CVM dados.cvm.gov.br]`)
    }
  }

  // CRI
  if (criRaw.status === 'fulfilled' && criRaw.value) {
    const records = parseCSV(criRaw.value)
    const recent  = records.filter((r) => isRecent(r['DT_Emissao'] ?? '', 3))
    const top     = (keywords.length ? recent.filter((r) => keywordMatch(r, keywords)) : recent).slice(-10)

    if (top.length > 0) {
      const rows = top
        .map((r) => `  ${r['DT_Emissao'] ?? '—'} | ${(r['Emis_Cert'] ?? r['CNPJ_Emis'] ?? '—').slice(0, 30)} | ${r['INDX'] ?? '—'} + ${r['Tx_Jur_Ano'] ?? '—'}% | Venc: ${r['DT_Venci'] ?? '—'}`)
        .join('\n')
      sections.push(`CRI — emissões recentes (CVM):\n${rows}\n[Fonte: CVM dados.cvm.gov.br]`)
    }
  }

  // CRA
  if (craRaw.status === 'fulfilled' && craRaw.value) {
    const records = parseCSV(craRaw.value)
    const recent  = records.filter((r) => isRecent(r['DT_Emissao'] ?? '', 3))
    const top     = (keywords.length ? recent.filter((r) => keywordMatch(r, keywords)) : recent).slice(-10)

    if (top.length > 0) {
      const rows = top
        .map((r) => `  ${r['DT_Emissao'] ?? '—'} | ${(r['Emis_Cert'] ?? r['CNPJ_Emis'] ?? '—').slice(0, 30)} | ${r['INDX'] ?? '—'} + ${r['Tx_Jur_Ano'] ?? '—'}% | Venc: ${r['DT_Venci'] ?? '—'}`)
        .join('\n')
      sections.push(`CRA — emissões recentes (CVM):\n${rows}\n[Fonte: CVM dados.cvm.gov.br]`)
    }
  }

  if (!sections.length) return ''
  return `\n\n---\nMERCADO DE CAPITAIS — Base CVM (dados atualizados diariamente, cache 24h):\n${sections.join('\n\n')}\n---`
}

// Dados para Inteligência de Mercado: empresas abertas comparáveis no setor
export async function fetchListedComparables(keywords: string[]): Promise<string> {
  const raw = await fetchCVMCsv(URLS.empresas)
  if (!raw) return ''

  const records = parseCSV(raw)
  const active  = records.filter((r) => r['SIT'] === 'ATIVO')
  const matches = keywords.length
    ? active.filter((r) => keywordMatch(r, keywords))
    : []

  if (!matches.length) return ''

  const top  = matches.slice(0, 12)
  const rows = top
    .map((r) => `  - ${r['DENOM_SOCIAL'] ?? r['DENOM_COMERC'] ?? '—'} (${r['SETOR_ATIV'] ?? '—'}) — CVM: ${r['CD_CVM'] ?? '—'}`)
    .join('\n')

  return `\n\n---\nEMPRESAS ABERTAS — comparáveis listados na CVM:\n${rows}\n[Fonte: CVM dados.cvm.gov.br]\n---`
}
