import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient, createServerSupabaseClient } from '@/lib/supabase-server'
import { canAccessAnalise, getUserContext } from '@/lib/get-role'
import { validarCoverage, type CoverageItemResult, type CoverageOutput } from '@/lib/agents/coverage-validator'
import { detectarTipoOperacao, getChecklist, requerHistoricoOperacional } from '@/lib/coverage-checklists'
import { isEarlyStage } from '@/lib/early-stage'
import { audit, extractIp } from '@/lib/audit'

export const maxDuration = 300

const STEP_LABELS: Record<string, string> = {
  orchestration: 'Mandor Orquestra',
  pesquisa:      'Pedro Panorama',
  diagnostico:   'Davi Diagnóstico',
  analise_ma:    'Arthur Aquisição',
  kyc:           'Carmen Compliance',
  contratos:     'Clara Cláusula',
  originacao:    'Victor Valor',
  estruturacao:  'Estela Estrutura',
  maturidade:    'Paulo Preparo',
}

function intakeResumo(intake: Record<string, string>): string {
  return [
    ['Ativo', intake.nomeAtivo],
    ['Tipo', intake.tipoAtivo],
    ['Objetivo', intake.objetivo],
    ['Ticket', intake.ticketEstimado],
    ['Resumo ativo', intake.resumoAtivo],
  ].filter(([, v]) => v && v.length > 0).map(([k, v]) => `**${k}:** ${v}`).join('\n')
}

// POST /api/analise/[id]/coverage-check
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const ctx = await getUserContext()
  if (!ctx) return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })

  const { id: analiseId } = await params
  const admin = createAdminClient()

  const { data: analise } = await admin
    .from('analises')
    .select('user_id, deal_intake, outputs')
    .eq('id', analiseId)
    .maybeSingle()

  if (!analise) return NextResponse.json({ error: 'Análise não encontrada' }, { status: 404 })

  const podeAcessar = await canAccessAnalise(ctx, analise.user_id)
  if (!podeAcessar) return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })

  const intake  = (analise.deal_intake ?? {}) as Record<string, string>
  const outputs = (analise.outputs ?? {})     as Record<string, string>

  const tipo = detectarTipoOperacao(intake)
  const checklistCompleto = getChecklist(tipo)
  const earlyStage = isEarlyStage(intake)

  // Early-stage (pré-operacional): itens que dependem de histórico operacional
  // (DRE/balancete/DFRE, EBITDA histórico, dívida líquida) não se aplicam — a
  // ausência é esperada e NÃO penaliza. Validamos via IA apenas o restante.
  const naoAplicaveis = earlyStage ? checklistCompleto.filter(requerHistoricoOperacional) : []
  const aValidar      = earlyStage ? checklistCompleto.filter(c => !requerHistoricoOperacional(c)) : checklistCompleto

  const outputs_agentes: Record<string, { label: string; conteudo: string }> = {}
  for (const [key, label] of Object.entries(STEP_LABELS)) {
    if (outputs[key]) outputs_agentes[key] = { label, conteudo: outputs[key] }
  }

  let validated: CoverageOutput = { items: [], resumo: { coberto: 0, parcial: 0, nao_coberto: 0, nao_aplicavel: 0 } }
  if (aValidar.length > 0) {
    try {
      validated = await validarCoverage({
        tipo_operacao:   tipo,
        checklist:       aValidar,
        outputs_agentes,
        intake_resumo:   intakeResumo(intake),
      })
    } catch (e) {
      console.error('[coverage-check] failed:', e)
      return NextResponse.json({ error: 'Falha ao validar cobertura' }, { status: 502 })
    }
  }

  // Itens não-aplicáveis: marcados deterministicamente, sem chamar a IA.
  const naoAplicaveisItems: CoverageItemResult[] = naoAplicaveis.map(c => ({
    key:                  c.key,
    label:                c.label,
    status:               'nao_aplicavel',
    evidencia:            '',
    justificativa:        'Projeto pré-operacional — sem histórico operacional consolidado. Documento histórico não aplicável nesta etapa; ausência esperada e justificada.',
    agentes_responsaveis: c.agentes_responsaveis,
  }))

  // Reordena conforme a checklist original do tipo de operação.
  const byKey = new Map<string, CoverageItemResult>()
  for (const it of [...validated.items, ...naoAplicaveisItems]) byKey.set(it.key, it)
  const items = checklistCompleto
    .map(c => byKey.get(c.key))
    .filter((it): it is CoverageItemResult => Boolean(it))

  const resumo = {
    coberto:       validated.resumo.coberto,
    parcial:       validated.resumo.parcial,
    nao_coberto:   validated.resumo.nao_coberto,
    nao_aplicavel: naoAplicaveisItems.length,
  }

  const coverage_check = {
    tipo_operacao: tipo,
    early_stage:   earlyStage,
    items,
    resumo,
    model_id:      'claude-sonnet-4-6',
  }
  const now = new Date().toISOString()

  await admin
    .from('analises')
    .update({
      coverage_check,
      coverage_checked_at: now,
    })
    .eq('id', analiseId)

  void audit({
    event:    'coverage.checked',
    userId:   user.id,
    targetId: analiseId,
    metadata: {
      tipo_operacao: tipo,
      early_stage:   earlyStage,
      resumo,
    },
    ip:       extractIp(req.headers),
    userAgent: req.headers.get('user-agent'),
  })

  return NextResponse.json({ coverage_check, coverage_checked_at: now })
}

// GET /api/analise/[id]/coverage-check
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const ctx = await getUserContext()
  if (!ctx) return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })

  const { id: analiseId } = await params
  const admin = createAdminClient()

  const { data: analise } = await admin
    .from('analises')
    .select('user_id, coverage_check, coverage_checked_at')
    .eq('id', analiseId)
    .maybeSingle()

  if (!analise) return NextResponse.json({ error: 'Análise não encontrada' }, { status: 404 })

  const podeAcessar = await canAccessAnalise(ctx, analise.user_id)
  if (!podeAcessar) return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })

  return NextResponse.json({
    coverage_check:      analise.coverage_check ?? null,
    coverage_checked_at: analise.coverage_checked_at ?? null,
  })
}
