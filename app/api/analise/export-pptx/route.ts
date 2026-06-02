import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createAdminClient } from '@/lib/supabase-server'
import { buildPptx } from '@/lib/pptx-export'
import { isAdminViewer } from '@/lib/get-role'

export async function GET(req: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const id = req.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'ID obrigatório' }, { status: 400 })

  const admin = createAdminClient()
  const { data: analise } = await admin
    .from('analises')
    .select('nome_ativo, tipo_ativo, deal_intake, outputs, user_id')
    .eq('id', id)
    .single()

  if (!analise) return NextResponse.json({ error: 'Análise não encontrada' }, { status: 404 })
  if (analise.user_id !== user.id && !(await isAdminViewer(user.id))) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })
  }

  const intake    = (analise.deal_intake ?? {}) as Record<string, string>
  const outputs   = (analise.outputs    ?? {}) as Record<string, string>
  const slug      = (analise.nome_ativo ?? 'analise').replace(/\s+/g, '-')
  const escritorio = intake.escritorio ?? undefined

  const buffer = await buildPptx({
    nomeAtivo:  analise.nome_ativo ?? 'Ativo',
    tipoAtivo:  analise.tipo_ativo ?? intake.tipoAtivo ?? undefined,
    escritorio,
    outputs,
    dealIntake: intake,
  })

  const uint8Array = new Uint8Array(buffer as unknown as ArrayBuffer)

  return new Response(uint8Array, {
    headers: {
      'Content-Type':        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'Content-Disposition': `attachment; filename="${slug}-rr7x.pptx"`,
      'Cache-Control':       'no-cache',
    },
  })
}
