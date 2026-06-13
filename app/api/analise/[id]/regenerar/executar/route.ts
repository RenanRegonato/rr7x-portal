import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient, createServerSupabaseClient } from '@/lib/supabase-server'
import { getUserContext, canAccessAnalise } from '@/lib/get-role'
import { getRegeneracoesUsage } from '@/lib/entitlements'
import { RegenerarExecutarSchema } from '@/lib/schemas'
import { audit, extractIp } from '@/lib/audit'

// Confirma a regeneração e incrementa o contador. A re-execução real do step
// é disparada pelo frontend chamando /api/analise/[id]/step?regeneracao_id=...
// (que injeta o briefing no prompt antes de gerar o novo output).

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const ctx = await getUserContext()
  if (!ctx) return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })

  const { id: analiseId } = await params
  const body = await req.json()
  const parsed = RegenerarExecutarSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Dados inválidos', details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    )
  }
  const { regeneracao_id } = parsed.data

  const admin = createAdminClient()

  const { data: analise } = await admin
    .from('analises')
    .select('id, user_id, regeneracoes_count')
    .eq('id', analiseId)
    .maybeSingle()

  if (!analise) return NextResponse.json({ error: 'Análise não encontrada' }, { status: 404 })

  const podeAcessar = await canAccessAnalise(ctx, analise.user_id)
  if (!podeAcessar) return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })

  // Limite do plano — confere de novo (defesa em profundidade contra race condition
  // entre múltiplas avaliações simultâneas que passaram pelo check do /avaliar).
  // Admin (Gestor Geral) bypassa.
  const uso = await getRegeneracoesUsage(analise.user_id, analise.regeneracoes_count ?? 0)
  if (ctx.role !== 'admin' && uso.atLimit) {
    return NextResponse.json(
      { error: `Limite de ${uso.max} regenerações atingido.`, limite_atingido: true },
      { status: 403 }
    )
  }

  const { data: regeneracao } = await admin
    .from('regeneracoes')
    .select('*')
    .eq('id', regeneracao_id)
    .eq('analise_id', analiseId)
    .maybeSingle()

  if (!regeneracao) {
    return NextResponse.json({ error: 'Regeneração não encontrada' }, { status: 404 })
  }
  if (regeneracao.executada) {
    return NextResponse.json({ error: 'Esta regeneração já foi executada' }, { status: 409 })
  }

  const agora = new Date().toISOString()

  // Marca executada + incrementa contador da análise (transação seria ideal,
  // mas Supabase JS client não expõe; fazemos sequencial e logamos.)
  const { error: updateError } = await admin
    .from('regeneracoes')
    .update({ executada: true, executada_em: agora })
    .eq('id', regeneracao_id)

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  await admin
    .from('analises')
    .update({
      regeneracoes_count: (analise.regeneracoes_count ?? 0) + 1,
      atualizado_em: agora,
    })
    .eq('id', analiseId)

  void audit({
    event:    'regeneracao.executada',
    userId:   user.id,
    targetId: regeneracao_id,
    metadata: {
      analise_id: analiseId,
      step: regeneracao.step_key,
      ia_decisao: regeneracao.ia_decisao,
      novo_count: (analise.regeneracoes_count ?? 0) + 1,
    },
    ip:       extractIp(req.headers),
    userAgent: req.headers.get('user-agent'),
  })

  return NextResponse.json({
    ok: true,
    regeneracoes_count: (analise.regeneracoes_count ?? 0) + 1,
    regeneracoes_restantes: uso.max == null ? null : Math.max(0, uso.max - ((analise.regeneracoes_count ?? 0) + 1)),
  })
}
