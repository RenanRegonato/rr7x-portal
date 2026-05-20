import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { audit, extractIp } from '@/lib/audit'
import { resolveEscritorioId } from '@/lib/invest-match/auth-helpers'
import { getTese } from '@/lib/invest-match/match-service'
import { inngest } from '@/lib/inngest'

interface RouteContext { params: Promise<{ id: string }> }

// POST /api/invest-match/teses/[id]/rematch
// Re-dispara o motor de matching para uma tese existente (Inngest async).
export async function POST(req: NextRequest, { params }: RouteContext) {
  const { id } = await params
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const escritorioId = await resolveEscritorioId(user.id)
  if (!escritorioId) return NextResponse.json({ error: 'Sem escritório' }, { status: 409 })

  // Confirma posse da tese
  const tese = await getTese(id, escritorioId)
  if (!tese) return NextResponse.json({ error: 'Tese não encontrada' }, { status: 404 })

  try {
    await inngest.send({
      name: 'invest-match/thesis.created',
      data: { teseId: id, analiseId: tese.analise_id ?? null, userId: user.id },
    })

    void audit({
      event:    'tese.rematch_requested',
      userId:   user.id,
      targetId: id,
      metadata: { escritorio_id: escritorioId },
      ip:        extractIp(req.headers),
      userAgent: req.headers.get('user-agent'),
    })

    return NextResponse.json({ ok: true, enfileirado: true })
  } catch (e) {
    const err = e as Error
    console.error('[teses.[id].rematch]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
