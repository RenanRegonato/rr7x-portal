import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createAdminClient } from '@/lib/supabase-server'
import { inngest } from '@/lib/inngest'
import { categorizeFile as categorize } from '@/lib/documentos/categorize'

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params

  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const admin = createAdminClient()

  const { data: analise, error: analiseErr } = await admin
    .from('analises')
    .select('id, user_id, documents_ingested_at, documents_ingestion_started_at')
    .eq('id', id)
    .single()

  if (analiseErr || !analise) return NextResponse.json({ error: 'Não encontrada' }, { status: 404 })
  if (analise.user_id !== user.id) return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })

  if (analise.documents_ingested_at) {
    return NextResponse.json({ error: 'Ingestão já concluída', ingested_at: analise.documents_ingested_at }, { status: 409 })
  }
  if (analise.documents_ingestion_started_at) {
    return NextResponse.json({ error: 'Ingestão em andamento', started_at: analise.documents_ingestion_started_at }, { status: 409 })
  }

  // Lista arquivos no Storage
  const prefix = `${user.id}/${id}`
  const { data: fileList, error: listErr } = await admin.storage
    .from('analises')
    .list(prefix, { limit: 200, sortBy: { column: 'name', order: 'asc' } })

  if (listErr) return NextResponse.json({ error: `Erro ao listar arquivos: ${listErr.message}` }, { status: 500 })
  const files = (fileList ?? []).filter(f => f.name !== '.emptyFolderPlaceholder' && f.name)
  if (files.length === 0) return NextResponse.json({ error: 'Nenhum arquivo enviado' }, { status: 400 })

  // Cria 1 linha em analise_documents por arquivo (idempotente via UNIQUE)
  const rows = files.map(f => ({
    analise_id:      id,
    file_path:       `${prefix}/${f.name}`,
    file_name:       f.name,
    file_size_bytes: f.metadata?.size ?? 0,
    mime_type:       f.metadata?.mimetype ?? null,
    file_category:   categorize(f.name),
    status:          'pending',
  }))

  const { data: inserted, error: insErr } = await admin
    .from('analise_documents')
    .upsert(rows, { onConflict: 'analise_id,file_path', ignoreDuplicates: false })
    .select('id, file_name, file_category, status')

  if (insErr) return NextResponse.json({ error: `Erro ao registrar documentos: ${insErr.message}` }, { status: 500 })

  await admin
    .from('analises')
    .update({
      documents_ingestion_started_at: new Date().toISOString(),
      documents_total:                 inserted?.length ?? rows.length,
      documents_completed:             0,
      documents_failed:                0,
    })
    .eq('id', id)

  // Dispara processamento paralelo: 1 evento por documento
  const events = (inserted ?? []).map(doc => ({
    name: 'analise/document.process_requested' as const,
    data: { analiseId: id, documentId: doc.id },
  }))
  if (events.length > 0) await inngest.send(events)

  return NextResponse.json({
    ok: true,
    total_documents: inserted?.length ?? rows.length,
    documents:       inserted,
  })
}
