import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { audit, extractIp } from '@/lib/audit'
import { gateInvestMatch } from '@/lib/invest-match/auth-helpers'
import { createMatchFeedback } from '@/lib/invest-match/feedback-service'

interface RouteContext { params: Promise<{ id: string }> }

const BodySchema = z.object({
  avaliacao: z.enum(['muito_bom', 'bom', 'neutro', 'ruim', 'muito_ruim']).optional().nullable(),
  motivo:    z.string().trim().max(1000).optional().nullable(),
  dimensoes_feedback: z.record(z.string(), z.string()).optional(),
})

// POST /api/invest-match/matches/[id]/feedback — avaliação manual do admin
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
    const result = await createMatchFeedback({
      matchId:           id,
      escritorioId,
      userId:            user.id,
      ratedBy:           'admin',
      avaliacao:         parsed.data.avaliacao ?? null,
      motivo:            parsed.data.motivo ?? null,
      dimensoesFeedback: parsed.data.dimensoes_feedback,
    })

    void audit({
      event:    'match.feedback',
      userId:   user.id,
      targetId: id,
      metadata: { feedback_id: result.id, avaliacao: parsed.data.avaliacao, escritorio_id: escritorioId },
      ip:        extractIp(req.headers),
      userAgent: req.headers.get('user-agent'),
    })

    return NextResponse.json({ ok: true, id: result.id }, { status: 201 })
  } catch (e) {
    const err = e as Error
    console.error('[matches.[id].feedback.POST]', err)
    const status = /n[ãa]o encontrado/i.test(err.message) ? 404 : 500
    return NextResponse.json({ error: err.message }, { status })
  }
}
