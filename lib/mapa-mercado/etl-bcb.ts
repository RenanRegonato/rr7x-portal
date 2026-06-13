// ============================================================
// Mapa Inteligente do Mercado — ETL BCB IF.data (bancos)
// ============================================================
// Dados financeiros trimestrais das instituições (API Olinda OData, pública).
// Para cada banco: Ativo Total, Carteira de Crédito, Carteira PJ, Patrimônio
// Líquido, Lucro, Captações — gravados como séries em mercado_metricas.
//
// Detalhes da fonte (validados ao vivo):
//   - IfDataValores e IfDataCadastro casam por CodInst (100%).
//   - Cadastro dá nome/UF/município/CNPJ-raiz (CnpjInstituicaoLider, 8 díg).
//   - Relatório 1 (Resumo) = Ativo/Carteira/PL/Lucro/Captações; publicado até o
//     trimestre mais recente. Relatório 13 (Carteira PJ) defasa ~2 trimestres,
//     então buscamos o AnoMes mais recente de CADA relatório separadamente.
//   - Carteira PJ total = linha Conta '24453' (filtro $filter=Conta eq '24453').
//   - Vários CodInst compartilham a mesma raiz de CNPJ → agregamos por raiz,
//     escolhendo o CodInst de maior Ativo (evita duplicidade).
// ============================================================
import { createAdminClient } from '@/lib/supabase-server'

const BASE = 'https://olinda.bcb.gov.br/olinda/servico/IFDATA/versao/v1/odata'
const USER_AGENT = 'Mandor/1.0 (+https://www.mandor.com.br)'

type Logger = { info: (m: string, d?: unknown) => void; error?: (m: string, d?: unknown) => void }

