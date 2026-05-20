import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { resolveEscritorioId } from '@/lib/invest-match/auth-helpers'
import { listMatches } from '@/lib/invest-match/match-service'
import type { StatusMatch } from '@/lib/invest-match/types'

const STATUS = [
  'sugerido', 'aprovado_auto', 'aprovado_admin', 'notificado', 'em_negociacao',
  'nda', 'proposta', 'dd', 'fechado', 'rejeitado_admin', 'rejeitado_investidor',
  'rejeitado_projeto', 'descartado',
] as const

const QuerySchema = z.object({
  status:       z.enum(STATUS).optional(),
  tese_id:      z.string().uuid().optional(),
  investidor_id: z.string().uuid().optional(),
  min_score:    z.coerce.number().min(0).max(100).optional(),
  limit:        z.coerce.number().int().min(1).max(200).optional().default(100),
  offset:       z.coerce.number().int().min(0).optional().default(0),
})

// GET /api/invest-match/matches?status=&tese_id=&investidor_id=&min_score=
export async function GET(req: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const escritorioId = await resolveEscritorioId(user.id)
  if (!escritorioId) return NextResponse.json({ error: 'Sem escritório' }, { status: 409 })

  const url = new URL(req.url)
  const parsed = QuerySchema.safeParse(Object.fromEntries(url.searchParams))
  if (!parsed.success) {
    return NextResponse.json({ error: 'Parâmetros inválidos', issues: parsed.error.flatten() }, { status: 400 })
  }

  try {
    const result = await listMatches({
      escritorioId,
      status:        parsed.data.status as StatusMatch | undefined,
      teseId:        parsed.data.tese_id,
      investidorId:  parsed.data.investidor_id,
      minScore:      parsed.data.min_score,
      limit:         parsed.data.limit,
      offset:        parsed.data.offset,
    })
    return NextResponse.json(result)
  } catch (e) {
    const err = e as Error
    console.error('[matches.GET]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
