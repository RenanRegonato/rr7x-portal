// ============================================================
// Mapa Inteligente do Mercado — Enriquecimento via Receita (BrasilAPI)
// ============================================================
// Completa as entidades vindas da CVM (que só têm razão social + papéis) com
// nome fantasia, município/UF, CNAE e situação cadastral — dados públicos da
// Receita Federal, via BrasilAPI. Reaproveita o padrão best-effort do auto-pull
// de CNPJ (User-Agent explícito, timeout, retry).
//
// BÔNUS: o CNAE identifica bancos (6421-6424) → adiciona o papel 'banco' às
// entidades correspondentes (cobre parte do "bancos" sem ETL do BCB).
//
// Idempotente e paginável: processa entidades com uf IS NULL AND raw IS NULL
// (= ainda não tentadas). Cada tentativa marca `raw` (status), então o drain é
// monotônico — roda em lotes via Inngest até esgotar.
// ============================================================
import { createAdminClient } from '@/lib/supabase-server'

const BRASILAPI_CNPJ = 'https://brasilapi.com.br/api/cnpj/v1'
const USER_AGENT = 'Mandor/1.0 (+https://www.mandor.com.br)'
const TIMEOUT_MS = 15_000
const DELAY_MS = 700 // gentileza com o rate-limit da BrasilAPI

type Logger = { info: (m: string, d?: unknown) => void; error?: (m: string, d?: unknown) => void }

interface ReceitaResp {
  razao_social?: string
  nome_fantasia?: string
  municipio?: string
  uf?: string
  cnae_fiscal?: number | string
  cnae_fiscal_descricao?: string
  descricao_situacao_cadastral?: string
  situacao_cadastral?: string
}

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))
const soDigitos = (s: string) => (s || '').replace(/\D/g, '')

// CNAEs de banco (divisões 6421-6424). Prefixo dos 4 primeiros dígitos.
function ehBanco(cnae: string | number | undefined): boolean {
  const c = String(cnae ?? '').padStart(7, '0').slice(0, 4)
  return ['6421', '6422', '6423', '6424'].includes(c)
}

type FetchResult = { ok: ReceitaResp } | { notFound: true } | { retry: true }

async function fetchReceitaOnce(cnpj: string): Promise<FetchResult> {
  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS)
  try {
    const res = await fetch(`${BRASILAPI_CNPJ}/${cnpj}`, {
      signal: ctrl.signal,
      headers: { Accept: 'application/json', 'User-Agent': USER_AGENT },
    })
    if (res.status === 404) return { notFound: true }
    if (!res.ok) return { retry: true }            // 429, 5xx
    return { ok: (await res.json()) as ReceitaResp }
  } catch {
    return { retry: true }                          // timeout/rede
  } finally {
    clearTimeout(t)
  }
}

async function fetchReceita(cnpj: string): Promise<{ data: ReceitaResp | null; notFound: boolean }> {
  for (let i = 0; i < 2; i++) {
    const r = await fetchReceitaOnce(cnpj)
    if ('ok' in r) return { data: r.ok, notFound: false }
    if ('notFound' in r) return { data: null, notFound: true }
    if (i === 0) await sleep(1200)                  // backoff antes do retry
  }
  return { data: null, notFound: false }            // falha transitória
}

export interface EnrichResult {
  processadas: number
  enriquecidas: number
  bancos_marcados: number
  falhas: number
}

/**
 * Enriquece um lote de entidades ainda não tentadas (uf IS NULL, raw IS NULL).
 * Marca raw em toda tentativa (ok/notfound/erro) para o drain ser monotônico.
 */
export async function enrichEntidadesReceitaPage(opts: { limit?: number; logger?: Logger } = {}): Promise<EnrichResult> {
  const logger = opts.logger ?? { info: console.log, error: console.error }
  const limit = opts.limit ?? 120
  const admin = createAdminClient()

  const { data: rows, error } = await admin
    .from('mercado_entidades')
    .select('id, cnpj, tipos')
    .is('uf', null)
    .is('raw', null)
    .not('cnpj', 'is', null)
    .limit(limit)
  if (error) { logger.error?.('[etl-receita] select: ' + error.message); return { processadas: 0, enriquecidas: 0, bancos_marcados: 0, falhas: 0 } }

  let enriquecidas = 0, bancos = 0, falhas = 0
  for (const e of (rows ?? []) as { id: string; cnpj: string; tipos: string[] }[]) {
    const { data, notFound } = await fetchReceita(soDigitos(e.cnpj))

    if (data && data.uf) {
      const tipos = new Set(e.tipos ?? [])
      let marcouBanco = false
      if (ehBanco(data.cnae_fiscal) && !tipos.has('banco')) { tipos.add('banco'); marcouBanco = true }
      await admin.from('mercado_entidades').update({
        nome_fantasia: data.nome_fantasia || null,
        uf:            data.uf,
        municipio:     data.municipio || null,
        cnae:          data.cnae_fiscal_descricao || (data.cnae_fiscal ? String(data.cnae_fiscal) : null),
        situacao:      (data.descricao_situacao_cadastral || data.situacao_cadastral || '').toLowerCase() || null,
        tipos:         [...tipos],
        raw:           { receita: 'ok', cnae_cod: data.cnae_fiscal ?? null },
      }).eq('id', e.id)
      enriquecidas++
      if (marcouBanco) bancos++
    } else if (notFound) {
      await admin.from('mercado_entidades').update({ raw: { receita: 'notfound' } }).eq('id', e.id)
      falhas++
    } else {
      // falha transitória (rate-limit/timeout): marca p/ não travar o drain;
      // pode ser re-tentada depois limpando raw where raw->>'receita'='erro'.
      await admin.from('mercado_entidades').update({ raw: { receita: 'erro' } }).eq('id', e.id)
      falhas++
    }
    await sleep(DELAY_MS)
  }

  const processadas = (rows ?? []).length
  logger.info(`[etl-receita] lote: ${processadas} processadas, ${enriquecidas} enriquecidas, ${bancos} bancos, ${falhas} falhas`)
  return { processadas, enriquecidas, bancos_marcados: bancos, falhas }
}
