import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createAdminClient } from '@/lib/supabase-server'
import { canAccessAnalise, getUserContext } from '@/lib/get-role'

/**
 * Retorna o progresso da ingestão assíncrona pra polling no frontend.
 * Não requer Inngest — só lê do banco.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params

  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const ctx = await getUserContext()
  if (!ctx) return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })

  const admin = createAdminClient()

  const { data: analise } = await admin
    .from('analises')
    .select(`
      id, user_id,
      documents_ingestion_started_at,
      documents_ingested_at,
      documents_total,
      documents_completed,
      documents_failed,
      fact_bank_consolidated_at,
      fact_bank_model_id
    `)
    .eq('id', id)
    .single()

  if (!analise) return NextResponse.json({ error: 'Não encontrada' }, { status: 404 })
  // Permite que viewers autorizados (dono, gestor do escritório, admin) acompanhem
  // o progresso — necessário agora que o pipeline roda server-side e o gestor
  // também faz polling. Antes era estritamente o dono (403 pro gestor).
  const podeAcessar = await canAccessAnalise(ctx, analise.user_id)
  if (!podeAcessar) return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })

  // Lista status individual dos docs (útil pra mostrar quais já terminaram)
  const { data: docs } = await admin
    .from('analise_documents')
    .select('id, file_name, file_category, status, total_chunks, chunks_completed, error_message, completed_at')
    .eq('analise_id', id)
    .order('file_name')

  const status: 'idle' | 'in_progress' | 'completed' | 'failed' =
    !analise.documents_ingestion_started_at ? 'idle'
    : analise.fact_bank_consolidated_at      ? 'completed'
    : (docs ?? []).some(d => d.status === 'failed')
        && (analise.documents_completed ?? 0) + (analise.documents_failed ?? 0) >= (analise.documents_total ?? 0)
      ? 'failed'
    : 'in_progress'

  return NextResponse.json({
    status,
    started_at:        analise.documents_ingestion_started_at,
    completed_at:      analise.documents_ingested_at,
    fact_bank_ready:   !!analise.fact_bank_consolidated_at,
    fact_bank_model:   analise.fact_bank_model_id,
    progress: {
      total:     analise.documents_total ?? 0,
      completed: analise.documents_completed ?? 0,
      failed:    analise.documents_failed ?? 0,
      percent:   analise.documents_total && analise.documents_total > 0
        ? Math.round(((analise.documents_completed ?? 0) + (analise.documents_failed ?? 0)) / analise.documents_total * 100)
        : 0,
    },
    documents: docs ?? [],
  })
}
