import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createAdminClient } from '@/lib/supabase-server'
import { getUserContext, canAccessAnalise } from '@/lib/get-role'
import { evaluateTriagemGate } from '@/lib/triagem/gate'

// POST /api/analise/[id]/documentos/triagem
// Registra a decisão do usuário para documentos com falha:
//   - relevancia 'nao_relevante'           → libera aquele doc (segue sem ele)
//   - relevancia 'relevante' + justificativa → registra ausência justificada (resolve)
//   - relevancia 'relevante' sem justificativa → segue BLOQUEANTE (usuário vai
//     remediar via /documentos/texto ou /documentos/reingest)
// Ao fim, reavalia o gate: se nada mais bloqueia, dispara o pipeline.
interface Decisao {
  documentId:    string
  relevancia:    'relevante' | 'nao_relevante'
  justificativa?: string
}

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

  const body = await req.json().catch(() => ({})) as { decisoes?: Decisao[] }
  const decisoes = Array.isArray(body.decisoes) ? body.decisoes : []
  if (decisoes.length === 0) return NextResponse.json({ error: 'Nenhuma decisão informada' }, { status: 400 })

  const now = new Date().toISOString()

  for (const d of decisoes) {
    if (!d.documentId || (d.relevancia !== 'relevante' && d.relevancia !== 'nao_relevante')) continue

    const justificativa = (d.justificativa ?? '').trim()
    const patch: Record<string, unknown> = {
      relevancia:           d.relevancia,
      triagem_decidida_em:  now,
      triagem_decidida_por: user.id,
    }
    if (d.relevancia === 'nao_relevante') {
      patch.resolucao     = null
      patch.justificativa = null
    } else if (justificativa) {
      // Relevante porém ausente com justificativa → resolve (segue com ressalva).
      patch.resolucao     = 'justificado'
      patch.justificativa = justificativa.slice(0, 4000)
    } else {
      // Relevante e ainda sem remediação → continua bloqueante.
      patch.resolucao     = null
      patch.justificativa = null
    }

    // Garante que a decisão é sobre um doc DESTA análise.
    await admin.from('analise_documents').update(patch).eq('id', d.documentId).eq('analise_id', id)
  }

  const gate = await evaluateTriagemGate(id)
  return NextResponse.json({ ok: true, ...gate })
}
