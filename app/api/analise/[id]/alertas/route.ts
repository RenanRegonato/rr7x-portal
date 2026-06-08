import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'
import { getUserContext, canAccessAnalise } from '@/lib/get-role'

// GET /api/analise/[id]/alertas
// Alertas abertos do deal (monitoramento contínuo). Owner-facing: são red
// flags sobre o ativo/tomador (ex.: empresa saiu de ATIVA), relevantes para
// o cliente. Acesso gated por canAccessAnalise.

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await getUserContext()
  if (!ctx) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const { id } = await params
  const admin = createAdminClient()

  const { data: analise } = await admin.from('analises').select('user_id').eq('id', id).single()
  if (!analise) return NextResponse.json({ error: 'Análise não encontrada' }, { status: 404 })
  if (!(await canAccessAnalise(ctx, analise.user_id))) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })
  }

  const { data, error } = await admin
    .from('deal_alertas')
    .select('id, tipo, severidade, titulo, detalhe, criado_em')
    .eq('analise_id', id)
    .is('resolvido_em', null)
    .order('criado_em', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ alertas: data ?? [] })
}
