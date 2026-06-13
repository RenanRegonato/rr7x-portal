// ============================================================
// Mapa Inteligente do Mercado — ETL CVM Dados Abertos (ODbL)
// ============================================================
// Fonte: Portal de Dados Abertos da CVM — cadastro de fundos (cad_fi.csv).
// Licença ODbL → uso comercial e derivados permitidos COM atribuição.
// Tudo gravado com fonte='cvm' e redistribuivel=true (exibível ao usuário).
//
// O cadastro traz, por fundo, os prestadores de serviço (administrador,
// gestor, custodiante, controlador) com nome + CNPJ — exatamente o dado
// que monta o grafo de conexões. Padrão de fetch best-effort (User-Agent
// explícito, timeout, retry) reaproveitado do auto-pull de CNPJ.
//
// PAGINAÇÃO: a base completa (~60k fundos) não cabe num único step serverless
// (limite 300s). Por isso o processamento é fatiado: o orquestrador (função
// Inngest) chama runEtlCvmCadFiPage por página, cada página = 1 step próprio
// com 300s. Cada página re-baixa o CSV e processa só a sua fatia — re-download
// é o trade-off aceitável para um job semanal (evita guardar o arquivo inteiro
// como output de step, o que estouraria limites).
// ============================================================
import { createAdminClient } from '@/lib/supabase-server'

const CAD_FI_URL = 'https://dados.cvm.gov.br/dados/FI/CAD/DADOS/cad_fi.csv'
const USER_AGENT = 'Mandor/1.0 (+https://www.mandor.com.br)'
const TIMEOUT_MS = 120_000

type Logger = { info: (m: string, d?: unknown) => void; error?: (m: string, d?: unknown) => void }
type Admin = ReturnType<typeof createAdminClient>

interface SliceResult {
  lidas: number
  entidades: number
  veiculos: number
  prestadores: number
}

// TP_FUNDO da CVM → nosso VeiculoTipo
function mapTipoFundo(tp: string, classe: string): string {
  const t = (tp || '').toUpperCase()
  if (t.includes('FIDC')) return 'FIDC'
  if (t === 'FII' || classe?.toUpperCase().includes('IMOBILI')) return 'FII'
  if (t === 'FIP') return 'FIP'
  if (t === 'ETF') return 'ETF'
  if (t.includes('AGRO')) return 'FIAGRO'
  return 'fundo_geral'
}

function soDigitos(s: string): string {
  return (s || '').replace(/\D/g, '')
}

function cnpjValido(s: string): boolean {
  return soDigitos(s).length === 14
}

async function fetchCadFi(): Promise<string> {
  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS)
  try {
    const res = await fetch(CAD_FI_URL, {
      signal: ctrl.signal,
      headers: { Accept: 'text/csv', 'User-Agent': USER_AGENT },
    })
    if (!res.ok) throw new Error(`CVM cad_fi HTTP ${res.status}`)
    // O arquivo da CVM é ISO-8859-1 (latin1); decodificar corretamente.
    const buf = await res.arrayBuffer()
    return new TextDecoder('latin1').decode(buf)
  } finally {
    clearTimeout(t)
  }
}

// Parser simples de CSV com separador ';' (formato CVM).
function parseCsv(text: string): Record<string, string>[] {
  const linhas = text.split(/\r?\n/).filter(l => l.length > 0)
  if (linhas.length < 2) return []
  const header = linhas[0].split(';').map(h => h.trim())
  const rows: Record<string, string>[] = []
  for (let i = 1; i < linhas.length; i++) {
    const cols = linhas[i].split(';')
    const row: Record<string, string> = {}
    for (let j = 0; j < header.length; j++) row[header[j]] = (cols[j] ?? '').trim()
    rows.push(row)
  }
  return rows
}

