import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createAdminClient } from '@/lib/supabase-server'
import { isAdminViewer } from '@/lib/get-role'

async function verificarAdmin() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  if (!(await isAdminViewer(user.id))) return null
  return user
}

export async function GET() {
  if (!await verificarAdmin()) return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })
  const admin = createAdminClient()
  const { data, error } = await admin.from('agent_prompts').select('*').order('ordem')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ agentes: data })
}

export async function PATCH(req: NextRequest) {
  if (!await verificarAdmin()) return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })
  const { id, system_prompt } = await req.json()
  if (!id || !system_prompt) return NextResponse.json({ error: 'Dados incompletos' }, { status: 400 })
  const admin = createAdminClient()
  const { error } = await admin
    .from('agent_prompts')
    .update({ system_prompt, atualizado_em: new Date().toISOString() })
    .eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
