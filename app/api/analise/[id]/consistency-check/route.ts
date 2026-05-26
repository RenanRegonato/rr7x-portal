import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient, createServerSupabaseClient } from '@/lib/supabase-server'
import { canAccessAnalise, getUserContext } from '@/lib/get-role'
import { runConsistencyCheck } from '@/lib/consistency-engine'
import { audit, extractIp } from '@/lib/audit'
import { isInternalCall } from '@/lib/internal-auth'

// POST /api/analise/[id]/consistency-check
// Roda a engine de consistência e persiste issues.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  // Chamada server-to-server do orquestrador Inngest pula auth de usuário.
  const internal = isInternalCall(req)

  const { id: analiseId } = await params
  const admin = createAdminClient()

  let userId: string | null = null
  if (!internal) {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    userId = user.id

    const ctx = await getUserContext()
    if (!ctx) return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })

    const { data: analise } = await admin
      .from('analises')
      .select('user_id')
      .eq('id', analiseId)
      .maybeSingle()

    if (!analise) return NextResponse.json({ error: 'Análise não encontrada' }, { status: 404 })

    const podeAcessar = await canAccessAnalise(ctx, analise.user_id)
    if (!podeAcessar) return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
  }

  const result = await runConsistencyCheck(analiseId)

  void audit({
    event:    'consistency.checked',
    userId,
    targetId: analiseId,
    metadata: {
      total:           result.total,
      bloqueantes:     result.por_severidade.bloqueante,
      alertas:         result.por_severidade.alerta,
      info:            result.por_severidade.info,
    },
    ip:       extractIp(req.headers),
    userAgent: req.headers.get('user-agent'),
  })

  return NextResponse.json(result)
}

// GET /api/analise/[id]/consistency-check
// Lista issues persistidas (não roda nova verificação).
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const ctx = await getUserContext()
  if (!ctx) return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })

  const { id: analiseId } = await params
  const admin = createAdminClient()

  const { data: analise } = await admin
    .from('analises')
    .select('user_id, consistency_checked_at')
    .eq('id', analiseId)
    .maybeSingle()

  if (!analise) return NextResponse.json({ error: 'Análise não encontrada' }, { status: 404 })

  const podeAcessar = await canAccessAnalise(ctx, analise.user_id)
  if (!podeAcessar) return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })

  const { data: issues, error } = await admin
    .from('consistency_issues')
    .select('*')
    .eq('analise_id', analiseId)
    .order('severidade', { ascending: true })
    .order('criado_em',  { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const por_severidade = { bloqueante: 0, alerta: 0, info: 0 }
  for (const i of issues ?? []) {
    if (!i.resolvido && i.severidade in por_severidade) {
      por_severidade[i.severidade as keyof typeof por_severidade]++
    }
  }

  return NextResponse.json({
    issues:                issues ?? [],
    checked_at:            analise.consistency_checked_at,
    por_severidade,
    total:                 (issues ?? []).filter(i => !i.resolvido).length,
  })
}
