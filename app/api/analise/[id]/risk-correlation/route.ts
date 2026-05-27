import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient, createServerSupabaseClient } from '@/lib/supabase-server'
import { canAccessAnalise, getUserContext } from '@/lib/get-role'
import { detectarSindromes, type Sindrome } from '@/lib/agents/sentinela'
import { getFacts, formatTruthLayer } from '@/lib/truth-layer'
import { audit, extractIp } from '@/lib/audit'
import { isInternalCall } from '@/lib/internal-auth'

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
    ['Ativo',          intake.nomeAtivo],
    ['Tipo',           intake.tipoAtivo],
    ['Objetivo',       intake.objetivo],
    ['Ticket',         intake.ticketEstimado],
    ['Resumo ativo',   intake.resumoAtivo],
  ].filter(([, v]) => v && v.length > 0).map(([k, v]) => `**${k}:** ${v}`).join('\n')
}

// Mapeia severidade da síndrome para severidade do consistency_issue
function severidadeIssue(sev: Sindrome['severidade']): 'bloqueante' | 'alerta' | 'info' {
  if (sev === 'critica') return 'bloqueante'
  if (sev === 'alta')    return 'alerta'
  return 'info'
}

// POST /api/analise/[id]/risk-correlation
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

  // Monta outputs dos agentes especialistas
  const outputs_agentes: Record<string, { label: string; conteudo: string }> = {}
  for (const [key, label] of Object.entries(STEP_LABELS)) {
    if (outputs[key]) outputs_agentes[key] = { label, conteudo: outputs[key] }
  }

  const facts = await getFacts(analiseId)
  const fatos_relevantes = formatTruthLayer(facts)

  let result
  try {
    result = await detectarSindromes({
      outputs_agentes,
      intake_resumo:    intakeResumo(intake),
      fatos_relevantes,
    }, analiseId)
  } catch (e) {
    console.error('[risk-correlation] Sentinela falhou:', e)
    return NextResponse.json({ error: 'Falha ao detectar síndromes' }, { status: 502 })
  }

  // Limpa síndromes anteriores (não-resolvidas) desta análise
  await admin
    .from('consistency_issues')
    .delete()
    .eq('analise_id', analiseId)
    .eq('tipo', 'sindrome_sistemica')
    .eq('resolvido', false)

  // Persiste cada síndrome como consistency_issue
  if (result.sindromes.length > 0) {
    await admin.from('consistency_issues').insert(
      result.sindromes.map(s => ({
        analise_id:        analiseId,
        severidade:        severidadeIssue(s.severidade),
        tipo:              'sindrome_sistemica',
        resumo:            `${s.nome}: ${s.explicacao}`,
        detalhes:          {
          nome:            s.nome,
          severidade_orig: s.severidade,
          componentes:     s.componentes,
          implicacoes:     s.implicacoes,
          acoes_sugeridas: s.acoes_sugeridas,
        },
        steps_envolvidos:  Array.from(new Set(s.componentes.map(c => c.step))),
        fact_ids:          [],
        benchmark_ids:     [],
        claim_ids:         [],
      }))
    )
  }

  const now = new Date().toISOString()
  await admin.from('analises').update({ risk_correlation_at: now }).eq('id', analiseId)

  void audit({
    event:    'risk.correlation_run',
    userId,
    targetId: analiseId,
    metadata: {
      total: result.sindromes.length,
      por_severidade: result.sindromes.reduce<Record<string, number>>((acc, s) => {
        acc[s.severidade] = (acc[s.severidade] ?? 0) + 1
        return acc
      }, {}),
    },
    ip:       extractIp(req.headers),
    userAgent: req.headers.get('user-agent'),
  })

  return NextResponse.json({
    sindromes:          result.sindromes,
    total:              result.sindromes.length,
    risk_correlation_at: now,
  })
}
