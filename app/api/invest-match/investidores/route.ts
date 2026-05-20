import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { audit, extractIp } from '@/lib/audit'
import {
  InvestidorCreateSchema, InvestidorListQuerySchema,
} from '@/lib/invest-match/schemas'
import {
  createInvestidor, listInvestidores,
} from '@/lib/invest-match/investidor-service'
import { resolveEscritorioId } from '@/lib/invest-match/auth-helpers'
import { inngest } from '@/lib/inngest'

// GET /api/invest-match/investidores
// Lista investidores do escritório do usuário.
//
// Query params:
//   - status: ativo | pausado | arquivado (default: todos)
//   - q:      busca livre por nome ou email
//   - limit:  1-200 (default 100)
//   - offset: paginação (default 0)
export async function GET(req: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const escritorioId = await resolveEscritorioId(user.id)
  if (!escritorioId) {
    return NextResponse.json(
      { error: 'Usuário sem escritório cadastrado' },
      { status: 409 },
    )
  }

  const url = new URL(req.url)
  const parsed = InvestidorListQuerySchema.safeParse({
    status: url.searchParams.get('status') ?? undefined,
    q:      url.searchParams.get('q') ?? undefined,
    limit:  url.searchParams.get('limit') ?? undefined,
    offset: url.searchParams.get('offset') ?? undefined,
  })
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Parâmetros inválidos', issues: parsed.error.flatten() },
      { status: 400 },
    )
  }

  try {
    const result = await listInvestidores({
      escritorioId,
      status: parsed.data.status,
      q:      parsed.data.q,
      limit:  parsed.data.limit,
      offset: parsed.data.offset,
    })
    return NextResponse.json({
      rows:  result.rows,
      total: result.total,
      limit: parsed.data.limit,
      offset: parsed.data.offset,
    })
  } catch (e) {
    const err = e as Error
    console.error('[investidores.GET]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}


// POST /api/invest-match/investidores
// Cria um novo investidor. Gera embedding se houver tese declarada.
export const maxDuration = 30  // voyage embed ~3-5s

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const escritorioId = await resolveEscritorioId(user.id)
  if (!escritorioId) {
    return NextResponse.json(
      { error: 'Usuário sem escritório cadastrado' },
      { status: 409 },
    )
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 })
  }

  const parsed = InvestidorCreateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Payload inválido', issues: parsed.error.flatten() },
      { status: 400 },
    )
  }

  try {
    const result = await createInvestidor(parsed.data, {
      escritorioId,
      userId: user.id,
    })

    void audit({
      event:    'investidor.created',
      userId:   user.id,
      targetId: result.id,
      metadata: {
        escritorio_id: escritorioId,
        tem_embedding: result.tem_embedding,
        tipo:          parsed.data.tipo,
      },
      ip:        extractIp(req.headers),
      userAgent: req.headers.get('user-agent'),
    })

    // Originação reversa: busca proativamente teses compatíveis (Inngest async).
    // Só vale a pena se o investidor tem tese declarada (embedding) — senão o
    // matching semântico não roda e o estrutural pode ser disparado sob demanda.
    if (result.tem_embedding) {
      try {
        await inngest.send({
          name: 'invest-match/investidor.match_requested',
          data: { investidorId: result.id, userId: user.id },
        })
      } catch (e) {
        console.error('[investidores.POST] falha ao enfileirar originação reversa:', e)
      }
    }

    return NextResponse.json({
      ok:            true,
      id:            result.id,
      tem_embedding: result.tem_embedding,
    }, { status: 201 })
  } catch (e) {
    const err = e as Error
    console.error('[investidores.POST]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
