import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createAdminClient } from '@/lib/supabase-server'

const ADMIN_EMAIL = 'gestor@renanregonato.com.br'

const STAGE_ORDER = ['originacao', 'analise', 'compliance', 'comite', 'aprovado'] as const
type Stage = typeof STAGE_ORDER[number] | 'rejeitado'

async function canAccess(analiseId: string, userId: string, adminEmail: string, userEmail: string): Promise<boolean> {
  const admin = createAdminClient()
  const { data } = await admin.from('analises').select('user_id').eq('id', analiseId).single()
  if (!data) return false
  if (data.user_id === userId || userEmail === adminEmail) return true
  const { data: member } = await admin
    .from('deal_members')
    .select('id')
    .eq('analise_id', analiseId)
    .eq('user_id', userId)
    .maybeSingle()
  return !!member
}

// GET /api/analise/pipeline?id=X — retorna stage atual + histórico + membros
export async function GET(req: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const id = req.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'ID obrigatório' }, { status: 400 })

  const ok = await canAccess(id, user.id, ADMIN_EMAIL, user.email ?? '')
  if (!ok) return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })

  const admin = createAdminClient()

  const [{ data: analise }, { data: events }, { data: members }] = await Promise.all([
    admin.from('analises').select('id, nome_ativo, pipeline_stage').eq('id', id).single(),
    admin.from('deal_pipeline_events').select('*').eq('analise_id', id).order('criado_em', { ascending: true }),
    admin.from('deal_members').select('*, perfis(nome)').eq('analise_id', id),
  ])

  return NextResponse.json({
    stage:   analise?.pipeline_stage ?? 'originacao',
    events:  events  ?? [],
    members: members ?? [],
  })
}

// POST /api/analise/pipeline — avança estágio, rejeita ou adiciona comentário
export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const { analise_id, action, comentario } = await req.json() as {
    analise_id: string
    action: 'advance' | 'reject' | 'comment'
    comentario?: string
  }

  if (!analise_id || !action) return NextResponse.json({ error: 'Campos obrigatórios ausentes' }, { status: 400 })

  const ok = await canAccess(analise_id, user.id, ADMIN_EMAIL, user.email ?? '')
  if (!ok) return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })

  const admin = createAdminClient()
  const { data: analise } = await admin.from('analises').select('pipeline_stage').eq('id', analise_id).single()
  const currentStage = (analise?.pipeline_stage ?? 'originacao') as Stage

  if (action === 'comment') {
    if (!comentario?.trim()) return NextResponse.json({ error: 'Comentário vazio' }, { status: 400 })
    await admin.from('deal_pipeline_events').insert({
      analise_id,
      user_id:    user.id,
      user_email: user.email,
      tipo:       'comment',
      comentario: comentario.trim(),
    })
    return NextResponse.json({ ok: true })
  }

  if (action === 'reject') {
    await Promise.all([
      admin.from('analises').update({ pipeline_stage: 'rejeitado', atualizado_em: new Date().toISOString() }).eq('id', analise_id),
      admin.from('deal_pipeline_events').insert({
        analise_id,
        user_id:    user.id,
        user_email: user.email,
        tipo:       'rejeicao',
        stage_de:   currentStage,
        stage_para: 'rejeitado',
        comentario: comentario?.trim() ?? null,
      }),
    ])
    return NextResponse.json({ ok: true, stage: 'rejeitado' })
  }

  if (action === 'advance') {
    const idx     = STAGE_ORDER.indexOf(currentStage as any)
    const nextIdx = idx + 1
    if (nextIdx >= STAGE_ORDER.length) return NextResponse.json({ error: 'Deal já está no estágio final' }, { status: 400 })
    const nextStage = STAGE_ORDER[nextIdx]

    await Promise.all([
      admin.from('analises').update({ pipeline_stage: nextStage, atualizado_em: new Date().toISOString() }).eq('id', analise_id),
      admin.from('deal_pipeline_events').insert({
        analise_id,
        user_id:    user.id,
        user_email: user.email,
        tipo:       nextStage === 'aprovado' ? 'aprovacao' : 'stage_change',
        stage_de:   currentStage,
        stage_para: nextStage,
        comentario: comentario?.trim() ?? null,
      }),
    ])
    return NextResponse.json({ ok: true, stage: nextStage })
  }

  return NextResponse.json({ error: 'Ação inválida' }, { status: 400 })
}
