import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient, createServerSupabaseClient } from '@/lib/supabase-server'
import { getUserContext, canAccessAnalise } from '@/lib/get-role'
import { RegenerarCascadeSchema } from '@/lib/schemas'
import { audit, extractIp } from '@/lib/audit'
import { avaliarImpactoCascade, type ImpactoCascade } from '@/lib/agents/detetive'

// Detetive Dependência: dado uma regeneração executada, avalia quais outros
// agentes da análise podem ter ficado inconsistentes e recomenda reprocesso.
// NÃO reprocessa nada — só registra a recomendação. O assessor confirma na UI.

export const maxDuration = 300

const STEP_LABELS: Record<string, string> = {
  orchestration:         'Orquestração do Mandato (Deal Readiness)',
  pesquisa:              'Inteligência de Mercado (Pesquisa de mercado)',
  diagnostico:           'Diagnóstico Financeiro (Análise financeira)',
  analise_ma:            'Estruturação de M&A (Tese de M&A)',
  kyc:                   'KYC & Compliance (KYC & compliance)',
  contratos:             'Due Diligence Jurídica (Análise jurídica)',
  originacao:            'Originação (Posicionamento)',
  estruturacao:          'Estruturação de Crédito (Crédito estruturado)',
  maturidade:            'Validação de Oportunidades (Veredicto final)',
  relatorio_consolidado: 'Relatório Consolidado',
  blind_teaser:          'Blind Teaser',
  sell_side_pitchbook:   'Sell-Side Pitchbook',
}

function intakeResumo(intake: Record<string, string>): string {
  const campos = [
    ['Ativo',            intake.nomeAtivo],
    ['Tipo de ativo',    intake.tipoAtivo],
    ['Estágio',          intake.estagio],
    ['Objetivo',         intake.objetivo],
    ['Ticket estimado',  intake.ticketEstimado],
    ['Receita/Caixa',    intake.receitaCaixa],
    ['Passivos',         intake.passivos],
    ['Resumo ativo',     intake.resumoAtivo],
  ]
  return campos
    .filter(([, v]) => v && v.length > 0)
    .map(([k, v]) => `**${k}:** ${v}`)
    .join('\n')
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const ctx = await getUserContext()
  if (!ctx) return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })

  const { id: analiseId } = await params
  const body = await req.json()
  const parsed = RegenerarCascadeSchema.safeParse(body)
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
    .select('id, user_id, deal_intake, outputs')
    .eq('id', analiseId)
    .maybeSingle()

  if (!analise) return NextResponse.json({ error: 'Análise não encontrada' }, { status: 404 })

  const podeAcessar = await canAccessAnalise(ctx, analise.user_id)
  if (!podeAcessar) return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })

  const { data: regeneracao } = await admin
    .from('regeneracoes')
    .select('*')
    .eq('id', regeneracao_id)
    .eq('analise_id', analiseId)
    .maybeSingle()

  if (!regeneracao) {
    return NextResponse.json({ error: 'Regeneração não encontrada' }, { status: 404 })
  }
  if (!regeneracao.executada) {
    return NextResponse.json({ error: 'Regeneração ainda não foi executada' }, { status: 409 })
  }

  // Se já foi avaliada, retorna o resultado cacheado (evita re-chamar IA)
  if (regeneracao.cascade_avaliada) {
    return NextResponse.json({
      impactos: (regeneracao.cascade_steps as ImpactoCascade[] | null) ?? [],
      cacheado: true,
    })
  }

  const outputs = (analise.outputs ?? {}) as Record<string, string>
  const outputNovo = outputs[regeneracao.step_key] ?? ''
  const outputAnterior = regeneracao.output_anterior ?? ''

  if (!outputNovo) {
    return NextResponse.json(
      { error: 'Output novo do step ainda não está disponível. Aguarde a regeneração concluir.' },
      { status: 409 }
    )
  }

  // Monta outputs dos demais agentes (excluindo o que foi regenerado e os vazios)
  const demais: Record<string, { label: string; conteudo: string }> = {}
  for (const [key, conteudo] of Object.entries(outputs)) {
    if (key === regeneracao.step_key) continue
    if (!conteudo || typeof conteudo !== 'string' || conteudo.length === 0) continue
    if (!STEP_LABELS[key]) continue
    demais[key] = { label: STEP_LABELS[key], conteudo }
  }

  const intake = (analise.deal_intake ?? {}) as Record<string, string>

  let detetive
  try {
    detetive = await avaliarImpactoCascade({
      step_regenerado_key:    regeneracao.step_key,
      step_regenerado_label:  STEP_LABELS[regeneracao.step_key] ?? regeneracao.step_key,
      output_anterior:        outputAnterior,
      output_novo:            outputNovo,
      outputs_demais_agentes: demais,
      intake:                 intakeResumo(intake),
    }, analiseId)
  } catch (e) {
    console.error('[regenerar/cascade] Detetive falhou:', e)
    return NextResponse.json(
      { error: 'Falha ao avaliar impacto. Tente novamente em alguns segundos.' },
      { status: 502 }
    )
  }

  // Filtra impactos: só steps válidos e que existem na análise (têm output ou são esperados)
  const impactosValidos = detetive.impactos.filter((imp) => {
    if (!STEP_LABELS[imp.step_key]) return false
    if (imp.step_key === regeneracao.step_key) return false
    return true
  })

  await admin
    .from('regeneracoes')
    .update({
      cascade_avaliada:    true,
      cascade_avaliada_em: new Date().toISOString(),
      cascade_steps:       impactosValidos,
    })
    .eq('id', regeneracao_id)

  void audit({
    event:    'regeneracao.cascade_avaliada',
    userId:   user.id,
    targetId: regeneracao_id,
    metadata: {
      analise_id: analiseId,
      step_origem: regeneracao.step_key,
      impactos_count: impactosValidos.length,
      severidades: impactosValidos.map(i => i.severidade),
    },
    ip:       extractIp(req.headers),
    userAgent: req.headers.get('user-agent'),
  })

  return NextResponse.json({
    impactos: impactosValidos,
    cacheado: false,
  })
}
