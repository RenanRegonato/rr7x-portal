import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createAdminClient } from '@/lib/supabase-server'
import { getUserContext, canAccessAnalise } from '@/lib/get-role'
import { isAllowedDocExtension, ALLOWED_DOC_EXTENSIONS_LIST } from '@/lib/upload-validation'
import { registrarRemediacaoDoc } from '@/lib/triagem/remediacao'

// POST /api/analise/[id]/documentos/reingest
// Remedia um documento que falhou REENVIANDO o arquivo (mesmo, outro formato ou
// versão mais legível). O cliente sobe o arquivo via /api/upload-url (signed URL)
// e chama aqui com o path resultante. Registra como novo documento (resolução
// 'reenviado') e re-dispara ingestão + consolidação, que reavalia o gate.
// Body: { oldDocId: string, filePath: string, fileName: string, fileSizeBytes?: number }
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const ctx = await getUserContext()
  if (!ctx) return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })

  const admin = createAdminClient()
  const { data: analise } = await admin.from('analises').select('user_id').eq('id', id).single()
  if (!analise) return NextResponse.json({ error: 'Análise não encontrada' }, { status: 404 })
  if (!(await canAccessAnalise(ctx, analise.user_id))) {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
  }

  const body = await req.json().catch(() => ({})) as {
    oldDocId?: string; filePath?: string; fileName?: string; fileSizeBytes?: number
  }
  const { oldDocId, filePath, fileName, fileSizeBytes } = body
  if (!oldDocId || !filePath || !fileName) {
    return NextResponse.json({ error: 'oldDocId, filePath e fileName são obrigatórios' }, { status: 400 })
  }
  if (!isAllowedDocExtension(fileName)) {
    return NextResponse.json({ error: `Formato não suportado. Aceitos: ${ALLOWED_DOC_EXTENSIONS_LIST.join(', ')}.` }, { status: 400 })
  }
  // O path tem que pertencer a esta análise (owner/analiseId/...).
  if (!filePath.startsWith(`${analise.user_id}/${id}/`)) {
    return NextResponse.json({ error: 'Caminho de arquivo inválido para esta análise' }, { status: 400 })
  }

  const { data: old } = await admin.from('analise_documents')
    .select('id').eq('id', oldDocId).eq('analise_id', id).single()
  if (!old) return NextResponse.json({ error: 'Documento não encontrado nesta análise' }, { status: 404 })

  const { newDocId } = await registrarRemediacaoDoc({
    analiseId:     id,
    oldDocId,
    filePath,
    fileName,
    fileSizeBytes,
    resolucao:     'reenviado',
    decididoPor:   user.id,
  })

  return NextResponse.json({ ok: true, newDocId })
}
