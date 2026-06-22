import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createAdminClient } from '@/lib/supabase-server'
import { getUserContext, canAccessAnalise } from '@/lib/get-role'
import { registrarRemediacaoDoc } from '@/lib/triagem/remediacao'

// POST /api/analise/[id]/documentos/texto
// Remedia um documento que falhou COLANDO o conteúdo em texto. Grava um .txt no
// Storage, registra como novo documento (resolução 'texto_colado') e re-dispara
// ingestão + consolidação, que reavalia o gate.
// Body: { oldDocId: string, conteudo: string, nomeBase?: string }
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

  const body = await req.json().catch(() => ({})) as { oldDocId?: string; conteudo?: string; nomeBase?: string }
  const oldDocId = body.oldDocId
  const conteudo = (body.conteudo ?? '').trim()
  if (!oldDocId) return NextResponse.json({ error: 'oldDocId obrigatório' }, { status: 400 })
  if (conteudo.length < 10) return NextResponse.json({ error: 'Conteúdo de texto muito curto' }, { status: 400 })

  // Confirma que o doc antigo é desta análise.
  const { data: old } = await admin.from('analise_documents')
    .select('id, file_name').eq('id', oldDocId).eq('analise_id', id).single()
  if (!old) return NextResponse.json({ error: 'Documento não encontrado nesta análise' }, { status: 404 })

  const owner    = analise.user_id
  const base     = (body.nomeBase || old.file_name || 'texto').replace(/\.[a-z0-9]+$/i, '').replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 60)
  const safeName = `colado-${Date.now()}-${base || 'texto'}.txt`
  const filePath = `${owner}/${id}/${safeName}`

  const { error: upErr } = await admin.storage
    .from('analises')
    .upload(filePath, Buffer.from(conteudo, 'utf-8'), { contentType: 'text/plain', upsert: true })
  if (upErr) return NextResponse.json({ error: `Falha ao gravar o texto: ${upErr.message}` }, { status: 500 })

  const { newDocId } = await registrarRemediacaoDoc({
    analiseId:      id,
    oldDocId,
    filePath,
    fileName:       safeName,
    fileSizeBytes:  Buffer.byteLength(conteudo, 'utf-8'),
    resolucao:      'texto_colado',
    decididoPor:    user.id,
  })

  return NextResponse.json({ ok: true, newDocId })
}
