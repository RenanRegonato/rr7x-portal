import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createAdminClient } from '@/lib/supabase-server'

const ADMIN_EMAIL = 'gestor@renanregonato.com.br'

async function isOwner(analiseId: string, userId: string, userEmail: string): Promise<boolean> {
  const admin = createAdminClient()
  const { data } = await admin.from('analises').select('user_id').eq('id', analiseId).single()
  return data?.user_id === userId || userEmail === ADMIN_EMAIL
}

// GET /api/analise/members?id=X
export async function GET(req: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const id = req.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'ID obrigatório' }, { status: 400 })

  const admin = createAdminClient()
  const { data } = await admin
    .from('deal_members')
    .select('id, user_id, role, adicionado_em, user_email:perfis(nome)')
    .eq('analise_id', id)
    .order('adicionado_em')

  return NextResponse.json(data ?? [])
}

// POST /api/analise/members — adiciona membro por email
export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const { analise_id, email, role } = await req.json() as {
    analise_id: string; email: string; role: string
  }

  if (!analise_id || !email || !role) return NextResponse.json({ error: 'Campos obrigatórios ausentes' }, { status: 400 })

  const ownerOk = await isOwner(analise_id, user.id, user.email ?? '')
  if (!ownerOk) return NextResponse.json({ error: 'Apenas o dono do deal pode adicionar membros' }, { status: 403 })

  const admin = createAdminClient()

  // Busca o user_id pelo email
  const { data: users } = await admin.auth.admin.listUsers()
  const target = users?.users?.find((u) => u.email === email.toLowerCase().trim())

  if (!target) return NextResponse.json({ error: 'Usuário não encontrado na plataforma' }, { status: 404 })
  if (target.id === user.id) return NextResponse.json({ error: 'Você já é o dono deste deal' }, { status: 400 })

  const { error } = await admin.from('deal_members').upsert(
    { analise_id, user_id: target.id, role },
    { onConflict: 'analise_id,user_id' }
  )
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Registra evento no pipeline
  await admin.from('deal_pipeline_events').insert({
    analise_id,
    user_id:    user.id,
    user_email: user.email,
    tipo:       'comment',
    comentario: `${email} adicionado como ${role}`,
  })

  return NextResponse.json({ ok: true })
}

// DELETE /api/analise/members — remove membro
export async function DELETE(req: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const { analise_id, user_id } = await req.json() as { analise_id: string; user_id: string }

  const ownerOk = await isOwner(analise_id, user.id, user.email ?? '')
  if (!ownerOk) return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })

  const admin = createAdminClient()
  await admin.from('deal_members').delete().eq('analise_id', analise_id).eq('user_id', user_id)

  return NextResponse.json({ ok: true })
}
