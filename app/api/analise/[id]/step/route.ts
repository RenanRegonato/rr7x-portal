import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createAdminClient } from '@/lib/supabase-server'
import { anthropic, MODEL } from '@/lib/anthropic'

export const maxDuration = 60

const ADMIN_EMAIL = 'gestor@renanregonato.com.br'

async function loadPrompts(): Promise<Record<string, string>> {
  try {
    const admin = createAdminClient()
    const { data } = await admin.from('agent_prompts').select('id, system_prompt')
    if (data) return Object.fromEntries(data.map(r => [r.id, r.system_prompt]))
  } catch {}
  return {}
}

async function callAgent(systemPrompt: string, userMessage: string): Promise<string> {
  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 4096,
    system: systemPrompt,
    messages: [{ role: 'user', content: userMessage }],
  })
  return response.content[0].type === 'text' ? response.content[0].text : ''
}

function formatIntake(intake: Record<string, string>): string {
  return `
DEAL INTAKE — RR7x Capital Hub
================================
Ativo: ${intake.nomeAtivo}
Tipo de Ativo: ${intake.tipoAtivo}
Estágio: ${intake.estagio}
Objetivo: ${intake.objetivo}
Nível de Informação Disponível: ${intake.nivelInformacao}
Localização: ${intake.localizacao}
Ticket Estimado: ${intake.ticketEstimado}
${intake.resumoAtivo ? `Resumo e Tese do Ativo: ${intake.resumoAtivo}` : ''}
${intake.linkDocumentos ? `Link dos Documentos: ${intake.linkDocumentos}` : ''}
${intake.informacoesAdicionais ? `Informações Adicionais: ${intake.informacoesAdicionais}` : ''}
`.trim()
}

