import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { audit, extractIp } from '@/lib/audit'
import { gateInvestMatch } from '@/lib/invest-match/auth-helpers'
import { getTese, deleteTese } from '@/lib/invest-match/match-service'

interface RouteContext { params: Promise<{ id: string }> }

// GET /api/invest-match/teses/[id]
export async function GET(_req: NextRequest, { params }: RouteContext) {
  const { id } = await params
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const gate = await gateInvestMatch(user.id)
  if (!gate.ok) return NextResponse.json({ error: gate.error }, { status: gate.status })

  try {
    const tese = await getTese(id, gate.escritorioId)
    if (!tese) return NextResponse.json({ error: 'Não encontrada' }, { status: 404 })
    return NextResponse.json(tese)
  } catch (e) {
    const err = e as Error
    console.error('[teses.[id].GET]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// DELETE /api/invest-match/teses/[id]
// Hard delete — remove a linha do banco. Os matches da tese (e seus feedbacks)
// somem em cascata via FK. Irreversível.
export async function DELETE(req: NextRequest, { params }: RouteContext) {
  const { id } = await params
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const gate = await gateInvestMatch(user.id)
  if (!gate.ok) return NextResponse.json({ error: gate.error }, { status: gate.status })
  const escritorioId = gate.escritorioId

  try {
    await deleteTese(id, escritorioId)

    void audit({
      event:    'tese.deleted',
      userId:   user.id,
      targetId: id,
      metadata: { escritorio_id: escritorioId },
      ip:        extractIp(req.headers),
      userAgent: req.headers.get('user-agent'),
    })

    return NextResponse.json({ ok: true })
  } catch (e) {
    const err = e as Error
    console.error('[teses.[id].DELETE]', err)
    const status = /n[ãa]o encontrada/i.test(err.message) ? 404 : 500
    return NextResponse.json({ error: err.message }, { status })
  }
}
