import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient, createServerSupabaseClient } from '@/lib/supabase-server'
import { canAccessAnalise, getUserContext } from '@/lib/get-role'
import { isInternalCall } from '@/lib/internal-auth'
import { getFactBankForAgent, formatFactBankForPrompt } from '@/lib/fact-bank-for-agent'
import { avaliarReformaTributaria, FERRANTE, type FerranteInput } from '@/lib/agents/ferrante'

export const maxDuration = 300

function intakeResumo(intake: Record<string, string>): string {
  return [
    ['Ativo',               intake.nomeAtivo],
    ['Tipo de ativo',       intake.tipoAtivo],
    ['Objetivo',            intake.objetivo],
    ['Estágio',             intake.estagio],
    ['Localização',         intake.localizacao],
    ['Ticket estimado',     intake.ticketEstimado],
    ['Nível de informação', intake.nivelInformacao],
    ['Operação em andamento', intake.operacaoEmAndamento],
    ['Receita/caixa',       intake.receitaCaixa],
    ['Passivos',            intake.passivos],
    ['Resumo do ativo',     intake.resumoAtivo],
  ].filter(([, v]) => v && v.length > 0).map(([k, v]) => `**${k}:** ${v}`).join('\n')
}

// Resumo dos diagnósticos upstream relevantes para a leitura tributária.
function outputsRelevantes(outputs: Record<string, string>): string {
  const trunc = (s: string, n = 3500) => (s.length > n ? s.slice(0, n) + '\n...[truncado]' : s)
  const partes: string[] = []
  for (const [key, label] of [
    ['diagnostico',  'Diagnóstico financeiro'],
    ['estruturacao', 'Estruturação'],
    ['originacao',   'Originação'],
    ['kyc',          'Compliance/KYC'],
  ] as const) {
    if (outputs[key]) partes.push(`### ${label}\n${trunc(outputs[key])}`)
  }
  return partes.join('\n\n')
}

// POST /api/analise/[id]/reforma-tributaria
// Roda o agente Ferrante e grava o diagnóstico estruturado em outputs.reforma_tributaria.
// Disparado pelo orquestrador (header x-internal-token) ou manualmente pelo dono/admin.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const internal = isInternalCall(req)
  const { id: analiseId } = await params
  const admin = createAdminClient()

  const { data: analise } = await admin
    .from('analises')
    .select('user_id, deal_intake, outputs, fact_bank')
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

  const intake  = (analise.deal_intake ?? {}) as Record<string, string>
  const outputs = (analise.outputs ?? {}) as Record<string, string>

  // Só roda se o módulo foi ativado na abertura (opt-in premium). O gate comercial
  // já foi aplicado na criação; aqui é a guarda server-side.
  if (intake.reformaTributaria !== 'diagnosticar') {
    return NextResponse.json({ skipped: true, reason: 'modulo_nao_ativado' })
  }

  const fbFiltrado = getFactBankForAgent(analise.fact_bank ?? null, FERRANTE.key)
  const input: FerranteInput = {
    intakeResumo:      intakeResumo(intake),
    factBank:          formatFactBankForPrompt(fbFiltrado),
    outputsRelevantes: outputsRelevantes(outputs),
    baseRegras:        '',   // injetada no system prompt do agente
  }

  let run
  try {
    run = await avaliarReformaTributaria(input, analiseId)
  } catch (e) {
    console.error('[reforma-tributaria] Ferrante falhou:', e)
    return NextResponse.json({ error: 'Falha ao gerar diagnóstico tributário' }, { status: 502 })
  }

  // Grava o output estruturado (JSON normalizado se parseou; bruto como fallback).
  // Relê outputs antes de mesclar para não sobrescrever escritas de outros steps.
  const textForStorage = run.result ? JSON.stringify(run.result) : run.raw
  const { data: cur } = await admin.from('analises').select('outputs').eq('id', analiseId).single()
  await admin.from('analises').update({
    outputs: {
      ...((cur?.outputs as Record<string, string>) ?? {}),
      reforma_tributaria: textForStorage,
    },
    atualizado_em: new Date().toISOString(),
  }).eq('id', analiseId)

  return NextResponse.json({
    ok:          true,
    parsed:      !!run.result,
    score:       run.result?.conformidade_score ?? null,
    kb_version:  run.kbVersion,
  })
}