// ============================================================
// Núcleo: processa uma fatia de linhas já parseadas.
// Idempotente (upserts). Dedup interno por chave para nunca disparar
// "ON CONFLICT cannot affect row a second time".
// ============================================================
async function processSlice(admin: Admin, rows: Record<string, string>[], logger: Logger): Promise<{ entidades: number; veiculos: number; prestadores: number }> {
  // 1) Entidades únicas (prestadores) por CNPJ
  const entidadesPorCnpj = new Map<string, { cnpj: string; razao_social: string; tipos: Set<string> }>()
  function addEntidade(cnpj: string, nome: string, tipo: string) {
    const c = soDigitos(cnpj)
    if (!cnpjValido(c) || !nome) return
    const ex = entidadesPorCnpj.get(c)
    if (ex) { ex.tipos.add(tipo); if (!ex.razao_social) ex.razao_social = nome }
    else entidadesPorCnpj.set(c, { cnpj: c, razao_social: nome, tipos: new Set([tipo]) })
  }
  for (const r of rows) {
    addEntidade(r['CNPJ_ADMIN'], r['ADMIN'], 'administrador')
    addEntidade(r['CPF_CNPJ_GESTOR'], r['GESTOR'], 'gestora')
    addEntidade(r['CNPJ_CUSTODIANTE'], r['CUSTODIANTE'], 'custodiante')
    addEntidade(r['CNPJ_CONTROLADOR'], r['CONTROLADOR'], 'controladoria')
  }

  const idPorCnpj = new Map<string, string>()
  const entArr = [...entidadesPorCnpj.values()]
  for (let i = 0; i < entArr.length; i += 500) {
    const lote = entArr.slice(i, i + 500).map(e => ({
      cnpj: e.cnpj, razao_social: e.razao_social, tipos: [...e.tipos], fonte: 'cvm', redistribuivel: true,
    }))
    const { data, error } = await admin
      .from('mercado_entidades')
      .upsert(lote, { onConflict: 'cnpj' })
      .select('id, cnpj')
    if (error) throw new Error(`upsert entidades: ${error.message}`)
    for (const row of (data ?? []) as { id: string; cnpj: string }[]) idPorCnpj.set(row.cnpj, row.id)
  }

  // 2) Veículos (fundos), DEDUP por CNPJ (CVM repete CNPJ por classe)
  const veicPorCnpj = new Map<string, { cnpj: string; nome: string; tipo: string; categoria_cvm: string | null; situacao: string | null; fonte: string; redistribuivel: boolean }>()
  for (const r of rows) {
    const c = soDigitos(r['CNPJ_FUNDO'])
    if (!cnpjValido(c) || !r['DENOM_SOCIAL'] || veicPorCnpj.has(c)) continue
    veicPorCnpj.set(c, {
      cnpj: c, nome: r['DENOM_SOCIAL'], tipo: mapTipoFundo(r['TP_FUNDO'], r['CLASSE']),
      categoria_cvm: r['CLASSE'] || null, situacao: r['SIT'] || null, fonte: 'cvm', redistribuivel: true,
    })
  }
  const idVeicPorCnpj = new Map<string, string>()
  let veiculos = 0
  const veicArr = [...veicPorCnpj.values()]
  for (let i = 0; i < veicArr.length; i += 500) {
    const lote = veicArr.slice(i, i + 500)
    const { data, error } = await admin
      .from('mercado_veiculos')
      .upsert(lote, { onConflict: 'cnpj,tipo' })
      .select('id, cnpj')
    if (error) throw new Error(`upsert veiculos: ${error.message}`)
    veiculos += data?.length ?? 0
    for (const row of (data ?? []) as { id: string; cnpj: string }[]) idVeicPorCnpj.set(row.cnpj, row.id)
  }

  // 3) Prestadores (liga veículo ↔ entidade por papel), DEDUP pela tripla
  const prestadores: { veiculo_id: string; entidade_id: string; papel: string; fonte: string }[] = []
  const vistos = new Set<string>()
  function addPrestador(cnpjFundo: string, cnpjEnt: string, papel: string) {
    const vId = idVeicPorCnpj.get(soDigitos(cnpjFundo))
    const eId = idPorCnpj.get(soDigitos(cnpjEnt))
    if (!vId || !eId) return
    const k = `${vId}|${eId}|${papel}`
    if (vistos.has(k)) return
    vistos.add(k)
    prestadores.push({ veiculo_id: vId, entidade_id: eId, papel, fonte: 'cvm' })
  }
  for (const r of rows) {
    addPrestador(r['CNPJ_FUNDO'], r['CNPJ_ADMIN'], 'administrador')
    addPrestador(r['CNPJ_FUNDO'], r['CPF_CNPJ_GESTOR'], 'gestor')
    addPrestador(r['CNPJ_FUNDO'], r['CNPJ_CUSTODIANTE'], 'custodiante')
    addPrestador(r['CNPJ_FUNDO'], r['CNPJ_CONTROLADOR'], 'controladoria')
  }
  let prestCount = 0
  for (let i = 0; i < prestadores.length; i += 500) {
    const lote = prestadores.slice(i, i + 500)
    const { error } = await admin
      .from('mercado_veiculo_prestadores')
      .upsert(lote, { onConflict: 'veiculo_id,entidade_id,papel', ignoreDuplicates: true })
    if (error) throw new Error(`upsert prestadores: ${error.message}`)
    prestCount += lote.length
  }

  logger.info(`[etl-cvm] fatia: ${idPorCnpj.size} entidades, ${veiculos} veículos, ${prestCount} vínculos`)
  return { entidades: idPorCnpj.size, veiculos, prestadores: prestCount }
}

