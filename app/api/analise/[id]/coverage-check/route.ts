import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient, createServerSupabaseClient } from '@/lib/supabase-server'
import { canAccessAnalise, getUserContext } from '@/lib/get-role'
import { validarCoverage } from '@/lib/agents/coverage-validator'
import { detectarTipoOperacao, getChecklist } from '@/lib/coverage-checklists'
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
  const checklist = getChecklist(tipo)

  const outputs_agentes: Record<string, { label: string; conteudo: string }> = {}
  for (const [key, label] of Object.entries(STEP_LABELS)) {
    if (outputs[key]) outputs_agentes[key] = { label, conteudo: outputs[key] }
  }

  let result
  try {
    result = await validarCoverage({
      tipo_operacao:   tipo,
      checklist,
      outputs_agentes,
      intake_resumo:   intakeResumo(intake),
    })
  } catch (e) {
    console.error('[coverage-check] failed:', e)
    return NextResponse.json({ error: 'Falha ao validar cobertura' }, { status: 502 })
  }

  const coverage_check = {
    tipo_operacao: tipo,
    items:         result.items,
    resumo:        result.resumo,
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
      resumo:        result.resumo,
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