function buildAllOutputs(outputs: Record<string, string>): string {
  const order = ['orchestration', 'pesquisa', 'diagnostico', 'analise_ma', 'contratos', 'originacao', 'estruturacao', 'maturidade', 'revisao']
  const labels: Record<string, string> = {
    orchestration: 'ORQUESTRAÇÃO', pesquisa: 'PESQUISA', diagnostico: 'DIAGNÓSTICO',
    analise_ma: 'ANÁLISE M&A', contratos: 'CONTRATOS', originacao: 'ORIGINAÇÃO',
    estruturacao: 'ESTRUTURAÇÃO', maturidade: 'MATURIDADE', revisao: 'REVISÃO',
  }
  return order.filter(k => outputs[k]).map(k => `${labels[k]}:\n${outputs[k]}`).join('\n\n')
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const { id } = await params
  const { step } = await req.json()

  const admin = createAdminClient()

  // Verifica posse da análise (admin pode rodar qualquer uma)
  const { data: analise } = await admin.from('analises').select('*').eq('id', id).single()
  if (!analise) return NextResponse.json({ error: 'Análise não encontrada' }, { status: 404 })
  if (analise.user_id !== user.id && user.email !== ADMIN_EMAIL) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })
  }

  const intake = analise.deal_intake as Record<string, string>
  const outputs = (analise.outputs ?? {}) as Record<string, string>
  const prompts = await loadPrompts()
  const msg = (key: string, fallback: string) => prompts[key] || fallback
  const intakeStr = formatIntake(intake)
  const allOutputs = buildAllOutputs(outputs)

  let result = ''

  switch (step) {
    case 'orchestration':
      result = await callAgent(
        msg('orquestrador', 'Você é Otto Orquestra, Deal Orchestrator da RR7x Capital Hub. Calcule o DRS, mapeie riscos e defina o próximo passo estratégico.'),
        `Analise este deal intake e produza o diagnóstico completo:\n\n${intakeStr}`
      )
      break
    case 'pesquisa':
      result = await callAgent(
        msg('pesquisador', 'Você é Pedro Panorama, Market Intelligence Analyst da RR7x Capital Hub. Produza um Estudo de Viabilidade Econômica com veredicto Go/No-Go.'),
        `Produza a pesquisa mercadológica completa para este ativo:\n\n${intakeStr}`
      )
      break
    case 'diagnostico':
      result = await callAgent(
        msg('diagnosticador', 'Você é Davi Diagnóstico, Financial Diagnostician da RR7x Capital Hub. Diagnostique a saúde financeira e recomende a estrutura de operação.'),
        `Produza o diagnóstico financeiro completo para este ativo:\n\n${intakeStr}`
      )
      break
    case 'analise_ma':
      result = await callAgent(
        msg('arquiteto_ma', 'Você é Arthur Aquisição, M&A Architect da RR7x Capital Hub. Construa o valuation, articule a tese e defina a estratégia de negociação.'),
        `Produza a análise de M&A completa para este ativo:\n\n${intakeStr}`
      )
      break
    case 'contratos':
      result = await callAgent(
        msg('contratualista', 'Você é Clara Cláusula, Contracts Specialist da RR7x Capital Hub. Mapeie riscos jurídicos e recomende a documentação necessária.'),
        `Produza a análise contratual completa para este ativo:\n\n${intakeStr}`
      )
      break
    case 'originacao':
      result = await callAgent(
        msg('originador', 'Você é Victor Valor, Deal Originator da RR7x Capital Hub. Estruture o posicionamento comercial e o pipeline de compradores.'),
        `Produza a estratégia de venda e originação para este ativo:\n\n${intakeStr}`
      )
      break
    case 'estruturacao':
      result = await callAgent(
        msg('estruturador', 'Você é Estela Estrutura, Operation Structure Advisor da RR7x Capital Hub. Mapeie as operações financeiras e prescreva as melhores.'),
        `Produza a estruturação operacional completa para este ativo:\n\n${intakeStr}`
      )
      break
    case 'maturidade':
      result = await callAgent(
        msg('preparador', 'Você é Paulo Preparo, Deal Readiness Coach da RR7x Capital Hub. Emita o Veredicto de Maturidade definitivo e o plano de preparação.'),
        `Com base em todos os outputs dos especialistas abaixo, emita o Veredicto de Maturidade:\n\n${allOutputs}`
      )
      break
    case 'revisao':
      result = await callAgent(
        msg('revisor', 'Você é Rodrigo Relatório, Quality Reviewer da RR7x Capital Hub. Verifique coerência, completude e consistência entre todos os outputs.'),
        `Revise a coerência e qualidade de todos os outputs:\n\n${allOutputs}`
      )
      break
    case 'blind_teaser':
      result = await callAgent(
        msg('blind_teaser', 'Você é um especialista em comunicação de M&A da RR7x Capital Hub. Gere um Blind Teaser profissional sem revelar o nome do ativo.'),
        `Gere o Blind Teaser:\n\nDEAL INTAKE:\n${intakeStr}\n\nOUTPUTS:\n${allOutputs}`
      )
      break
    case 'sell_side_pitchbook':
      result = await callAgent(
        msg('sell_side_pitchbook', 'Você é um especialista em documentos de captação da RR7x Capital Hub. Gere um Sell-Side Pitchbook completo.'),
        `Gere o Sell-Side Pitchbook:\n\nDEAL INTAKE:\n${intakeStr}\n\nOUTPUTS:\n${allOutputs}`
      )
      break
    default:
      return NextResponse.json({ error: 'Step inválido' }, { status: 400 })
  }

  const newOutputs = { ...outputs, [step]: result }
  await admin.from('analises').update({
    outputs: newOutputs,
    atualizado_em: new Date().toISOString(),
  }).eq('id', id)

  return NextResponse.json({ ok: true, result })
  } catch (err: any) {
    console.error('[step error]', err)
    return NextResponse.json({ error: err?.message ?? 'Erro interno no agente' }, { status: 500 })
  }
}
