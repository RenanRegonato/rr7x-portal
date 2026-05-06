import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'
import { getUserContext } from '@/lib/get-role'

async function verificarAdmin() {
  const ctx = await getUserContext()
  if (!ctx || ctx.role !== 'admin') return null
  return ctx
}

export async function GET() {
  if (!await verificarAdmin()) return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })

  const admin = createAdminClient()
  const { data: usersData } = await admin.auth.admin.listUsers()
  const users = usersData?.users ?? []

  const [{ data: perfis }, { data: escritorios }] = await Promise.all([
    admin.from('perfis').select('*'),
    admin.from('escritorios').select('id, nome, user_id'),
  ])

  const resultado = users.map(u => {
    const perfil    = perfis?.find(p => p.user_id === u.id) ?? null
    const escritorio = escritorios?.find(e => e.id === perfil?.escritorio_id) ?? null
    const bannedUntil = (u as { banned_until?: string | null }).banned_until
    return {
      id:              u.id,
      email:           u.email,
      criado_em:       u.created_at,
      ultimo_login:    u.last_sign_in_at,
      role:            perfil?.role ?? 'assessor',
      escritorio_id:   perfil?.escritorio_id ?? null,
      escritorio_nome: escritorio?.nome ?? null,
      banido:          bannedUntil ? new Date(bannedUntil) > new Date() : false,
    }
  }).sort((a, b) => new Date(b.criado_em).getTime() - new Date(a.criado_em).getTime())

  const escritoriosLista = (escritorios ?? []).map(e => ({ id: e.id, nome: e.nome }))

  return NextResponse.json({ usuarios: resultado, escritorios: escritoriosLista })
}

export async function POST(req: NextRequest) {
  if (!await verificarAdmin()) return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })

  const body = await req.json()
  const action = body.action ?? 'perfil'
  const admin  = createAdminClient()

  // ── Convidar novo usuário ──────────────────────────────────────────────────
  if (action === 'invite') {
    const { email, role, escritorio_id, escritorio_nome } = body
    if (!email || !role) return NextResponse.json({ error: 'Dados incompletos' }, { status: 400 })

    // If inviting a gerente without an existing escritório, create one first
    let resolvedEscId: string | null = escritorio_id || null

    if (role === 'gerente' && !resolvedEscId && escritorio_nome) {
      const { data: esc } = await admin
        .from('escritorios')
        .insert({ nome: escritorio_nome })
        .select('id')
        .single()
      resolvedEscId = esc?.id ?? null
    }

    const { data: inviteData, error: inviteErr } = await admin.auth.admin.inviteUserByEmail(email, {
      data: {
        invited_role:          role,
        invited_escritorio_id: resolvedEscId,
      },
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? ''}/auth/callback?next=/auth/definir-senha`,
    })

    if (inviteErr) return NextResponse.json({ error: inviteErr.message }, { status: 500 })

    // Pre-create perfil so the callback skips auto-provisioning
    if (inviteData?.user) {
      await admin.from('perfis').upsert({
        user_id:       inviteData.user.id,
        role,
        escritorio_id: resolvedEscId,
        atualizado_em: new Date().toISOString(),
      }, { onConflict: 'user_id' })
    }

    return NextResponse.json({ ok: true })
  }

  // ── Banir usuário ──────────────────────────────────────────────────────────
  if (action === 'ban') {
    const { user_id } = body
    if (!user_id) return NextResponse.json({ error: 'user_id obrigatório' }, { status: 400 })
    const { error } = await admin.auth.admin.updateUserById(user_id, { ban_duration: '876000h' })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  }

  // ── Desbanir usuário ───────────────────────────────────────────────────────
  if (action === 'unban') {
    const { user_id } = body
    if (!user_id) return NextResponse.json({ error: 'user_id obrigatório' }, { status: 400 })
    const { error } = await admin.auth.admin.updateUserById(user_id, { ban_duration: 'none' })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  }

  // ── Atualizar perfil (comportamento original) ──────────────────────────────
  const { user_id, role, escritorio_id } = body
  if (!user_id) return NextResponse.json({ error: 'user_id obrigatório' }, { status: 400 })

  const payload = {
    user_id,
    role,
    escritorio_id: escritorio_id || null,
    atualizado_em: new Date().toISOString(),
  }

  const { data: existente } = await admin.from('perfis').select('user_id').eq('user_id', user_id).maybeSingle()

  if (existente) {
    await admin.from('perfis').update(payload).eq('user_id', user_id)
  } else {
    await admin.from('perfis').insert({ ...payload, criado_em: new Date().toISOString() })
  }

  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest) {
  if (!await verificarAdmin()) return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })

  const { user_id } = await req.json()
  if (!user_id) return NextResponse.json({ error: 'user_id obrigatório' }, { status: 400 })

  const admin = createAdminClient()
  const { error } = await admin.auth.admin.deleteUser(user_id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
