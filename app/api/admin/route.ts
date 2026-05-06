import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'
import { getUserContext } from '@/lib/get-role'

async function verificarAdmin() {
  const ctx = await getUserContext()
  if (!ctx || ctx.role !== 'admin') return null
  return ctx
}

// Buscar usuário por email
export async function GET(req: NextRequest) {
  if (!await verificarAdmin()) return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })

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

  return NextResponse.json({ usuario: { id: usuario.id, email: usuario.email, criado_em: usuario.created_at }, assinatura: sub })
}

// Ativar ou atualizar plano
export async function POST(req: NextRequest) {
  if (!await verificarAdmin()) return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })

  const { user_id, plano } = await req.json()
  if (!user_id || !plano) return NextResponse.json({ error: 'Dados incompletos' }, { status: 400 })

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

  return NextResponse.json({ ok: true })
}

// Cancelar plano
export async function DELETE(req: NextRequest) {
  if (!await verificarAdmin()) return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })

  const { user_id } = await req.json()
  const admin = createAdminClient()

  await admin.from('subscriptions').update({ status: 'cancelado', atualizado_em: new Date().toISOString() }).eq('user_id', user_id)

  return NextResponse.json({ ok: true })
}
