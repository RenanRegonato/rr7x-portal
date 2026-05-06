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

  const [{ data: escritorios }, { data: perfis }, { data: usersData }] = await Promise.all([
    admin.from('escritorios').select('id, nome, user_id, criado_em').order('criado_em', { ascending: false }),
    admin.from('perfis').select('user_id, role, escritorio_id').eq('role', 'gerente'),
    admin.auth.admin.listUsers(),
  ])

  const users = usersData?.users ?? []

  const resultado = (escritorios ?? []).map(e => {
    const gerente = (perfis ?? []).find(p => p.escritorio_id === e.id)
    const gerenteUser = gerente ? users.find(u => u.id === gerente.user_id) : null
    return {
      id:            e.id,
      nome:          e.nome,
      criado_em:     e.criado_em,
      gerente_id:    gerente?.user_id ?? null,
      gerente_email: gerenteUser?.email ?? null,
    }
  })

  return NextResponse.json({ escritorios: resultado })
}

export async function POST(req: NextRequest) {
  if (!await verificarAdmin()) return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })

  const { nome } = await req.json()
  if (!nome?.trim()) return NextResponse.json({ error: 'Nome obrigatório' }, { status: 400 })

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('escritorios')
    .insert({ nome: nome.trim() })
    .select('id, nome')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ escritorio: data })
}

export async function PATCH(req: NextRequest) {
  if (!await verificarAdmin()) return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })

  const { id, nome } = await req.json()
  if (!id || !nome?.trim()) return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 })

  const admin = createAdminClient()
  const { error } = await admin
    .from('escritorios')
    .update({ nome: nome.trim(), atualizado_em: new Date().toISOString() })
    .eq('id', id)

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
