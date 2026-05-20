import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { audit, extractIp } from '@/lib/audit'
import { InvestidorUpdateSchema } from '@/lib/invest-match/schemas'
import {
  getInvestidor, updateInvestidor, archiveInvestidor,
} from '@/lib/invest-match/investidor-service'
import { resolveEscritorioId } from '@/lib/invest-match/auth-helpers'

export const maxDuration = 30  // voyage embed quando regenera

interface RouteContext { params: Promise<{ id: string }> }

// GET /api/invest-match/investidores/[id]
export async function GET(_req: NextRequest, { params }: RouteContext) {
  const { id } = await params
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const escritorioId = await resolveEscritorioId(user.id)
  if (!escritorioId) {
    return NextResponse.json({ error: 'Sem escritório' }, { status: 409 })
  }

  try {
    const inv = await getInvestidor(id, escritorioId)
    if (!inv) return NextResponse.json({ error: 'Não encontrado' }, { status: 404 })
    // Não devolve o embedding (vetor de 1024 floats — desperdício de banda).
    const { tese_embedding: _, ...rest } = inv
    void _
    return NextResponse.json(rest)
  } catch (e) {
    const err = e as Error
    console.error('[investidores.[id].GET]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}


// PATCH /api/invest-match/investidores/[id]
export async function PATCH(req: NextRequest, { params }: RouteContext) {
  const { id } = await params
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const escritorioId = await resolveEscritorioId(user.id)
  if (!escritorioId) {
    return NextResponse.json({ error: 'Sem escritório' }, { status: 409 })
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 })
  }

  const parsed = InvestidorUpdateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Payload inválido', issues: parsed.error.flatten() },
      { status: 400 },
    )
  }

  try {
    const result = await updateInvestidor(parsed.data, {
      investidorId: id,
      escritorioId,
    })

    void audit({
      event:    'investidor.updated',
      userId:   user.id,
      targetId: result.id,
      metadata: {
        escritorio_id:         escritorioId,
        embedding_regenerated: result.embedding_regenerated,
        campos_alterados:      Object.keys(parsed.data),
      },
      ip:        extractIp(req.headers),
      userAgent: req.headers.get('user-agent'),
    })

    return NextResponse.json({ ok: true, ...result })
  } catch (e) {
    const err = e as Error
    console.error('[investidores.[id].PATCH]', err)
    const status = /n[ãa]o encontrado/i.test(err.message) ? 404 : 500
    return NextResponse.json({ error: err.message }, { status })
  }
}


// DELETE /api/invest-match/investidores/[id]
// Soft delete — marca status='arquivado'. Não remove a linha pra preservar
// histórico de matches/feedback. Hard delete só via Supabase direto se preciso.
export async function DELETE(req: NextRequest, { params }: RouteContext) {
  const { id } = await params
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const escritorioId = await resolveEscritorioId(user.id)
  if (!escritorioId) {
    return NextResponse.json({ error: 'Sem escritório' }, { status: 409 })
  }

  try {
    await archiveInvestidor({ investidorId: id, escritorioId })

    void audit({
      event:    'investidor.archived',
      userId:   user.id,
      targetId: id,
      metadata: { escritorio_id: escritorioId },
      ip:        extractIp(req.headers),
      userAgent: req.headers.get('user-agent'),
    })

    return NextResponse.json({ ok: true })
  } catch (e) {
    const err = e as Error
    console.error('[investidores.[id].DELETE]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
