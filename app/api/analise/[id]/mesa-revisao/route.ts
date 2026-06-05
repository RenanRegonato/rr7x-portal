import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient, createServerSupabaseClient } from '@/lib/supabase-server'
import { canAccessAnalise, getUserContext } from '@/lib/get-role'
import { revisarMesa } from '@/lib/agents/mesa-consolidadora'
import { routeFor } from '@/lib/llm/models'
import { getFacts, formatTruthLayer } from '@/lib/truth-layer'
import { audit, extractIp } from '@/lib/audit'
import { isInternalCall } from '@/lib/internal-auth'

export const maxDuration = 300

const STEP_LABELS: Record<string, string> = {
  orchestration: 'Orquestração do Mandato',
  pesquisa:      'Inteligência de Mercado',
  diagnostico:   'Diagnóstico Financeiro',
  analise_ma:    'Estruturação de M&A',
  kyc:           'KYC & Compliance',
  contratos:     'Due Diligence Jurídica',
  originacao:    'Originação',
  estruturacao:  'Estruturação de Crédito',
  maturidade:    'Validação de Oportunidades',
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

// POST /api/analise/[id]/mesa-revisao
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  // Chamada server-to-server do orquestrador Inngest pula auth de usuário.
  const internal = isInternalCall(req)

  const { id: analiseId } = await params
  const admin = createAdminClient()

  const { data: analise } = await admin
    .from('analises')
    .select('user_id, deal_intake, outputs')
    .eq('id', analiseId)
    .maybeSingle()

  if (!analise) return NextResponse.json({ error: 'Análise não encontrada' }, { status: 404 })

  let userId: string | null = null
  if (!internal) {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    userId = user.id

    const ctx = await getUserContext()
    if (!ctx) return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })

    const podeAcessar = await canAccessAnalise(ctx, analise.user_id)
    if (!podeAcessar) return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
  }

  const outputs = (analise.outputs ?? {}) as Record<string, string>
  const intake  = (analise.deal_intake ?? {}) as Record<string, string>

  const outputs_agentes: Record<string, { label: string; conteudo: string }> = {}
  for (const [key, label] of Object.entries(STEP_LABELS)) {
    if (outputs[key]) outputs_agentes[key] = { label, conteudo: outputs[key] }
  }

  const facts = await getFacts(analiseId)
  const fatos_relevantes = formatTruthLayer(facts)

  // Resumo das issues determinísticas (não resolvidas)
  const { data: issues } = await admin
    .from('consistency_issues')
    .select('severidade, tipo, resumo, steps_envolvidos')
    .eq('analise_id', analiseId)
    .eq('resolvido', false)
    .order('severidade', { ascending: true })

  const consistency_summary = (issues ?? []).length === 0
    ? ''
    : (issues ?? []).map(i => `- [${i.severidade.toUpperCase()}] (${i.tipo}) ${i.resumo} — agentes: ${(i.steps_envolvidos ?? []).join(', ')}`).join('\n')

  const sindromes = (issues ?? []).filter(i => i.tipo === 'sindrome_sistemica')
  const sindromes_summary = sindromes.length === 0
    ? ''
    : sindromes.map(s => `- ${s.resumo}`).join('\n')

  let result
  try {
    result = await revisarMesa({
      outputs_agentes,
      intake_resumo:       intakeResumo(intake),
      fatos_relevantes,
      consistency_summary,
      sindromes_summary,
    }, analiseId)
  } catch (e) {
    console.error('[mesa-revisao] Mesa falhou:', e)
    return NextResponse.json({ error: 'Falha na revisão da Mesa' }, { status: 502 })
  }

  // Persiste contradições semânticas detectadas como consistency_issues
  await admin
    .from('consistency_issues')
    .delete()
    .eq('analise_id', analiseId)
    .eq('tipo', 'contradicao_semantica')
    .eq('resolvido', false)

  if (result.contradicoes_detectadas.length > 0) {
    await admin.from('consistency_issues').insert(
      result.contradicoes_detectadas.map(c => ({
        analise_id:        analiseId,
        severidade:        c.criticidade === 'alta' ? 'bloqueante' : c.criticidade === 'media' ? 'alerta' : 'info',
        tipo:              'contradicao_semantica',
        resumo:            c.descricao,
        detalhes:          { criticidade: c.criticidade, fonte: 'mesa_consolidadora' },
        steps_envolvidos:  c.agentes,
        fact_ids:          [],
        benchmark_ids:     [],
        claim_ids:         [],
      }))
    )
  }

  const now = new Date().toISOString()
  await admin
    .from('analises')
    .update({
      mesa_revisao:     { ...result, model_id: routeFor('mesa_revisao').model },
      mesa_revisao_at:  now,
    })
    .eq('id', analiseId)

  void audit({
    event:    'mesa.revisao_run',
    userId,
    targetId: analiseId,
    metadata: {
      aprovacao:                 result.aprovacao,
      contradicoes_detectadas:   result.contradicoes_detectadas.length,
    },
    ip:       extractIp(req.headers),
    userAgent: req.headers.get('user-agent'),
  })

  return NextResponse.json({ mesa_revisao: result, mesa_revisao_at: now })
}

// GET /api/analise/[id]/mesa-revisao
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
    .select('user_id, mesa_revisao, mesa_revisao_at')
    .eq('id', analiseId)
    .maybeSingle()

  if (!analise) return NextResponse.json({ error: 'Análise não encontrada' }, { status: 404 })

  const podeAcessar = await canAccessAnalise(ctx, analise.user_id)
  if (!podeAcessar) return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })

  return NextResponse.json({
    mesa_revisao:    analise.mesa_revisao ?? null,
    mesa_revisao_at: analise.mesa_revisao_at ?? null,
  })
}
