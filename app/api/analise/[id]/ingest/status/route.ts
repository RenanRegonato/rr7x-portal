import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createAdminClient } from '@/lib/supabase-server'
import { canAccessAnalise, getUserContext } from '@/lib/get-role'
import { isPendencia, isResolvida, isBloqueante, type DocTriagem } from '@/lib/triagem/gate'
import { classificarCriticidade } from '@/lib/documentos/criticidade'

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
      fact_bank_model_id,
      triagem_docs_status
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
    .select('id, file_name, file_category, status, total_chunks, chunks_completed, error_message, completed_at, relevancia, resolucao, justificativa, substituido_por')
    .eq('analise_id', id)
    .order('file_name')

  const allDocs = (docs ?? []) as (DocTriagem & { file_category: string; chunks_completed: number; completed_at: string | null; substituido_por: string | null })[]

  // Documentos que substituíram um doc que falhou (remediação) — não devem
  // reaparecer como "enviados" separados no resumo de auditoria.
  const substitutos = new Set(allDocs.map(d => d.substituido_por).filter(Boolean) as string[])

  const status: 'idle' | 'in_progress' | 'completed' | 'failed' =
    !analise.documents_ingestion_started_at ? 'idle'
    : analise.fact_bank_consolidated_at      ? 'completed'
    : allDocs.some(d => d.status === 'failed')
        && (analise.documents_completed ?? 0) + (analise.documents_failed ?? 0) >= (analise.documents_total ?? 0)
      ? 'failed'
    : 'in_progress'

  // Enriquece cada doc com sinal de criticidade e flags da triagem.
  const documentsOut = allDocs.map(d => {
    const crit = classificarCriticidade(d.file_name)
    return {
      ...d,
      pendencia:        isPendencia(d),
      resolvida:        isResolvida(d),
      bloqueante:       isBloqueante(d),
      provavel_critico: crit.provavelCritico,
      critico_rotulo:   crit.rotulo,
    }
  })

  // Resumo de auditoria (rastreabilidade): o que entrou, o que falhou, decisões.
  const enviados      = documentsOut.filter(d => !substitutos.has(d.id))
  const sucesso       = enviados.filter(d => d.status === 'completed' && (d.total_chunks ?? 0) > 0)
  const pendencias    = enviados.filter(d => d.pendencia)
  const essenciais    = pendencias.filter(d => d.relevancia === 'relevante')
  const essenciaisOk  = essenciais.filter(d => !!d.resolucao)               // relevante e já remediado/justificado
  const bloqueantes   = enviados.filter(d => d.bloqueante)

  const auditoria = {
    total_enviados:        enviados.length,
    total_sucesso:         sucesso.length,
    total_falha:           pendencias.length,
    nao_processados: pendencias.map(d => ({
      id:               d.id,
      file_name:        d.file_name,
      status:           d.status,
      error_message:    d.error_message,
      relevancia:       d.relevancia,
      resolucao:        d.resolucao,
      justificativa:    d.justificativa,
      provavel_critico: d.provavel_critico,
      critico_rotulo:   d.critico_rotulo,
    })),
    essenciais_total:      essenciais.length,
    essenciais_resolvidos: essenciaisOk.length,
    todos_essenciais_ok:   bloqueantes.length === 0,
  }

  return NextResponse.json({
    status,
    triagem_status:    analise.triagem_docs_status ?? null,   // null | 'pendente' | 'liberada'
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
    auditoria,
    documents: documentsOut,
  })
}
