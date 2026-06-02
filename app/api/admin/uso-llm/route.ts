import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'
import { getUserContext } from '@/lib/get-role'

async function requireAdmin() {
  const ctx = await getUserContext()
  if (!ctx || ctx.role !== 'admin') return null
  return ctx
}

type Row = {
  criado_em:           string
  analise_id:          string | null
  context:             string
  step:                string
  model:               string
  input_tokens:        number
  output_tokens:       number
  cache_write_tokens:  number
  cache_read_tokens:   number
  cost_usd:            number | null
  latency_ms:          number | null
}

type Bucket = {
  cost_usd:           number
  input_tokens:       number
  output_tokens:      number
  cache_read_tokens:  number
  cache_write_tokens: number
  calls:              number
}

function emptyBucket(): Bucket {
  return { cost_usd: 0, input_tokens: 0, output_tokens: 0, cache_read_tokens: 0, cache_write_tokens: 0, calls: 0 }
}

function addToBucket(b: Bucket, r: Row): void {
  b.cost_usd           += Number(r.cost_usd ?? 0)
  b.input_tokens       += r.input_tokens
  b.output_tokens      += r.output_tokens
  b.cache_read_tokens  += r.cache_read_tokens
  b.cache_write_tokens += r.cache_write_tokens
  b.calls              += 1
}

function dayKey(iso: string): string {
  return iso.slice(0, 10)
}

