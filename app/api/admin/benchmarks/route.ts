import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'
import { getUserContext } from '@/lib/get-role'
import { BenchmarkCreateSchema } from '@/lib/schemas'
import { audit, extractIp } from '@/lib/audit'

async function requireAdmin() {
  const ctx = await getUserContext()
  if (!ctx || ctx.role !== 'admin') return null
  return ctx
}

// GET /api/admin/benchmarks?instrument=FIDC&ativo=true
export async function GET(req: NextRequest) {
  const ctx = await requireAdmin()
  if (!ctx) return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })

  const sp = req.nextUrl.searchParams
  const instrument = sp.get('instrument') ?? ''
  const onlyAtivo  = sp.get('ativo') !== 'false'  // default true

  const admin = createAdminClient()
  let q = admin
    .from('market_benchmarks')
    .select('*')
    .order('instrument', { ascending: true })
    .order('parameter',  { ascending: true })

  if (instrument) q = q.eq('instrument', instrument)
  if (onlyAtivo)  q = q.eq('ativo', true)

  const { data, error } = await q
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ benchmarks: data ?? [] })
}

// POST /api/admin/benchmarks
export async function POST(req: NextRequest) {
  const ctx = await requireAdmin()
  if (!ctx) return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })

  const body = await req.json()
  const parsed = BenchmarkCreateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Dados inválidos', details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    )
  }
  const d = parsed.data

  const admin = createAdminClient()

  const { data: benchmark, error } = await admin
    .from('market_benchmarks')
    .insert({
      instrument:  d.instrument,
      parameter:   d.parameter,
      value_min:   d.value_min,
      value_max:   d.value_max,
      unit:        d.unit,
      descricao:   d.descricao  ?? null,
      notes:       d.notes      ?? null,
      source:      d.source     ?? null,
      valid_from:  d.valid_from ?? new Date().toISOString().slice(0, 10),
      valid_to:    d.valid_to   ?? null,
      ativo:       true,
      criado_por:  ctx.userId,
    })
    .select()
    .single()

  if (error || !benchmark) {
    return NextResponse.json({ error: error?.message ?? 'Erro ao criar' }, { status: 500 })
  }

  void audit({
    event:    'benchmark.created',
    userId:   ctx.userId,
    targetId: benchmark.id,
    metadata: { instrument: d.instrument, parameter: d.parameter, value_min: d.value_min, value_max: d.value_max, unit: d.unit },
    ip:       extractIp(req.headers),
    userAgent: req.headers.get('user-agent'),
  })

  return NextResponse.json({ benchmark })
}