async function getJson(url: string): Promise<{ value: Record<string, unknown>[] }> {
  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort(), 60_000)
  try {
    const r = await fetch(url, { signal: ctrl.signal, headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' } })
    const txt = await r.text()
    try { return JSON.parse(txt) as { value: Record<string, unknown>[] } } catch { return { value: [] } }
  } finally { clearTimeout(t) }
}

function candidatosAnoMes(): string[] {
  const now = new Date()
  const limite = Number(`${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`)
  const cands: string[] = []
  for (let yy = now.getFullYear(); yy >= now.getFullYear() - 3; yy--) {
    for (const mm of [12, 9, 6, 3]) {
      const am = Number(`${yy}${String(mm).padStart(2, '0')}`)
      if (am <= limite) cands.push(String(am))
    }
  }
  return cands
}

const soDigitos = (s: string) => (s || '').replace(/\D/g, '')
const compDe = (anoMes: string) => `${anoMes.slice(0, 4)}-${anoMes.slice(4, 6)}-01`

// Busca o relatório no AnoMes mais recente que tiver dados.
async function buscarRelatorioRecente(
  relatorio: string,
  filtroConta?: string,
): Promise<{ anoMes: string; rows: Record<string, unknown>[] } | null> {
  for (const am of candidatosAnoMes()) {
    const filtro = filtroConta ? `&$filter=Conta%20eq%20'${filtroConta}'` : ''
    const r = await getJson(`${BASE}/IfDataValores(AnoMes=@A,TipoInstituicao=@T,Relatorio=@R)?@A=${am}&@T=2&@R='${relatorio}'${filtro}&$format=json`)
    if (r.value.length > 0) return { anoMes: am, rows: r.value }
  }
  return null
}

export interface BcbResult {
  status: 'completed' | 'failed'
  anoMesResumo?: string
  anoMesPJ?: string
  bancos: number
  enriquecidos: number
  criados: number
  metricas: number
  error?: string
}

const COL_RESUMO: Record<string, string> = {
  'Ativo Total': 'ativo_total',
  'Carteira de Crédito Classificada': 'carteira_credito',
  'Patrimônio Líquido': 'patrimonio_liquido',
  'Lucro Líquido': 'lucro_liquido',
  'Captações': 'captacoes',
}

export async function runEtlBcbBancos(opts: { logger?: Logger } = {}): Promise<BcbResult> {
  const logger = opts.logger ?? { info: console.log, error: console.error }
  const admin = createAdminClient()

  try {
    const resumo = await buscarRelatorioRecente('1')
    if (!resumo) throw new Error('BCB: Resumo (rel 1) sem dados')
    const pj = await buscarRelatorioRecente('13', '24453')
    logger.info(`[etl-bcb] resumo AnoMes=${resumo.anoMes} (${resumo.rows.length}) | PJ AnoMes=${pj?.anoMes ?? '-'} (${pj?.rows.length ?? 0})`)

    // Cadastro do AnoMes do resumo (nome/UF/raiz por CodInst)
    const cadResp = await getJson(`${BASE}/IfDataCadastro(AnoMes=@A)?@A=${resumo.anoMes}&$format=json`)
    const cad = new Map<string, { nome: string; uf: string | null; municipio: string | null; raiz: string | null; situacao: string | null }>()
    for (const c of cadResp.value) {
      cad.set(String(c.CodInst), {
        nome: String(c.NomeInstituicao ?? '').trim(),
        uf: (c.Uf as string) || null,
        municipio: (c.Municipio as string) || null,
        raiz: c.CnpjInstituicaoLider ? soDigitos(String(c.CnpjInstituicaoLider)).padStart(8, '0') : null,
        situacao: c.Situacao === 'A' ? 'ativa' : (c.Situacao as string) || null,
      })
    }

    // CodInst → métricas do resumo; CodInst → carteira_pj
    const resumoByCod = new Map<string, Record<string, number>>()
    for (const r of resumo.rows) {
      const metrica = COL_RESUMO[String(r.NomeColuna)]
      if (!metrica || r.Saldo == null) continue
      const m = resumoByCod.get(String(r.CodInst)) ?? {}
      m[metrica] = Number(r.Saldo)
      resumoByCod.set(String(r.CodInst), m)
    }
    const pjByCod = new Map<string, number>()
    for (const r of pj?.rows ?? []) {
      if (r.Saldo != null) pjByCod.set(String(r.CodInst), Number(r.Saldo))
    }

    // Agrega por raiz: escolhe o CodInst de maior Ativo Total
    const melhorPorRaiz = new Map<string, { cod: string; ativo: number; c: { nome: string; uf: string | null; municipio: string | null; raiz: string; situacao: string | null } }>()
    for (const [cod, m] of resumoByCod) {
      const c = cad.get(cod)
      if (!c || !c.raiz) continue
      if (!m.ativo_total && !m.carteira_credito) continue
      const ativo = m.ativo_total ?? 0
      const ex = melhorPorRaiz.get(c.raiz)
      if (!ex || ativo > ex.ativo) melhorPorRaiz.set(c.raiz, { cod, ativo, c: { ...c, raiz: c.raiz } })
    }

    // Entidades existentes por raiz (prefere matriz 0001)
    const { data: ents } = await admin
      .from('mercado_entidades').select('id, cnpj, tipos, uf, municipio').not('cnpj', 'is', null).limit(5000)
    const entPorRaiz = new Map<string, { id: string; cnpj: string; tipos: string[]; uf: string | null; municipio: string | null }>()
    for (const e of (ents ?? []) as { id: string; cnpj: string; tipos: string[]; uf: string | null; municipio: string | null }[]) {
      const raiz = soDigitos(e.cnpj).slice(0, 8)
      const ex = entPorRaiz.get(raiz)
      if (!ex || soDigitos(e.cnpj).slice(8, 12) === '0001') entPorRaiz.set(raiz, e)
    }

    // Vincula/cria entidade por raiz
    const raizToEntidade = new Map<string, string>()
    const novos: { cnpj: string; razao_social: string; tipos: string[]; uf: string | null; municipio: string | null; situacao: string | null; fonte: string; redistribuivel: boolean }[] = []
    let enriquecidos = 0
    for (const [raiz, best] of melhorPorRaiz) {
      const ent = entPorRaiz.get(raiz)
      if (ent) {
        raizToEntidade.set(raiz, ent.id)
        const tipos = new Set(ent.tipos ?? [])
        const precisaBanco = !tipos.has('banco')
        if (precisaBanco) tipos.add('banco')
        if (precisaBanco || !ent.uf) {
          await admin.from('mercado_entidades').update({
            tipos: [...tipos], uf: ent.uf || best.c.uf, municipio: ent.municipio || best.c.municipio,
          }).eq('id', ent.id)
          enriquecidos++
        }
      } else {
        novos.push({ cnpj: raiz, razao_social: best.c.nome || `Instituição ${best.cod}`, tipos: ['banco'], uf: best.c.uf, municipio: best.c.municipio, situacao: best.c.situacao, fonte: 'bcb', redistribuivel: true })
      }
    }
    let criados = 0
    for (let i = 0; i < novos.length; i += 500) {
      const lote = novos.slice(i, i + 500)
      const { data, error } = await admin.from('mercado_entidades').upsert(lote, { onConflict: 'cnpj' }).select('id, cnpj')
      if (error) throw new Error(`upsert bancos novos: ${error.message}`)
      criados += data?.length ?? 0
      for (const d of (data ?? []) as { id: string; cnpj: string }[]) raizToEntidade.set(soDigitos(d.cnpj).slice(0, 8), d.id)
    }

    // Métricas: full-refresh dos dados BCB
    await admin.from('mercado_metricas').delete().eq('fonte', 'bcb')
    const compResumo = compDe(resumo.anoMes)
    const compPJ = pj ? compDe(pj.anoMes) : null
    const linhas: { entidade_id: string; metrica: string; competencia: string; valor: number; unidade: string; fonte: string; redistribuivel: boolean }[] = []
    for (const [raiz, best] of melhorPorRaiz) {
      const eid = raizToEntidade.get(raiz)
      if (!eid) continue
      const m = resumoByCod.get(best.cod) ?? {}
      for (const [metrica, valor] of Object.entries(m)) {
        linhas.push({ entidade_id: eid, metrica, competencia: compResumo, valor, unidade: 'BRL', fonte: 'bcb', redistribuivel: true })
      }
      const vpj = pjByCod.get(best.cod)
      if (vpj != null && compPJ) {
        linhas.push({ entidade_id: eid, metrica: 'carteira_pj', competencia: compPJ, valor: vpj, unidade: 'BRL', fonte: 'bcb', redistribuivel: true })
      }
    }
    let metricas = 0
    for (let i = 0; i < linhas.length; i += 500) {
      const { error } = await admin.from('mercado_metricas').insert(linhas.slice(i, i + 500))
      if (error) throw new Error(`insert metricas: ${error.message}`)
      metricas += Math.min(500, linhas.length - i)
    }

    logger.info(`[etl-bcb] ok: ${melhorPorRaiz.size} bancos, ${enriquecidos} enriquecidos, ${criados} criados, ${metricas} métricas`)
    return { status: 'completed', anoMesResumo: resumo.anoMes, anoMesPJ: pj?.anoMes, bancos: melhorPorRaiz.size, enriquecidos, criados, metricas }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    logger.error?.('[etl-bcb] falhou', msg)
    return { status: 'failed', bancos: 0, enriquecidos: 0, criados: 0, metricas: 0, error: msg }
  }
}