// GET /api/admin/uso-llm
// Janela: últimos 30 dias. Limite hard de 50k linhas (guard).
export async function GET(_req: NextRequest) {
  const ctx = await requireAdmin()
  if (!ctx) return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })

  const admin = createAdminClient()

  const now      = new Date()
  const from30   = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
  const from7    = new Date(now.getTime() - 7  * 24 * 60 * 60 * 1000)
  const today0   = new Date(now.getFullYear(), now.getMonth(), now.getDate())

  const { data, error } = await admin
    .from('llm_usage_log')
    .select('criado_em, analise_id, context, step, model, input_tokens, output_tokens, cache_write_tokens, cache_read_tokens, cost_usd, latency_ms')
    .gte('criado_em', from30.toISOString())
    .order('criado_em', { ascending: false })
    .limit(50_000)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const rows = (data ?? []) as Row[]

  // ── Totais por janela ─────────────────────────────────────────────
  const tHoje  = emptyBucket()
  const t7     = emptyBucket()
  const t30    = emptyBucket()

  // ── Custo por dia (30d) ───────────────────────────────────────────
  const dayMap = new Map<string, Bucket>()

  // ── Breakdown por step ────────────────────────────────────────────
  const stepMap = new Map<string, { context: string; step: string; model_top: string; bucket: Bucket; latency_sum: number; latency_count: number; models: Map<string, number> }>()

  // ── Por análise (30d) ─────────────────────────────────────────────
  const analiseMap = new Map<string, Bucket>()

  // ── Por modelo (30d) ──────────────────────────────────────────────
  const modelMap = new Map<string, Bucket>()

  for (const r of rows) {
    const ts = new Date(r.criado_em)
    addToBucket(t30, r)
    if (ts >= from7)  addToBucket(t7, r)
    if (ts >= today0) addToBucket(tHoje, r)

    const dk = dayKey(r.criado_em)
    if (!dayMap.has(dk)) dayMap.set(dk, emptyBucket())
    addToBucket(dayMap.get(dk)!, r)

    const stepKey = `${r.context}::${r.step}`
    if (!stepMap.has(stepKey)) {
      stepMap.set(stepKey, {
        context:        r.context,
        step:           r.step,
        model_top:      r.model,
        bucket:         emptyBucket(),
        latency_sum:    0,
        latency_count:  0,
        models:         new Map<string, number>(),
      })
    }
    const sm = stepMap.get(stepKey)!
    addToBucket(sm.bucket, r)
    if (typeof r.latency_ms === 'number') {
      sm.latency_sum   += r.latency_ms
      sm.latency_count += 1
    }
    sm.models.set(r.model, (sm.models.get(r.model) ?? 0) + 1)

    if (r.analise_id) {
      if (!analiseMap.has(r.analise_id)) analiseMap.set(r.analise_id, emptyBucket())
      addToBucket(analiseMap.get(r.analise_id)!, r)
    }

    if (!modelMap.has(r.model)) modelMap.set(r.model, emptyBucket())
    addToBucket(modelMap.get(r.model)!, r)
  }

  // Série diária completa: preenche dias sem dados com zero
  const daily_30d: { date: string; cost_usd: number; calls: number }[] = []
  for (let i = 29; i >= 0; i--) {
    const d  = new Date(today0.getTime() - i * 24 * 60 * 60 * 1000)
    const dk = d.toISOString().slice(0, 10)
    const b  = dayMap.get(dk) ?? emptyBucket()
    daily_30d.push({ date: dk, cost_usd: b.cost_usd, calls: b.calls })
  }

  // Top 20 análises por custo (30d)
  const topAnaliseIds = [...analiseMap.entries()]
    .sort((a, b) => b[1].cost_usd - a[1].cost_usd)
    .slice(0, 20)

  let analiseMeta = new Map<string, { nome_ativo: string | null; status: string | null }>()
  if (topAnaliseIds.length > 0) {
    const ids = topAnaliseIds.map(([id]) => id)
    const { data: aData } = await admin
      .from('analises')
      .select('id, nome_ativo, status')
      .in('id', ids)
    analiseMeta = new Map(
      (aData ?? []).map((a: { id: string; nome_ativo: string | null; status: string | null }) =>
        [a.id, { nome_ativo: a.nome_ativo, status: a.status }]
      )
    )
  }

  const top_analises = topAnaliseIds.map(([id, b]) => {
    const meta = analiseMeta.get(id)
    return {
      analise_id:  id,
      nome_ativo:  meta?.nome_ativo ?? null,
      status:      meta?.status     ?? null,
      cost_usd:    b.cost_usd,
      input_tokens:       b.input_tokens,
      output_tokens:      b.output_tokens,
      cache_read_tokens:  b.cache_read_tokens,
      cache_write_tokens: b.cache_write_tokens,
      calls:       b.calls,
    }
  })

  // Breakdown por step (ordenado por custo)
  const by_step = [...stepMap.values()]
    .map(s => {
      // modelo mais usado neste step
      let topModel = s.model_top
      let topCount = 0
      for (const [m, c] of s.models) {
        if (c > topCount) { topModel = m; topCount = c }
      }
      return {
        context:           s.context,
        step:              s.step,
        model:             topModel,
        cost_usd:          s.bucket.cost_usd,
        calls:             s.bucket.calls,
        input_tokens:      s.bucket.input_tokens,
        output_tokens:     s.bucket.output_tokens,
        cache_read_tokens: s.bucket.cache_read_tokens,
        avg_latency_ms:    s.latency_count > 0 ? Math.round(s.latency_sum / s.latency_count) : null,
      }
    })
    .sort((a, b) => b.cost_usd - a.cost_usd)

  // Cache hit rate (30d): cache_read / (cache_read + input + cache_write)
  // Interpretação: do total de input "potencial", quanto veio do cache (mais barato).
  const inputTotal = t30.input_tokens + t30.cache_read_tokens + t30.cache_write_tokens
  const cache_hit_rate_pct = inputTotal > 0
    ? (t30.cache_read_tokens / inputTotal) * 100
    : 0

  // Top modelos por custo
  const by_model = [...modelMap.entries()]
    .map(([model, b]) => ({
      model,
      cost_usd:      b.cost_usd,
      calls:         b.calls,
      input_tokens:  b.input_tokens,
      output_tokens: b.output_tokens,
    }))
    .sort((a, b) => b.cost_usd - a.cost_usd)

  return NextResponse.json({
    window_days: 30,
    totals: {
      hoje:    tHoje,
      sete_d:  t7,
      trinta_d: t30,
    },
    cache_hit_rate_pct,
    daily_30d,
    top_analises,
    by_step,
    by_model,
    sample_size: rows.length,
    truncated:   rows.length >= 50_000,
  })
}
