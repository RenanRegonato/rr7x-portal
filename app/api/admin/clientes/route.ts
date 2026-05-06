import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createAdminClient } from '@/lib/supabase-server'

const ADMIN_EMAIL = 'gestor@renanregonato.com.br'

async function verificarAdmin() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.email !== ADMIN_EMAIL) return null
  return user
}

export async function GET(req: NextRequest) {
  if (!await verificarAdmin()) return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })

  const userId = req.nextUrl.searchParams.get('user_id')
  const admin  = createAdminClient()

  // Return analyses for a specific user
  if (userId) {
    const { data } = await admin
      .from('analises')
      .select('id, nome_ativo, status, criado_em, deal_intake')
      .eq('user_id', userId)
      .order('criado_em', { ascending: false })
    return NextResponse.json({ analises: data ?? [] })
  }

  const { data: usersData } = await admin.auth.admin.listUsers()
  const users = usersData?.users ?? []

  const [{ data: subs }, { data: analises }] = await Promise.all([
    admin.from('subscriptions').select('*'),
    admin.from('analises').select('user_id, status, criado_em'),
  ])

  const clientes = users.map(u => {
    const sub = subs?.find(s => s.user_id === u.id) ?? null
    const userAnalises = analises?.filter(a => a.user_id === u.id) ?? []
    return {
      id: u.id,
      email: u.email,
      criado_em: u.created_at,
      ultimo_login: u.last_sign_in_at,
      assinatura: sub,
      total_analises: userAnalises.length,
      ultima_analise: userAnalises.sort((a, b) => new Date(b.criado_em).getTime() - new Date(a.criado_em).getTime())[0]?.criado_em ?? null,
    }
  }).sort((a, b) => new Date(b.criado_em).getTime() - new Date(a.criado_em).getTime())

  return NextResponse.json({ clientes })
}

export async function POST(req: NextRequest) {
  if (!await verificarAdmin()) return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })

  const { user_id, plano } = await req.json()
  const admin = createAdminClient()

  const { data: existente } = await admin.from('subscriptions').select('id').eq('user_id', user_id).maybeSingle()
  const payload = { user_id, plano, status: 'ativo', analises_restantes: plano === 'avulso' ? 1 : null, atualizado_em: new Date().toISOString() }

  if (existente) {
    await admin.from('subscriptions').update(payload).eq('user_id', user_id)
  } else {
    await admin.from('subscriptions').insert(payload)
  }

  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest) {
  if (!await verificarAdmin()) return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })

  const { user_id } = await req.json()
  const admin = createAdminClient()
  await admin.from('subscriptions').update({ status: 'cancelado', atualizado_em: new Date().toISOString() }).eq('user_id', user_id)

  return NextResponse.json({ ok: true })
}
