import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'
import { decryptSensitiveFields } from '@/lib/crypto'
import { getUserContext, canAccessAnalise } from '@/lib/get-role'
import { getRegeneracoesUsage } from '@/lib/entitlements'

// Status + outputs de uma análise (usado em polling pela página do deal).
// Somente leitura: o pipeline server-side (lib/analise/run-pipeline) é quem
// muda status/conclui/notifica — não esta rota.
export async function GET(req: NextRequest) {
  const ctx = await getUserContext()
  if (!ctx) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const id = req.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'ID obrigatório' }, { status: 400 })

  const admin = createAdminClient()

  const { data } = await admin
    .from('analises')
    .select('id, user_id, status, outputs, nome_ativo, deal_intake, criado_em, regeneracoes_count, facts_extracted_at, consistency_checked_at, mesa_revisao, mesa_revisao_at, risk_correlation_at, coverage_check, coverage_checked_at')
    .eq('id', id)
    .maybeSingle()

  if (!data) return NextResponse.json(null)

  // Ownership: dono, gerente do time, admin — ou membro do deal (compartilhado).
  let temAcesso = await canAccessAnalise(ctx, data.user_id)
  if (!temAcesso) {
    const { data: membro } = await admin
      .from('deal_members')
      .select('id')
      .eq('analise_id', id)
      .eq('user_id', ctx.userId)
      .maybeSingle()
    temAcesso = !!membro
  }
  if (!temAcesso) return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })

  // O teto de regenerações só importa em deal concluído (é onde se regenera);
  // evita 2 queries extras a cada poll de 5s durante o processamento.
  let regeneracoes_max: number | null = null
  if (data.status === 'concluido' && ctx.role !== 'admin') {
    const uso = await getRegeneracoesUsage(data.user_id, data.regeneracoes_count ?? 0)
    regeneracoes_max = uso.max
  }

  // Não expõe o user_id do dono ao cliente; decifra PII antes de enviar.
  const { user_id: _ownerId, ...safe } = data
  return NextResponse.json({
    ...safe,
    deal_intake: data.deal_intake ? decryptSensitiveFields(data.deal_intake) : null,
    regeneracoes_max,
  })
}
