import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'
import { getUserContext } from '@/lib/get-role'
import { BenchmarkEscritorioUpdateSchema } from '@/lib/schemas'
import { audit, extractIp } from '@/lib/audit'

// PATCH /api/escritorio/benchmarks/[id]
// Optimistic locking via expected_version. Atualiza apenas overrides do
// próprio escritório do gerente.
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await getUserContext()
  if (!ctx) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  if (ctx.role !== 'gerente' && ctx.role !== 'admin') {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
  }

  const { id } = await params
  const body = await req.json()
  const parsed = BenchmarkEscritorioUpdateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Dados inválidos', details: parsed.error.flatten().fieldErrors }, { status: 400 })
  }
  const { expected_version, ...changes } = parsed.data

  const adminCli = createAdminClient()

  // Verifica propriedade + version atual
  const { data: row } = await adminCli
    .from('market_benchmarks')
    .select('id, escritorio_id, version')
    .eq('id', id)
    .maybeSingle()

  if (!row) return NextResponse.json({ error: 'Benchmark não encontrado' }, { status: 404 })

  // Bloqueio: gerente só pode editar overrides do próprio escritório
  if (ctx.role === 'gerente') {
    if (!row.escritorio_id) {
      return NextResponse.json({ error: 'Gerente não pode editar benchmarks globais. Solicite ao admin Mandor.' }, { status: 403 })
    }
    if (row.escritorio_id !== ctx.escritorioId) {
      return NextResponse.json({ error: 'Sem acesso a benchmarks de outro escritório' }, { status: 403 })
    }
  }

  // Optimistic locking
  if (row.version !== expected_version) {
    return NextResponse.json({
      error:           'Outro usuário editou este benchmark. Recarregue para ver a versão atual.',
      conflict:        true,
      server_version:  row.version,
      sent_version:    expected_version,
    }, { status: 409 })
  }

  // Validação value_max >= value_min se ambos vierem
  if (changes.value_min !== undefined && changes.value_max !== undefined && changes.value_max < changes.value_min) {
    return NextResponse.json({ error: 'value_max precisa ser >= value_min' }, { status: 400 })
  }

  const update = {
    ...changes,
    version:       row.version + 1,
    atualizado_em: new Date().toISOString(),
  }

  const { data: updated, error } = await adminCli
    .from('market_benchmarks')
    .update(update)
    .eq('id', id)
    .eq('version', expected_version)  // double-check no UPDATE também
    .select()
    .single()

  if (error || !updated) {
    return NextResponse.json({ error: error?.message ?? 'Erro ao atualizar' }, { status: 500 })
  }

  void audit({
    event:    'benchmark.updated',
    userId:   ctx.userId,
    targetId: updated.id,
    metadata: { changes, escritorio_id: row.escritorio_id, escopo: 'escritorio', from_version: expected_version, to_version: updated.version },
    ip:       extractIp(req.headers),
    userAgent: req.headers.get('user-agent'),
  })

  return NextResponse.json({ benchmark: updated })
}

// DELETE /api/escritorio/benchmarks/[id]
// Remove override → pipeline volta a usar o global.
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await getUserContext()
  if (!ctx) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  if (ctx.role !== 'gerente' && ctx.role !== 'admin') {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
  }

  const { id } = await params
  const adminCli = createAdminClient()

  const { data: row } = await adminCli
    .from('market_benchmarks')
    .select('id, escritorio_id, instrument, parameter')
    .eq('id', id)
    .maybeSingle()

  if (!row) return NextResponse.json({ error: 'Benchmark não encontrado' }, { status: 404 })

  if (ctx.role === 'gerente') {
    if (!row.escritorio_id || row.escritorio_id !== ctx.escritorioId) {
      return NextResponse.json({ error: 'Sem acesso' }, { status: 403 })
    }
  }

  // Soft delete: ativo=false. Pipeline volta a usar o global automaticamente.
  const { error } = await adminCli
    .from('market_benchmarks')
    .update({ ativo: false, atualizado_em: new Date().toISOString() })
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  void audit({
    event:    'benchmark.archived',
    userId:   ctx.userId,
    targetId: id,
    metadata: { escritorio_id: row.escritorio_id, instrument: row.instrument, parameter: row.parameter, escopo: 'escritorio' },
    ip:       extractIp(req.headers),
    userAgent: req.headers.get('user-agent'),
  })

  return NextResponse.json({ ok: true })
}
