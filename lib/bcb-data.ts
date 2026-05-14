type BCBSerie = { data: string; valor: string }[]

async function fetchSeries(code: number): Promise<BCBSerie | null> {
  try {
    const res = await fetch(
      `https://api.bcb.gov.br/dados/serie/bcdata.sgs.${code}/dados/ultimos/1?formato=json`,
      { signal: AbortSignal.timeout(5000), cache: 'no-store' }
    )
    if (!res.ok) return null
    return res.json()
  } catch {
    return null
  }
}

export async function fetchBCBIndicators(): Promise<string> {
  const [selic, ipca, usd, pib] = await Promise.allSettled([
    fetchSeries(12),    // Meta SELIC (% a.a.)
    fetchSeries(433),   // IPCA variação mensal
    fetchSeries(1),     // USD/BRL compra (PTAX)
    fetchSeries(7326),  // PIB crescimento trimestral
  ])

  const lines: string[] = []

  if (selic.status === 'fulfilled' && selic.value?.[0]) {
    lines.push(`- Taxa SELIC Meta: ${selic.value[0].valor}% a.a. (referência: ${selic.value[0].data})`)
  }
  if (ipca.status === 'fulfilled' && ipca.value?.[0]) {
    lines.push(`- IPCA (variação mensal): ${ipca.value[0].valor}% (referência: ${ipca.value[0].data})`)
  }
  if (usd.status === 'fulfilled' && usd.value?.[0]) {
    lines.push(`- USD/BRL (PTAX compra): R$ ${usd.value[0].valor} (referência: ${usd.value[0].data})`)
  }
  if (pib.status === 'fulfilled' && pib.value?.[0]) {
    lines.push(`- PIB (crescimento trimestral): ${pib.value[0].valor}% (referência: ${pib.value[0].data})`)
  }

  if (lines.length === 0) return ''

  return `\n\n---\nINDICADORES MACROECONÔMICOS — Banco Central do Brasil (dados atualizados automaticamente):\n${lines.join('\n')}\nFonte: api.bcb.gov.br\n---`
}
