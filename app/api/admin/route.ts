import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'
import { getUserContext } from '@/lib/get-role'
import { AdminSubscriptionSchema, AdminCancelSchema } from '@/lib/schemas'
import { audit, extractIp } from '@/lib/audit'

async function verificarAdmin() {
  const ctx = await getUserContext()
  if (!ctx || ctx.role !== 'admin') return null
  return ctx
}

// Buscar usuário por email
export async function GET(req: NextRequest) {
  const ctx = await verificarAdmin()
  if (!ctx) return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })

  const email = req.nextUrl.searchParams.get('email')
  if (!email) return NextResponse.json({ error: 'Email obrigatório' }, { status: 400 })

  const admin = createAdminClient()

  const { data, error } = await admin.auth.admin.listUsers()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const usuario = data.users.find(u => u.email?.toLowerCase() === email.toLowerCase())
  if (!usuario) return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 })

  const { data: sub } = await admin
    .from('subscriptions')
    .select('*')
    .eq('user_id', usuario.id)
    .maybeSingle()

  void audit({
    event:    'admin.user_searched',
    userId:   ctx.userId,
    metadata: { searched_email: email },
    ip:       extractIp(req.headers),
    userAgent: req.headers.get('user-agent'),
  })

  return NextResponse.json({ usuario: { id: usuario.id, email: usuario.email, criado_em: usuario.created_at }, assinatura: sub })
}

// Ativar ou atualizar plano
export async function POST(req: NextRequest) {
  const ctx = await verificarAdmin()
  if (!ctx) return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })

  const body = await req.json()
  const parsed = AdminSubscriptionSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Dados inválidos', details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    )
  }
  const { user_id, plano } = parsed.data

  const admin = createAdminClient()

  const { data: existente } = await admin
    .from('subscriptions')
    .select('id')
    .eq('user_id', user_id)
    .maybeSingle()

  const payload = {
    user_id,
    plano,
    status: 'ativo',
    analises_restantes: plano === 'avulso' ? 1 : null,
    atualizado_em: new Date().toISOString(),
  }

  if (existente) {
    await admin.from('subscriptions').update(payload).eq('user_id', user_id)
  } else {
    await admin.from('subscriptions').insert(payload)
  }

  void audit({
    event:    'admin.plan_activated',
    userId:   ctx.userId,
    targetId: user_id,
    metadata: { plano },
    ip:       extractIp(req.headers),
    userAgent: req.headers.get('user-agent'),
  })

  return NextResponse.json({ ok: true })
}

// Cancelar plano
export async function DELETE(req: NextRequest) {
  const ctx = await verificarAdmin()
  if (!ctx) return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })

  const body = await req.json()
  const parsed = AdminCancelSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'user_id inválido' }, { status: 400 })
  }
  const { user_id } = parsed.data

  const admin = createAdminClient()
  await admin.from('subscriptions')
    .update({ status: 'cancelado', atualizado_em: new Date().toISOString() })
    .eq('user_id', user_id)

  void audit({
    event:    'admin.plan_cancelled',
    userId:   ctx.userId,
    targetId: user_id,
    ip:       extractIp(req.headers),
    userAgent: req.headers.get('user-agent'),
  })

  return NextResponse.json({ ok: true })
}
