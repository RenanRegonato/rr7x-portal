import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createAdminClient } from '@/lib/supabase-server'

export async function GET() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const admin = createAdminClient()
  const { data } = await admin
    .from('escritorios')
    .select('*')
    .eq('user_id', user.id)
    .single()

  return NextResponse.json({ escritorio: data ?? null })
}

export async function PATCH(req: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const body = await req.json()
  const fields = ['nome', 'cnpj', 'endereco', 'cidade_uf', 'telefone', 'email_contato', 'site', 'tagline', 'logo_url']
  const update = Object.fromEntries(
    fields.filter(f => f in body).map(f => [f, body[f]])
  )

  const admin = createAdminClient()
  const { error } = await admin
    .from('escritorios')
    .upsert({ user_id: user.id, ...update, atualizado_em: new Date().toISOString() }, { onConflict: 'user_id' })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
