import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient, createServerSupabaseClient } from '@/lib/supabase-server'
import { getUserContext, canAccessAnalise } from '@/lib/get-role'
import { RegenerarAvaliarSchema } from '@/lib/schemas'
import { audit, extractIp } from '@/lib/audit'
import { avaliarPedidoRegeneracao } from '@/lib/agents/revisor'

// Permite até 5 min (Revisor pode demorar com extended thinking)
export const maxDuration = 300

const STEP_LABELS: Record<string, string> = {
  orchestration:         'Mandor Orquestra (Deal Readiness)',
  pesquisa:              'Pedro Panorama (Pesquisa de mercado)',
  diagnostico:           'Davi Diagnóstico (Análise financeira)',
  analise_ma:            'Arthur Aquisição (Tese de M&A)',
  kyc:                   'Carmen Compliance (KYC & compliance)',
  contratos:             'Clara Cláusula (Análise jurídica)',
  originacao:            'Victor Valor (Posicionamento)',
  estruturacao:          'Estela Estrutura (Crédito estruturado)',
  maturidade:            'Paulo Preparo (Veredicto final)',
  relatorio_consolidado: 'Relatório Consolidado',
  blind_teaser:          'Blind Teaser',
  sell_side_pitchbook:   'Sell-Side Pitchbook',
}

// Para cada step, indicamos quais outputs upstream relevantes incluir no contexto
// do Revisor. Por enquanto incluímos orchestration sempre (Deal Readiness é a
// visão de topo); para steps de captação, incluímos os 9 outputs core.
const UPSTREAM_KEYS: Record<string, string[]> = {
  orchestration:         [],
  pesquisa:              ['orchestration'],
  diagnostico:           ['orchestration'],
  analise_ma:            ['orchestration', 'diagnostico'],
  kyc:                   ['orchestration'],
  contratos:             ['orchestration'],
  originacao:            ['orchestration', 'diagnostico', 'analise_ma'],
  estruturacao:          ['orchestration', 'diagnostico'],
  maturidade:            ['orchestration', 'diagnostico', 'analise_ma', 'kyc', 'contratos', 'originacao', 'estruturacao'],
  relatorio_consolidado: ['orchestration', 'diagnostico', 'analise_ma', 'kyc', 'contratos', 'originacao', 'estruturacao', 'maturidade'],
  blind_teaser:          ['orchestration', 'diagnostico', 'analise_ma', 'maturidade'],
  sell_side_pitchbook:   ['orchestration', 'diagnostico', 'analise_ma', 'maturidade'],
}

function intakeResumo(intake: Record<string, string>): string {
  // O deal_intake tem campos sensíveis criptografados; aqui o objetivo é dar
  // contexto ao Revisor, então pegamos os campos NÃO sensíveis e suficientes
  // para entender o deal.
  const campos = [
    ['Ativo',            intake.nomeAtivo],
    ['Tipo de ativo',    intake.tipoAtivo],
    ['Estágio',          intake.estagio],
    ['Objetivo',         intake.objetivo],
    ['Nível informação', intake.nivelInformacao],
    ['Localização',      intake.localizacao],
    ['Ticket estimado',  intake.ticketEstimado],
    ['Receita/Caixa',    intake.receitaCaixa],
    ['Passivos',         intake.passivos],
    ['Info adicionais',  intake.informacoesAdicionais],
    ['Resumo ativo',     intake.resumoAtivo],
    ['Obs mandato',      intake.obsMandato],
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

  const admin = createAdminClient()

  // Permissão: owner ou membro do deal
  const { data: analise } = await admin
    .from('analises')
    .select('id, user_id, deal_intake, outputs, regeneracoes_count')
    .eq('id', analiseId)
    .maybeSingle()

  if (!analise) return NextResponse.json({ error: 'Análise não encontrada' }, { status: 404 })

  const podeAcessar = await canAccessAnalise(ctx, analise.user_id)
  if (!podeAcessar) return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })

  // Limite de 3 regenerações (denormalizado em analises.regeneracoes_count)
  const LIMITE = 3
  if ((analise.regeneracoes_count ?? 0) >= LIMITE) {
    return NextResponse.json(
      {
        error: `Limite de ${LIMITE} regenerações atingido. Para novas alterações, é necessário subir o Deal novamente, consumindo uma nova análise do pacote.`,
        limite_atingido: true,
      },
      { status: 403 }
    )
  }

  // Valida input
  const body = await req.json()
  const parsed = RegenerarAvaliarSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Dados inválidos', details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    )
  }
  const { step, o_que, motivo } = parsed.data

  const outputs = (analise.outputs ?? {}) as Record<string, string>
  const outputAtual = outputs[step] ?? ''

  if (!outputAtual) {
    return NextResponse.json(
      { error: `O step "${step}" ainda não tem output gerado. Aguarde a análise ser concluída antes de regenerar.` },
      { status: 400 }
    )
  }

  const intake = (analise.deal_intake ?? {}) as Record<string, string>
  const upstreamKeys = UPSTREAM_KEYS[step] ?? []
  const outputsUpstream: Record<string, string> = {}
  for (const k of upstreamKeys) {
    if (outputs[k]) outputsUpstream[k] = outputs[k]
  }

  // Chama o Revisor (pode levar ~10-30s)
  let revisor
  try {
    revisor = await avaliarPedidoRegeneracao({
      step_key:          step,
      step_label:        STEP_LABELS[step] ?? step,
      briefing_o_que:    o_que,
      briefing_motivo:   motivo,
      intake:            intakeResumo(intake),
      output_atual:      outputAtual,
      outputs_upstream:  outputsUpstream,
    }, analiseId)
  } catch (e) {
    console.error('[regenerar/avaliar] Revisor falhou:', e)
    return NextResponse.json(
      { error: 'Falha ao avaliar com o Revisor. Tente novamente em alguns segundos.' },
      { status: 502 }
    )
  }

  // Persiste pedido + avaliação (executada=false)
  const { data: regeneracao, error: insertError } = await admin
    .from('regeneracoes')
    .insert({
      analise_id:      analiseId,
      step_key:        step,
      briefing_o_que:  o_que,
      briefing_motivo: motivo,
      ia_decisao:      revisor.decisao,
      ia_argumento:    revisor.argumento,
      ia_riscos:       revisor.riscos,
      output_anterior: outputAtual,
      executada:       false,
      solicitada_por:  user.id,
    })
    .select()
    .single()

  if (insertError || !regeneracao) {
    return NextResponse.json({ error: insertError?.message ?? 'Erro ao salvar regeneração' }, { status: 500 })
  }

  void audit({
    event:    'regeneracao.solicitada',
    userId:   user.id,
    targetId: regeneracao.id,
    metadata: { analise_id: analiseId, step },
    ip:       extractIp(req.headers),
    userAgent: req.headers.get('user-agent'),
  })

  void audit({
    event:    'regeneracao.avaliada',
    userId:   user.id,
    targetId: regeneracao.id,
    metadata: {
      analise_id: analiseId,
      step,
      ia_decisao: revisor.decisao,
      riscos_count: revisor.riscos.length,
    },
    ip:       extractIp(req.headers),
    userAgent: req.headers.get('user-agent'),
  })

  return NextResponse.json({
    regeneracao_id: regeneracao.id,
    ia_decisao:     revisor.decisao,
    ia_argumento:   revisor.argumento,
    ia_riscos:      revisor.riscos,
    regeneracoes_restantes: LIMITE - (analise.regeneracoes_count ?? 0),
  })
}
