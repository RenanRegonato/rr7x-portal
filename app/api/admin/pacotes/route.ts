import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'
import { getUserContext } from '@/lib/get-role'
import { PacoteCreateSchema } from '@/lib/schemas'
import { audit, extractIp } from '@/lib/audit'

async function requireAdmin() {
  const ctx = await getUserContext()
  if (!ctx || ctx.role !== 'admin') return null
  return ctx
}

// GET /api/admin/pacotes
// Query opcional: ?escritorio_id=...
export async function GET(req: NextRequest) {
  const ctx = await requireAdmin()
  if (!ctx) return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })

  const escritorioId = req.nextUrl.searchParams.get('escritorio_id')
  const admin = createAdminClient()

  let query = admin
    .from('pacotes')
    .select(`
      id, escritorio_id, tipo, analises_total, analises_consumidas,
      status, observacoes, criado_em, atualizado_em,
      escritorios!inner ( id, nome, cnpj )
    `)
    .order('criado_em', { ascending: false })

  if (escritorioId) query = query.eq('escritorio_id', escritorioId)

  const { data, error } = await query

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ pacotes: data ?? [] })
}

// POST /api/admin/pacotes
export async function POST(req: NextRequest) {
  const ctx = await requireAdmin()
  if (!ctx) return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })

  const body = await req.json()
  const parsed = PacoteCreateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Dados inválidos', details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    )
  }
  const { escritorio_id, tipo, analises_total, observacoes } = parsed.data

  const admin = createAdminClient()

  const { data: escritorio } = await admin
    .from('escritorios')
    .select('id')
    .eq('id', escritorio_id)
    .maybeSingle()

  if (!escritorio) {
    return NextResponse.json({ error: 'Escritório não encontrado' }, { status: 404 })
  }

  const { data: pacote, error } = await admin
    .from('pacotes')
    .insert({
      escritorio_id,
      tipo,
      analises_total,
      analises_consumidas: 0,
      status: 'ativo',
      observacoes: observacoes ?? null,
      criado_por: ctx.userId,
    })
    .select()
    .single()

  if (error || !pacote) {
    return NextResponse.json({ error: error?.message ?? 'Erro ao criar pacote' }, { status: 500 })
  }

  void audit({
    event:    'pacote.created',
    userId:   ctx.userId,
    targetId: pacote.id,
    metadata: { escritorio_id, tipo, analises_total },
    ip:       extractIp(req.headers),
    userAgent: req.headers.get('user-agent'),
  })

  return NextResponse.json({ pacote })
}