// ============================================================
// Processa UMA página [offset, offset+limit). Cada página re-baixa o CSV.
// ============================================================
export async function runEtlCvmCadFiPage(opts: { offset: number; limit: number; logger?: Logger }): Promise<SliceResult> {
  const logger = opts.logger ?? { info: console.log, error: console.error }
  const admin = createAdminClient()
  const csv = await fetchCadFi()
  const todas = parseCsv(csv)
  const rows = todas.slice(opts.offset, opts.offset + opts.limit)
  logger.info(`[etl-cvm] página offset=${opts.offset} limit=${opts.limit}: ${rows.length} linhas (de ${todas.length} no arquivo)`)
  if (rows.length === 0) return { lidas: 0, entidades: 0, veiculos: 0, prestadores: 0 }
  const r = await processSlice(admin, rows, logger)
  return { lidas: rows.length, ...r }
}

// ============================================================
// Auditoria: criar/finalizar a linha de mercado_ingestao_runs.
// ============================================================
export async function criarIngestaoRun(): Promise<string | null> {
  const admin = createAdminClient()
  const { data } = await admin
    .from('mercado_ingestao_runs')
    .insert({ fonte: 'cvm', dataset: 'cad_fi', status: 'running' })
    .select('id')
    .single()
  return (data?.id as string | undefined) ?? null
}

export async function finalizarIngestaoRun(
  runId: string | null,
  status: 'completed' | 'failed',
  acc: { lidas: number; veiculos: number },
  error?: string,
): Promise<void> {
  if (!runId) return
  const admin = createAdminClient()
  await admin.from('mercado_ingestao_runs').update({
    status,
    linhas_lidas: acc.lidas,
    linhas_gravadas: acc.veiculos,
    error_message: error ?? null,
    finalizado_em: new Date().toISOString(),
  }).eq('id', runId)
}

// ============================================================
// Pós-processamento: grafo de conexões + score de relevância.
// ============================================================
export async function rebuildGrafoEScore(opts: { logger?: Logger } = {}): Promise<{ conexoes: number }> {
  const logger = opts.logger ?? { info: console.log }
  const admin = createAdminClient()

  const { error: rpcErr } = await admin.rpc('mercado_rebuild_conexoes')
  if (rpcErr) logger.info?.('[etl-cvm] rebuild conexoes falhou: ' + rpcErr.message)

  const { error: scoreErr } = await admin.rpc('mercado_recalcular_score')
  if (scoreErr) logger.info?.('[etl-cvm] recalcular score falhou: ' + scoreErr.message)

  await remarcarBancos(admin, logger)

  // Reclassifica family_office por nome (sobrevive ao clobber de tipos do cron).
  const { error: clsErr } = await admin.rpc('mercado_classificar_por_nome')
  if (clsErr) logger.info?.('[etl-cvm] classificar por nome falhou: ' + clsErr.message)

  const { count } = await admin.from('mercado_conexoes').select('*', { count: 'exact', head: true })
  return { conexoes: count ?? 0 }
}

// Re-marca 'banco' nas entidades cujo CNAE (salvo em raw.cnae_cod pelo
// enriquecimento da Receita) é de banco. O upsert semanal do ETL CVM reescreve
// `tipos`, mas preserva `raw` — então a marcação é reconstituível aqui.
const CNAE_BANCO = ['6421', '6422', '6423', '6424']
async function remarcarBancos(admin: Admin, logger: Logger): Promise<void> {
  const { data } = await admin
    .from('mercado_entidades')
    .select('id, tipos, raw')
    .not('raw', 'is', null)
    .limit(8000)
  let n = 0
  for (const e of (data ?? []) as { id: string; tipos: string[]; raw: { cnae_cod?: number | string } | null }[]) {
    const cod = String(e.raw?.cnae_cod ?? '').padStart(7, '0').slice(0, 4)
    if (CNAE_BANCO.includes(cod) && !(e.tipos ?? []).includes('banco')) {
      await admin.from('mercado_entidades').update({ tipos: [...(e.tipos ?? []), 'banco'] }).eq('id', e.id)
      n++
    }
  }
  if (n) logger.info?.(`[etl-cvm] bancos re-marcados pelo CNAE: ${n}`)
}
