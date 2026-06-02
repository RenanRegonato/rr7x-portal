import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createAdminClient } from '@/lib/supabase-server'
import { isAdminViewer } from '@/lib/get-role'

export async function GET(req: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const analiseId = req.nextUrl.searchParams.get('analiseId')
  const stepKey   = req.nextUrl.searchParams.get('stepKey')
  if (!analiseId || !stepKey) return NextResponse.json({ error: 'analiseId e stepKey obrigatórios' }, { status: 400 })

  const admin = createAdminClient()

  const { data: analise } = await admin
    .from('analises')
    .select('user_id')
    .eq('id', analiseId)
    .single()

  if (!analise) return NextResponse.json({ error: 'Análise não encontrada' }, { status: 404 })
  if (analise.user_id !== user.id && !(await isAdminViewer(user.id))) {
    const { data: member } = await admin
      .from('deal_members')
      .select('id')
      .eq('analise_id', analiseId)
      .eq('user_id', user.id)
      .maybeSingle()
    if (!member) return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })
  }

  const { data: versions } = await admin
    .from('deal_output_versions')
    .select('id, version_num, criado_em')
    .eq('analise_id', analiseId)
    .eq('step_key', stepKey)
    .order('version_num', { ascending: false })

  return NextResponse.json({ versions: versions ?? [] })
}

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const { analiseId, versionId } = await req.json()
  if (!analiseId || !versionId) return NextResponse.json({ error: 'analiseId e versionId obrigatórios' }, { status: 400 })

  const admin = createAdminClient()

  const { data: analise } = await admin.from('analises').select('user_id').eq('id', analiseId).single()
  if (!analise) return NextResponse.json({ error: 'Análise não encontrada' }, { status: 404 })
  if (analise.user_id !== user.id && !(await isAdminViewer(user.id))) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })
  }

  const { data: version } = await admin
    .from('deal_output_versions')
    .select('content, step_key')
    .eq('id', versionId)
    .eq('analise_id', analiseId)
    .single()

  if (!version) return NextResponse.json({ error: 'Versão não encontrada' }, { status: 404 })

  const { data: latest } = await admin.from('analises').select('outputs').eq('id', analiseId).single()
  const latestOutputs = (latest?.outputs ?? {}) as Record<string, string>

  await admin.from('analises').update({
    outputs: { ...latestOutputs, [version.step_key]: version.content },
    atualizado_em: new Date().toISOString(),
  }).eq('id', analiseId)

  return NextResponse.json({ ok: true, content: version.content })
}
