import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'
import { getUserContext } from '@/lib/get-role'
import { PacoteUpdateSchema } from '@/lib/schemas'
import { audit, extractIp } from '@/lib/audit'

async function requireAdmin() {
  const ctx = await getUserContext()
  if (!ctx || ctx.role !== 'admin') return null
  return ctx
}

// GET /api/admin/pacotes/[id]
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireAdmin()
  if (!ctx) return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })

  const { id } = await params
  const admin = createAdminClient()

  const { data: pacote, error } = await admin
    .from('pacotes')
    .select(`
      id, escritorio_id, tipo, analises_total, analises_consumidas,
      status, observacoes, criado_em, atualizado_em,
      escritorios ( id, nome, cnpj )
    `)
    .eq('id', id)
    .maybeSingle()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!pacote) return NextResponse.json({ error: 'Pacote não encontrado' }, { status: 404 })

  return NextResponse.json({ pacote })
}

// PATCH /api/admin/pacotes/[id]
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireAdmin()
  if (!ctx) return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })

  const { id } = await params
  const body = await req.json()
  const parsed = PacoteUpdateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Dados inválidos', details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    )
  }

  const admin = createAdminClient()

  const { data: atual } = await admin
    .from('pacotes')
    .select('*')
    .eq('id', id)
    .maybeSingle()

  if (!atual) return NextResponse.json({ error: 'Pacote não encontrado' }, { status: 404 })

  // Constraint defensiva: novo total não pode ser menor que o já consumido
  if (parsed.data.analises_total !== undefined && parsed.data.analises_total < atual.analises_consumidas) {
    return NextResponse.json(
      { error: `Não é possível reduzir o total para ${parsed.data.analises_total}: já foram consumidas ${atual.analises_consumidas} análises.` },
      { status: 400 }
    )
  }

  // Constraint defensiva: institucional max 20
  if (
    atual.tipo === 'institucional' &&
    parsed.data.analises_total !== undefined &&
    parsed.data.analises_total > 20
  ) {
    return NextResponse.json(
      { error: 'Pacote institucional permite no máximo 20 análises' },
      { status: 400 }
    )
  }

  const update: Record<string, unknown> = {
    atualizado_em: new Date().toISOString(),
    ...parsed.data,
  }

  const { data: pacote, error } = await admin
    .from('pacotes')
    .update(update)
    .eq('id', id)
    .select()
    .single()

  if (error || !pacote) {
    return NextResponse.json({ error: error?.message ?? 'Erro ao atualizar' }, { status: 500 })
  }

  void audit({
    event:    'pacote.updated',
    userId:   ctx.userId,
    targetId: pacote.id,
    metadata: { changes: parsed.data },
    ip:       extractIp(req.headers),
    userAgent: req.headers.get('user-agent'),
  })

  return NextResponse.json({ pacote })
}

// DELETE /api/admin/pacotes/[id]
// Soft-delete: marca como 'encerrado'. Análises já vinculadas mantêm o pacote_id por histórico.
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireAdmin()
  if (!ctx) return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })

  const { id } = await params
  const admin = createAdminClient()

  const { data: pacote, error } = await admin
    .from('pacotes')
    .update({ status: 'encerrado', atualizado_em: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()

  if (error || !pacote) {
    return NextResponse.json({ error: error?.message ?? 'Pacote não encontrado' }, { status: 404 })
  }

  void audit({
    event:    'pacote.deleted',
    userId:   ctx.userId,
    targetId: pacote.id,
    metadata: { escritorio_id: pacote.escritorio_id, tipo: pacote.tipo },
    ip:       extractIp(req.headers),
    userAgent: req.headers.get('user-agent'),
  })

  return NextResponse.json({ ok: true })
}
