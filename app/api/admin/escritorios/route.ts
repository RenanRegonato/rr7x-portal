import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'
import { getUserContext } from '@/lib/get-role'

async function verificarAdmin() {
  const ctx = await getUserContext()
  if (!ctx || ctx.role !== 'admin') return null
  return ctx
}

export async function GET(req: NextRequest) {
  if (!await verificarAdmin()) return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })

  const admin = createAdminClient()
  const id    = req.nextUrl.searchParams.get('id')

  // Detalhe completo de um escritório (incluindo usuários)
  if (id) {
    const [{ data: escritorio }, { data: perfis }, { data: usersData }] = await Promise.all([
      admin.from('escritorios').select('*').eq('id', id).single(),
      admin.from('perfis').select('user_id, role').eq('escritorio_id', id),
      admin.auth.admin.listUsers(),
    ])

    const allUsers  = usersData?.users ?? []
    const userIds   = (perfis ?? []).map(p => p.user_id)

    const usuarios = allUsers
      .filter(u => userIds.includes(u.id))
      .map(u => {
        const perfil      = perfis?.find(p => p.user_id === u.id)
        const bannedUntil = (u as { banned_until?: string | null }).banned_until
        return {
          id:           u.id,
          email:        u.email ?? '',
          nome:         (u.user_metadata?.nome as string | undefined) ?? null,
          role:         (perfil?.role ?? 'assessor') as string,
          criado_em:    u.created_at,
          ultimo_login: u.last_sign_in_at ?? null,
          banido:       bannedUntil ? new Date(bannedUntil) > new Date() : false,
        }
      })
      .sort((a, b) => new Date(b.criado_em).getTime() - new Date(a.criado_em).getTime())

    return NextResponse.json({ escritorio, usuarios })
  }

  // Lista todos os escritórios com resumo
  const [{ data: escritorios }, { data: perfis }, { data: usersData }] = await Promise.all([
    admin.from('escritorios').select('*').order('criado_em', { ascending: false }),
    admin.from('perfis').select('user_id, role, escritorio_id'),
    admin.auth.admin.listUsers(),
  ])

  const users     = usersData?.users ?? []

  const resultado = (escritorios ?? []).map(e => {
    const membros      = (perfis ?? []).filter(p => p.escritorio_id === e.id)
    const gerente      = membros.find(p => p.role === 'gerente')
    const gerenteUser  = gerente ? users.find(u => u.id === gerente.user_id) : null
    return {
      id:              e.id,
      nome:            e.nome,
      criado_em:       e.criado_em,
      gerente_email:   gerenteUser?.email ?? null,
      total_usuarios:  membros.length,
      plano:           (e as Record<string, unknown>).plano           ?? null,
      plano_status:    (e as Record<string, unknown>).plano_status    ?? null,
      invest_match_enabled: (e as Record<string, unknown>).invest_match_enabled === true,
    }
  })

  return NextResponse.json({ escritorios: resultado })
}

export async function POST(req: NextRequest) {
  if (!await verificarAdmin()) return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })

  const body   = await req.json()
  const action = body.action ?? 'create'
  const admin  = createAdminClient()

  // Criar escritório
  if (action === 'create') {
    const { nome } = body
    if (!nome?.trim()) return NextResponse.json({ error: 'Nome obrigatório' }, { status: 400 })
    const { data, error } = await admin
      .from('escritorios')
      .insert({ nome: nome.trim() })
      .select('id, nome')
      .single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ escritorio: data })
  }

  // Convidar usuário para escritório
  if (action === 'invite_user') {
    const { escritorio_id, email, role } = body
    if (!escritorio_id || !email || !role)
      return NextResponse.json({ error: 'Dados incompletos' }, { status: 400 })

    const { data: inviteData, error: inviteErr } = await admin.auth.admin.inviteUserByEmail(email, {
      data: { invited_role: role, invited_escritorio_id: escritorio_id },
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.mandor.com.br'}/auth/definir-senha`,
    })
    if (inviteErr) return NextResponse.json({ error: inviteErr.message }, { status: 500 })

    if (inviteData?.user) {
      await admin.from('perfis').upsert({
        user_id:       inviteData.user.id,
        role,
        escritorio_id,
        atualizado_em: new Date().toISOString(),
      }, { onConflict: 'user_id' })
    }
    return NextResponse.json({ ok: true })
  }

  // Atualizar role de usuário
  if (action === 'update_user_role') {
    const { user_id, role, escritorio_id } = body
    if (!user_id || !role) return NextResponse.json({ error: 'Dados incompletos' }, { status: 400 })
    const { error } = await admin.from('perfis').upsert(
      { user_id, role, escritorio_id, atualizado_em: new Date().toISOString() },
      { onConflict: 'user_id' }
    )
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  }

  // Banir usuário
  if (action === 'ban_user') {
    const { user_id } = body
    const { error } = await admin.auth.admin.updateUserById(user_id, { ban_duration: '876000h' })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  }

  // Desbanir usuário
  if (action === 'unban_user') {
    const { user_id } = body
    const { error } = await admin.auth.admin.updateUserById(user_id, { ban_duration: 'none' })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  }

  // Remover usuário do escritório (sem excluir a conta)
  if (action === 'remove_user') {
    const { user_id } = body
    const { error } = await admin.from('perfis').delete().eq('user_id', user_id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  }

  // Excluir usuário permanentemente
  if (action === 'delete_user') {
    const { user_id } = body
    await admin.from('perfis').delete().eq('user_id', user_id)
    const { error } = await admin.auth.admin.deleteUser(user_id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ error: 'Ação inválida' }, { status: 400 })
}

export async function PATCH(req: NextRequest) {
  if (!await verificarAdmin()) return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })

  const body = await req.json()
  const { id, nome, plano, plano_status, plano_limite_analises, invest_match_enabled } = body
  if (!id) return NextResponse.json({ error: 'ID obrigatório' }, { status: 400 })

  const admin  = createAdminClient()
  const update: Record<string, unknown> = { atualizado_em: new Date().toISOString() }

  if (nome              !== undefined) update.nome                  = nome.trim()
  if (plano             !== undefined) update.plano                 = plano
  if (plano_status      !== undefined) update.plano_status          = plano_status
  if (plano_limite_analises !== undefined) update.plano_limite_analises = plano_limite_analises ?? null
  if (invest_match_enabled !== undefined) update.invest_match_enabled = invest_match_enabled === true

  const { error } = await admin.from('escritorios').update(update).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest) {
  if (!await verificarAdmin()) return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })

  const { id } = await req.json()
  if (!id) return NextResponse.json({ error: 'ID obrigatório' }, { status: 400 })

  const admin = createAdminClient()
  const { error } = await admin.from('escritorios').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
