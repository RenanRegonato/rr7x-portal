import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { audit, extractIp } from '@/lib/audit'
import { resolveEscritorioId } from '@/lib/invest-match/auth-helpers'
import { getInvestidor } from '@/lib/invest-match/investidor-service'
import { inngest } from '@/lib/inngest'

interface RouteContext { params: Promise<{ id: string }> }

// POST /api/invest-match/investidores/[id]/buscar-oportunidades
// Originação reversa sob demanda: dispara o motor para buscar teses
// compatíveis com este investidor (Inngest async).
export async function POST(req: NextRequest, { params }: RouteContext) {
  const { id } = await params
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const escritorioId = await resolveEscritorioId(user.id)
  if (!escritorioId) return NextResponse.json({ error: 'Sem escritório' }, { status: 409 })

  const inv = await getInvestidor(id, escritorioId)
  if (!inv) return NextResponse.json({ error: 'Investidor não encontrado' }, { status: 404 })

  try {
    await inngest.send({
      name: 'invest-match/investidor.match_requested',
      data: { investidorId: id, userId: user.id },
    })

    void audit({
      event:    'investidor.updated',
      userId:   user.id,
      targetId: id,
      metadata: { acao: 'buscar_oportunidades', escritorio_id: escritorioId },
      ip:        extractIp(req.headers),
      userAgent: req.headers.get('user-agent'),
    })

    return NextResponse.json({ ok: true, enfileirado: true })
  } catch (e) {
    const err = e as Error
    console.error('[investidores.[id].buscar-oportunidades]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
