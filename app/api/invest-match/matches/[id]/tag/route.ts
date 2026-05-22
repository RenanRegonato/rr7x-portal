import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { audit, extractIp } from '@/lib/audit'
import { gateInvestMatch } from '@/lib/invest-match/auth-helpers'
import { toggleMatchTag } from '@/lib/invest-match/match-service'

interface RouteContext { params: Promise<{ id: string }> }

const BodySchema = z.object({
  tag: z.enum(['nda_assinado', 'reuniao_realizada', 'proposta_enviada', 'em_diligencia']),
})

// POST /api/invest-match/matches/[id]/tag  — alterna tag de negociação
export async function POST(req: NextRequest, { params }: RouteContext) {
  const { id } = await params
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const gate = await gateInvestMatch(user.id)
  if (!gate.ok) return NextResponse.json({ error: gate.error }, { status: gate.status })
  const escritorioId = gate.escritorioId

  let body: unknown
  try { body = await req.json() } catch { return NextResponse.json({ error: 'JSON inválido' }, { status: 400 }) }

  const parsed = BodySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Payload inválido', issues: parsed.error.flatten() }, { status: 400 })
  }

  try {
    const result = await toggleMatchTag(id, escritorioId, parsed.data.tag)

    void audit({
      event:    'match.tag_toggled',
      userId:   user.id,
      targetId: id,
      metadata: { tag: parsed.data.tag, tags: result.tags },
      ip:        extractIp(req.headers),
      userAgent: req.headers.get('user-agent'),
    })

    return NextResponse.json({ ok: true, ...result })
  } catch (e) {
    const err = e as Error
    console.error('[matches.[id].tag.POST]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
