import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient, createServerSupabaseClient } from '@/lib/supabase-server'
import { canAccessAnalise, getUserContext } from '@/lib/get-role'
import { isInternalCall } from '@/lib/internal-auth'
import { validarCVM17522, CVM_175_22, type CVMInput } from '@/lib/agents/cvm-175-22'

export const maxDuration = 300

// POST /api/analise/[id]/cvm-175-22
// Roda o validador CVM 175/22 e grava o resultado em outputs.cvm_175_22.
// Disparado pelo orquestrador (header x-internal-token) ou manualmente pelo dono/admin.
// Roda automaticamente para deals de Securitização (CRI/CRA); não é gated por entitlement.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const internal = isInternalCall(req)
  const { id: analiseId } = await params
  const admin = createAdminClient()

  const { data: analise } = await admin
    .from('analises')
    .select('user_id, deal_intake, outputs')
    .eq('id', analiseId)
    .maybeSingle()
  if (!analise) return NextResponse.json({ error: 'Análise não encontrada' }, { status: 404 })

  if (!internal) {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    const ctx = await getUserContext()
    if (!ctx) return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })
    if (!(await canAccessAnalise(ctx, analise.user_id))) {
      return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
    }
  }

  const intake = (analise.deal_intake ?? {}) as Record<string, string>
  const tipoAtivo = intake.tipoAtivo ?? ''

  // CVM 175/22 roda automaticamente para Securitização, mas verifica se há campos ANBIMA
  const isSecuritizacao = tipoAtivo.includes('Securitização')
  if (!isSecuritizacao) {
    return NextResponse.json({
      skipped: true,
      reason: 'tipo_ativo_nao_securitizacao',
      message: 'CVM 175/22 aplica-se apenas a Securitização (CRI/CRA)',
    })
  }

  // Monta input para o validador
  const input: CVMInput = {
    nomeAtivo:               intake.nomeAtivo || '',
    tipoAtivo:               intake.tipoAtivo || '',
    tipoOferta:              intake.tipoOferta || undefined,
    intakeResumo:            intake.resumoAtivo || intake.informacoesAdicionais || '',
    // CRI
    categoriaCri:            intake.categoriaCri || undefined,
    concentracaoCri:         intake.concentracaoCri || undefined,
    segmentoCri:             intake.segmentoImobiliario || undefined,
    cedenteCotistaSubordinado: intake.cedenteCotistaSubordinado || undefined,
    estruturaCotas:          intake.estruturaCotas || undefined,
    cotaSeniorPct:           intake.cotaSeniorPct !== undefined && intake.cotaSeniorPct !== '' ? Number(intake.cotaSeniorPct) : undefined,
    cotaMezaninoPct:         intake.cotaMezaninoPct !== undefined && intake.cotaMezaninoPct !== '' ? Number(intake.cotaMezaninoPct) : undefined,
    cotaSubordinadaPct:      intake.cotaSubordinadaPct !== undefined && intake.cotaSubordinadaPct !== '' ? Number(intake.cotaSubordinadaPct) : undefined,
    // CRA
    revolvenciaCra:          intake.revolvencia || undefined,
    atividadeDevedor:        intake.atividadeDevedor || undefined,
    segmentoCra:             intake.segmentoAgro || undefined,
  }

  let run
  try {
    run = await validarCVM17522(input, analiseId)
  } catch (e) {
    console.error('Erro ao validar CVM 175/22:', e)
    return NextResponse.json(
      { error: 'Erro ao validar CVM 175/22', details: (e as Error).message },
      { status: 500 },
    )
  }

  if (!run.result) {
    return NextResponse.json(
      {
        error: 'Falha ao parsear resultado do validador',
        raw: run.raw.slice(0, 500),
      },
      { status: 500},
    )
  }

  // Persiste o resultado estruturado em outputs
  const outputs = (analise.outputs ?? {}) as Record<string, string>
  outputs.cvm_175_22 = JSON.stringify(run.result, null, 2)

  await admin
    .from('analises')
    .update({ outputs, atualizado_em: new Date().toISOString() })
    .eq('id', analiseId)

  return NextResponse.json({
    ok: true,
    result: run.result,
    message: `Validação CVM 175/22 concluída. Score: ${run.result.elegibilidade_score}/100.`,
  })
}
