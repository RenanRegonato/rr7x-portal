import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'
import { getUserContext } from '@/lib/get-role'
import { BenchmarkUpdateSchema } from '@/lib/schemas'
import { audit, extractIp } from '@/lib/audit'

async function requireAdmin() {
  const ctx = await getUserContext()
  if (!ctx || ctx.role !== 'admin') return null
  return ctx
}

// PATCH /api/admin/benchmarks/[id]
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireAdmin()
  if (!ctx) return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })

  const { id } = await params
  const body = await req.json()
  const parsed = BenchmarkUpdateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Dados inválidos', details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    )
  }
  const d = parsed.data

  // Validação de consistência: value_max >= value_min
  if (d.value_min !== undefined && d.value_max !== undefined && d.value_max < d.value_min) {
    return NextResponse.json({ error: 'value_max precisa ser >= value_min' }, { status: 400 })
  }

  const admin = createAdminClient()

  const update: Record<string, unknown> = {
    atualizado_em: new Date().toISOString(),
    ...d,
  }

  const { data: benchmark, error } = await admin
    .from('market_benchmarks')
    .update(update)
    .eq('id', id)
    .select()
    .single()

  if (error || !benchmark) {
    return NextResponse.json({ error: error?.message ?? 'Benchmark não encontrado' }, { status: 404 })
  }

  void audit({
    event:    'benchmark.updated',
    userId:   ctx.userId,
    targetId: benchmark.id,
    metadata: { changes: d },
    ip:       extractIp(req.headers),
    userAgent: req.headers.get('user-agent'),
  })

  return NextResponse.json({ benchmark })
}

// DELETE /api/admin/benchmarks/[id]
// Soft delete: marca ativo=false. Benchmark histórico continua na base.
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireAdmin()
  if (!ctx) return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })

  const { id } = await params
  const admin = createAdminClient()

  const { data: benchmark, error } = await admin
    .from('market_benchmarks')
    .update({ ativo: false, valid_to: new Date().toISOString().slice(0, 10), atualizado_em: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()

  if (error || !benchmark) {
    return NextResponse.json({ error: error?.message ?? 'Benchmark não encontrado' }, { status: 404 })
  }

  void audit({
    event:    'benchmark.archived',
    userId:   ctx.userId,
    targetId: benchmark.id,
    metadata: { instrument: benchmark.instrument, parameter: benchmark.parameter },
    ip:       extractIp(req.headers),
    userAgent: req.headers.get('user-agent'),
  })

  return NextResponse.json({ ok: true })
}
