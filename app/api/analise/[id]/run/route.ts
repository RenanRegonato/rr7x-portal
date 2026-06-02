import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createAdminClient } from '@/lib/supabase-server'
import { inngest } from '@/lib/inngest'
import { isAdminViewer } from '@/lib/get-role'

export const maxDuration = 60

/**
 * Dispara (ou re-dispara) o pipeline de análise server-side via Inngest.
 *
 * Auth: dono da análise OU admin (mesmo padrão de /step).
 * Body opcional: { mode?: 'continuar' | 'reprocessar' }.
 *  - 'reprocessar' → zera outputs e volta status pra 'processando' (igual
 *    analise-status?reprocessar=1).
 *  - 'continuar' / default → mantém outputs; o orquestrador retoma os steps
 *    faltantes (resume).
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const admin = createAdminClient()

  const { data: analise } = await admin
    .from('analises')
    .select('user_id')
    .eq('id', id)
    .single()
  if (!analise) return NextResponse.json({ error: 'Análise não encontrada' }, { status: 404 })
  if (analise.user_id !== user.id && !(await isAdminViewer(user.id))) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })
  }

  const body = await req.json().catch(() => ({})) as { mode?: 'continuar' | 'reprocessar' }
  const mode = body.mode ?? 'continuar'

  const now = new Date().toISOString()
  if (mode === 'reprocessar') {
    await admin
      .from('analises')
      .update({ status: 'processando', outputs: {}, atualizado_em: now })
      .eq('id', id)
  } else {
    await admin
      .from('analises')
      .update({ status: 'processando', atualizado_em: now })
      .eq('id', id)
  }

  await inngest.send({ name: 'analise/pipeline.run_requested', data: { analiseId: id } })

  return NextResponse.json({ ok: true, mode })
}
