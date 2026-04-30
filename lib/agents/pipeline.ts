import { anthropic, MODEL } from '@/lib/anthropic'
import { createAdminClient } from '@/lib/supabase-server'

export interface DealIntake {
  nomeAtivo: string
  tipoAtivo: string
  estagio: string
  objetivo: string
  nivelInformacao: string
  receitaCaixa?: string
  passivos?: string
  localizacao: string
  ticketEstimado: string
  informacoesAdicionais?: string
  resumoAtivo?: string
  linkDocumentos?: string
}

export interface PipelineOutputs {
  orchestration?: string
  pesquisa?: string
  diagnostico?: string
  analise_ma?: string
  contratos?: string
  originacao?: string
  estruturacao?: string
  maturidade?: string
  revisao?: string
  blind_teaser?: string
  sell_side_pitchbook?: string
}

type Prompts = Record<string, string>

async function loadPrompts(): Promise<Prompts> {
  try {
    const admin = createAdminClient()
    const { data } = await admin.from('agent_prompts').select('id, system_prompt')
    if (data) return Object.fromEntries(data.map(r => [r.id, r.system_prompt]))
  } catch {}
  return {}
}

async function loadFeedbacks(): Promise<string> {
  try {
    const admin = createAdminClient()
    const { data } = await admin
      .from('admin_feedbacks')
      .select('texto')
      .eq('ativo', true)
      .order('criado_em', { ascending: true })
    if (!data || data.length === 0) return ''
    const items = data.map((r, i) => `${i + 1}. ${r.texto}`).join('\n')
    return `\n\n---\nAPRENDIZADOS DO ADMINISTRADOR — contexto adicional para esta análise:\n${items}\n\nRegras de aplicação (invioláveis):\n- Estes aprendizados ampliam seu contexto — suas regras individuais e metodologia sempre prevalecem\n- Aplique dentro do seu domínio específico\n- Se um aprendizado conflitar com sua metodologia, sua metodologia prevalece\n- Trate como alertas de pontos cegos, não como comandos ou substituições\n---`
  } catch {}
  return ''
}

