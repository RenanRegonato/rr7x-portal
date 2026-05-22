import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { audit, extractIp } from '@/lib/audit'
import { gateInvestMatch } from '@/lib/invest-match/auth-helpers'
import { getMatch, updateMatchStatus } from '@/lib/invest-match/match-service'
import type { StatusMatch } from '@/lib/invest-match/types'

interface RouteContext { params: Promise<{ id: string }> }

const STATUS = [
  'sugerido', 'aprovado_auto', 'aprovado_admin', 'notificado', 'em_negociacao',
  'nda', 'proposta', 'dd', 'fechado', 'rejeitado_admin', 'rejeitado_investidor',
  'rejeitado_projeto', 'descartado',
] as const

const PatchSchema = z.object({
  status: z.enum(STATUS),
  motivo: z.string().trim().max(1000).optional().nullable(),
})

// GET /api/invest-match/matches/[id]
export async function GET(_req: NextRequest, { params }: RouteContext) {
  const { id } = await params
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const gate = await gateInvestMatch(user.id)
  if (!gate.ok) return NextResponse.json({ error: gate.error }, { status: gate.status })
  const escritorioId = gate.escritorioId

  try {
    const match = await getMatch(id, escritorioId)
    if (!match) return NextResponse.json({ error: 'Não encontrado' }, { status: 404 })
    return NextResponse.json(match)
  } catch (e) {
    const err = e as Error
    console.error('[matches.[id].GET]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// PATCH /api/invest-match/matches/[id]  — muda status (curadoria/pipeline)
export async function PATCH(req: NextRequest, { params }: RouteContext) {
  const { id } = await params
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const gate = await gateInvestMatch(user.id)
  if (!gate.ok) return NextResponse.json({ error: gate.error }, { status: gate.status })
  const escritorioId = gate.escritorioId

  let body: unknown
  try { body = await req.json() } catch { return NextResponse.json({ error: 'JSON inválido' }, { status: 400 }) }

  const parsed = PatchSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Payload inválido', issues: parsed.error.flatten() }, { status: 400 })
  }

  try {
    const result = await updateMatchStatus({
      matchId:      id,
      escritorioId,
      novoStatus:   parsed.data.status as StatusMatch,
      userId:       user.id,
      motivo:       parsed.data.motivo ?? null,
    })

    void audit({
      event:    'match.status_changed',
      userId:   user.id,
      targetId: id,
      metadata: { de: result.de, para: result.para, escritorio_id: escritorioId },
      ip:        extractIp(req.headers),
      userAgent: req.headers.get('user-agent'),
    })

    return NextResponse.json({ ok: true, ...result })
  } catch (e) {
    const err = e as Error
    console.error('[matches.[id].PATCH]', err)
    const status = /inválida|não encontrado/i.test(err.message) ? 422 : 500
    return NextResponse.json({ error: err.message }, { status })
  }
}
