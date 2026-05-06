import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createAdminClient } from '@/lib/supabase-server'

const ADMIN_EMAIL = 'gestor@renanregonato.com.br'

async function verificarAdmin() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.email !== ADMIN_EMAIL) return null
  return user
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
    return {
      id:              u.id,
      email:           u.email,
      criado_em:       u.created_at,
      ultimo_login:    u.last_sign_in_at,
      role:            u.email === ADMIN_EMAIL ? 'admin' : (perfil?.role ?? 'assessor'),
      escritorio_id:   perfil?.escritorio_id ?? null,
      escritorio_nome: escritorio?.nome ?? null,
    }
  }).sort((a, b) => new Date(b.criado_em).getTime() - new Date(a.criado_em).getTime())

  const escritoriosLista = (escritorios ?? []).map(e => ({
    id:   e.id,
    nome: e.nome,
  }))

  return NextResponse.json({ usuarios: resultado, escritorios: escritoriosLista })
}

export async function POST(req: NextRequest) {
  if (!await verificarAdmin()) return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })

  const { user_id, role, escritorio_id } = await req.json()
  const admin = createAdminClient()

  const { data: existente } = await admin.from('perfis').select('user_id').eq('user_id', user_id).maybeSingle()

  const payload = {
    user_id,
    role,
    escritorio_id: escritorio_id || null,
    atualizado_em: new Date().toISOString(),
  }

  if (existente) {
    await admin.from('perfis').update(payload).eq('user_id', user_id)
  } else {
    await admin.from('perfis').insert({ ...payload, criado_em: new Date().toISOString() })
  }

  return NextResponse.json({ ok: true })
}
