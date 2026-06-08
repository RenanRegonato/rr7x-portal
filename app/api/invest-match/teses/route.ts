import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { audit, extractIp } from '@/lib/audit'
import { gateInvestMatch } from '@/lib/invest-match/auth-helpers'
import { TeseCreateSchema } from '@/lib/invest-match/schemas'
import { createManualThesis } from '@/lib/invest-match/manual-thesis-service'
import { inngest } from '@/lib/inngest'

// POST /api/invest-match/teses
// Cadastro MANUAL de tese (origem='manual', sem análise do Mandor).
// Gera embedding (best-effort) e dispara o motor de matching async (Inngest).
export const maxDuration = 30  // voyage embed ~3-5s

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const gate = await gateInvestMatch(user.id)
  if (!gate.ok) return NextResponse.json({ error: gate.error }, { status: gate.status })
  const escritorioId = gate.escritorioId

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 })
  }

  const parsed = TeseCreateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Payload inválido', issues: parsed.error.flatten() },
      { status: 400 },
    )
  }

  try {
    const result = await createManualThesis(parsed.data, {
      escritorioId,
      userId: user.id,
    })

    void audit({
      event:    'tese.created',
      userId:   user.id,
      targetId: result.id,
      metadata: {
        escritorio_id: escritorioId,
        origem:        'manual',
        tem_embedding: result.tem_embedding,
      },
      ip:        extractIp(req.headers),
      userAgent: req.headers.get('user-agent'),
    })

    // Dispara o motor de matching (async). analiseId=null pra tese manual.
    try {
      await inngest.send({
        name: 'invest-match/thesis.created',
        data: { teseId: result.id, analiseId: null, userId: user.id },
      })
    } catch (e) {
      console.error('[teses.POST] falha ao enfileirar matching:', e)
    }

    return NextResponse.json({
      ok:                   true,
      id:                   result.id,
      tem_embedding:        result.tem_embedding,
      matching_enfileirado: true,
    }, { status: 201 })
  } catch (e) {
    const err = e as Error
    console.error('[teses.POST]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