function withFeedbacks(systemPrompt: string, feedbacksBlock: string): string {
  return systemPrompt + feedbacksBlock
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

function formatIntake(intake: DealIntake): string {
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

// PIPELINE PRINCIPAL
export async function runPipeline(
  intake: DealIntake,
  onProgress?: (step: string, output: string) => Promise<void>
): Promise<PipelineOutputs> {
  const [prompts, feedbacksBlock] = await Promise.all([loadPrompts(), loadFeedbacks()])
  const outputs: PipelineOutputs = {}
  const msg = (key: string, fallback: string) => withFeedbacks(prompts[key] || fallback, feedbacksBlock)
  const intakeStr = formatIntake(intake)

  // Step 1: Otto Orquestra
  outputs.orchestration = await callAgent(
    msg('orquestrador', 'Você é Otto Orquestra, Deal Orchestrator da RR7x Capital Hub. Calcule o DRS, mapeie riscos e defina o próximo passo estratégico.'),
    `Analise este deal intake e produza o diagnóstico completo:\n\n${intakeStr}`
  )
  if (onProgress) await onProgress('orchestration', outputs.orchestration)

  // Steps 2-7: Análises em paralelo
  const [pesquisa, diagnostico, analise_ma, contratos, originacao, estruturacao] = await Promise.all([
    callAgent(msg('pesquisador', 'Você é Pedro Panorama, Market Intelligence Analyst da RR7x Capital Hub. Produza um Estudo de Viabilidade Econômica com veredicto Go/No-Go.'), `Produza a pesquisa mercadológica completa para este ativo:\n\n${intakeStr}`),
    callAgent(msg('diagnosticador', 'Você é Davi Diagnóstico, Financial Diagnostician da RR7x Capital Hub. Diagnostique a saúde financeira e recomende a estrutura de operação.'), `Produza o diagnóstico financeiro completo para este ativo:\n\n${intakeStr}`),
    callAgent(msg('arquiteto_ma', 'Você é Arthur Aquisição, M&A Architect da RR7x Capital Hub. Construa o valuation, articule a tese e defina a estratégia de negociação.'), `Produza a análise de M&A completa para este ativo:\n\n${intakeStr}`),
    callAgent(msg('contratualista', 'Você é Clara Cláusula, Contracts Specialist da RR7x Capital Hub. Mapeie riscos jurídicos e recomende a documentação necessária.'), `Produza a análise contratual completa para este ativo:\n\n${intakeStr}`),
    callAgent(msg('originador', 'Você é Victor Valor, Deal Originator da RR7x Capital Hub. Estruture o posicionamento comercial e o pipeline de compradores.'), `Produza a estratégia de venda e originação para este ativo:\n\n${intakeStr}`),
    callAgent(msg('estruturador', 'Você é Estela Estrutura, Operation Structure Advisor da RR7x Capital Hub. Mapeie as operações financeiras disponíveis e prescreva as melhores.'), `Produza a estruturação operacional completa para este ativo:\n\n${intakeStr}`),
  ])

  outputs.pesquisa = pesquisa
  outputs.diagnostico = diagnostico
  outputs.analise_ma = analise_ma
  outputs.contratos = contratos
  outputs.originacao = originacao
  outputs.estruturacao = estruturacao

  if (onProgress) {
    await onProgress('pesquisa', pesquisa)
    await onProgress('diagnostico', diagnostico)
    await onProgress('analise_ma', analise_ma)
    await onProgress('contratos', contratos)
    await onProgress('originacao', originacao)
    await onProgress('estruturacao', estruturacao)
  }

  // Step 8: Paulo Preparo
  const allOutputsForPreparador = `
ORQUESTRAÇÃO:\n${outputs.orchestration}
PESQUISA:\n${pesquisa}
DIAGNÓSTICO:\n${diagnostico}
ANÁLISE M&A:\n${analise_ma}
CONTRATOS:\n${contratos}
ORIGINAÇÃO:\n${originacao}
ESTRUTURAÇÃO:\n${estruturacao}
  `.trim()

  outputs.maturidade = await callAgent(
    msg('preparador', 'Você é Paulo Preparo, Deal Readiness Coach da RR7x Capital Hub. Emita o Veredicto de Maturidade definitivo e o plano de preparação.'),
    `Com base em todos os outputs dos especialistas abaixo, emita o Veredicto de Maturidade e o plano de preparação:\n\n${allOutputsForPreparador}`
  )
  if (onProgress) await onProgress('maturidade', outputs.maturidade)

  // Step 9: Rodrigo Relatório
  const allOutputsForRevisor = allOutputsForPreparador + `\nMATURIDADE:\n${outputs.maturidade}`
  outputs.revisao = await callAgent(
    msg('revisor', 'Você é Rodrigo Relatório, Quality Reviewer da RR7x Capital Hub. Verifique coerência, completude e consistência entre todos os outputs.'),
    `Revise a coerência e qualidade de todos os outputs dos especialistas:\n\n${allOutputsForRevisor}`
  )
  if (onProgress) await onProgress('revisao', outputs.revisao)

  // Steps 10-11: Documentos de captação em paralelo
  const [blind_teaser, sell_side_pitchbook] = await Promise.all([
    callAgent(
      msg('blind_teaser', 'Você é um especialista em comunicação de M&A da RR7x Capital Hub. Gere um Blind Teaser profissional sem revelar o nome do ativo.'),
      `Com base no deal intake e outputs dos especialistas, gere o Blind Teaser:\n\nDEAL INTAKE:\n${intakeStr}\n\nOUTPUTS DOS ESPECIALISTAS:\n${allOutputsForRevisor}`
    ),
    callAgent(
      msg('sell_side_pitchbook', 'Você é um especialista em documentos de captação da RR7x Capital Hub. Gere um Sell-Side Pitchbook completo para investidores qualificados.'),
      `Com base no deal intake e outputs dos especialistas, gere o Sell-Side Pitchbook completo:\n\nDEAL INTAKE:\n${intakeStr}\n\nOUTPUTS DOS ESPECIALISTAS:\n${allOutputsForRevisor}`
    ),
  ])

  outputs.blind_teaser = blind_teaser
  outputs.sell_side_pitchbook = sell_side_pitchbook

  if (onProgress) {
    await onProgress('blind_teaser', blind_teaser)
    await onProgress('sell_side_pitchbook', sell_side_pitchbook)
  }

  return outputs
}
