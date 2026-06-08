import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'
import { getUserContext } from '@/lib/get-role'

// GET /api/analise/[id]/custo
// Custo real (COGS de LLM) acumulado por UMA análise, agregado do llm_usage_log.
// Admin-only: cost_usd é custo interno do Mandor, não deve vazar para o cliente.
// Não-admin recebe 403 e o card no front se esconde sozinho.

// Câmbio de referência para exibir o custo também em BRL. Estático e
// configurável por env — é só uma referência de leitura, não contábil.
const USD_BRL = Number(process.env.USD_BRL_RATE) || 5.45

interface Row {
  context:            string
  step:               string
  model:              string
  input_tokens:       number
  output_tokens:      number
  cache_read_tokens:  number
  cache_write_tokens: number
  cost_usd:           number | null
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await getUserContext()
  if (!ctx || ctx.role !== 'admin') {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })
  }

  const { id } = await params
  const admin = createAdminClient()

  const { data, error } = await admin
    .from('llm_usage_log')
    .select('context, step, model, input_tokens, output_tokens, cache_read_tokens, cache_write_tokens, cost_usd')
    .eq('analise_id', id)
    .limit(5000)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const rows = (data ?? []) as Row[]

  let totalUsd = 0
  let totalCalls = 0
  let inTok = 0, outTok = 0, cacheRead = 0, cacheWrite = 0

  // Agrega por step (context::step), para mostrar onde o custo se concentra.
  const stepMap = new Map<string, { context: string; step: string; cost_usd: number; calls: number }>()

  for (const r of rows) {
    const c = Number(r.cost_usd ?? 0)
    totalUsd += c
    totalCalls += 1
    inTok += r.input_tokens
    outTok += r.output_tokens
    cacheRead += r.cache_read_tokens
    cacheWrite += r.cache_write_tokens

    const key = `${r.context}::${r.step}`
    if (!stepMap.has(key)) stepMap.set(key, { context: r.context, step: r.step, cost_usd: 0, calls: 0 })
    const s = stepMap.get(key)!
    s.cost_usd += c
    s.calls += 1
  }

  const by_step = [...stepMap.values()].sort((a, b) => b.cost_usd - a.cost_usd)

  // Cache hit: do input "potencial" (input + cache_read + cache_write), quanto
  // veio do cache (mais barato). Indicador de eficiência de custo do deal.
  const inputPot = inTok + cacheRead + cacheWrite
  const cache_hit_rate_pct = inputPot > 0 ? (cacheRead / inputPot) * 100 : 0

  return NextResponse.json({
    analise_id:   id,
    has_data:     rows.length > 0,
    cost_usd:     totalUsd,
    cost_brl:     totalUsd * USD_BRL,
    usd_brl_rate: USD_BRL,
    calls:        totalCalls,
    tokens: { input: inTok, output: outTok, cache_read: cacheRead, cache_write: cacheWrite },
    cache_hit_rate_pct,
    by_step,
  })
}
