import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createAdminClient } from '@/lib/supabase-server'
import { anthropic, MODEL } from '@/lib/anthropic'
import { readAnalyseDocs, DocReadSummary } from '@/lib/doc-reader'

export const maxDuration = 300

const ADMIN_EMAIL = 'gestor@renanregonato.com.br'

const HUMANIZER_DIRECTIVE = `

---
DIRETRIZES DE ESCRITA — aplique em todo o output:

Escreva como um analista sênior de mercado financeiro que domina o assunto — direto, preciso, sem floreios de IA. O leitor é um assessor, investidor ou gestor de fundos; ele reconhece padrão de IA e perde confiança no relatório se soar genérico.

PROIBIDO:
- Palavras-gatilho de IA: crucial, fundamental, vital, pivotal, robusto, abrangente, ressaltar, destacar, evidenciar, impulsionar, catalisar, alavancar (no sentido figurado), ecossistema (figurado), jornada (figurado), landscape, showcasing, alinhado, sinergias (sem dado concreto)
- Construções artificiais: "serve como", "representa um marco", "é um testemunho de", "está no cerne de", "no coração de", "destaca-se como", "posiciona-se como"
- Frases de abertura vazias: "Vamos explorar", "A seguir, abordaremos", "Neste relatório, apresentamos", "Com base nos dados disponíveis"
- Conclusões genéricas: "O futuro é promissor", "O caminho está claro", "Com as ações corretas...", "Há grande potencial"
- Tríades forçadas (X, Y e Z) quando só dois pontos existem de fato
- Negrito mecânico — use apenas para números críticos ou termos técnicos específicos
- Emojis em headings ou bullets
- Hedging excessivo: "poderia potencialmente", "é possível que talvez", "em certa medida"
- Seções de "Desafios e Perspectivas" formulaicas

OBRIGATÓRIO:
- Use "é", "tem", "pode", "faz" em vez de "serve como", "representa", "demonstra ser"
- Varie o ritmo: frases curtas quando o ponto é simples; frases mais longas quando a cadeia de raciocínio exige
- Se um problema é grave, diga que é grave — sem suavizar com "pontos de atenção" ou "desafios a endereçar"
- Quando houver incerteza real sobre os dados, declare com precisão o que é incerto e por quê
- Headings em letras minúsculas (exceto primeira letra e nomes próprios)
- Terminologia técnica financeira É preservada e encorajada: EBITDA, DRS, M&A, CRI, LCI, CRA, SPE, covenant, due diligence, cap rate, LTV, DSCR, TIR, VPL — estas são o vocabulário correto do mercado, não padrões de IA
- Tenha posição quando os dados sustentam uma; não neutralize artificialmente análises que apontam para uma conclusão clara`

async function loadPrompts(): Promise<Record<string, string>> {
  try {
    const admin = createAdminClient()
    const { data } = await admin.from('agent_prompts').select('id, system_prompt')
    if (data) return Object.fromEntries(data.map(r => [r.id, r.system_prompt]))
  } catch {}
  return {}
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
${intake.informacoesAdicionais ? `Informações Adicionais: ${intake.informacoesAdicionais}` : ''}
`.trim()
}

function buildAllOutputs(outputs: Record<string, string>): string {
  const order = ['drive_intake', 'orchestration', 'pesquisa', 'diagnostico', 'analise_ma', 'contratos', 'originacao', 'estruturacao', 'maturidade', 'revisao']
  const labels: Record<string, string> = {
    drive_intake: 'INGESTÃO DE DADOS', orchestration: 'ORQUESTRAÇÃO', pesquisa: 'PESQUISA',
    diagnostico: 'DIAGNÓSTICO', analise_ma: 'ANÁLISE M&A', contratos: 'CONTRATOS',
    originacao: 'ORIGINAÇÃO', estruturacao: 'ESTRUTURAÇÃO', maturidade: 'MATURIDADE', revisao: 'REVISÃO',
  }
  return order.filter(k => outputs[k]).map(k => `${labels[k]}:\n${outputs[k]}`).join('\n\n')
}

function buildAllOutputsForReport(outputs: Record<string, string>): string {
  const all = [
    { key: 'drive_intake',        label: 'INGESTÃO DE DADOS — Diagnóstico Documental' },
    { key: 'orchestration',       label: 'ORQUESTRAÇÃO — Otto Orquestra (Deal Orchestrator)' },
    { key: 'pesquisa',            label: 'PESQUISA MERCADOLÓGICA — Pedro Panorama (Market Intelligence)' },
    { key: 'diagnostico',         label: 'DIAGNÓSTICO FINANCEIRO — Davi Diagnóstico (Financial Diagnostician)' },
    { key: 'analise_ma',          label: 'ANÁLISE DE M&A — Arthur Aquisição (M&A Architect)' },
    { key: 'contratos',           label: 'ANÁLISE CONTRATUAL — Clara Cláusula (Contracts Specialist)' },
    { key: 'originacao',          label: 'VENDA & ORIGINAÇÃO — Victor Valor (Deal Originator)' },
    { key: 'estruturacao',        label: 'ESTRUTURAÇÃO OPERACIONAL — Estela Estrutura (Operations Advisor)' },
    { key: 'maturidade',          label: 'VEREDICTO DE MATURIDADE — Paulo Preparo (Deal Readiness Coach)' },
    { key: 'revisao',             label: 'REVISÃO FINAL — Rodrigo Relatório (Quality Reviewer)' },
    { key: 'blind_teaser',        label: 'BLIND TEASER' },
    { key: 'sell_side_pitchbook', label: 'SELL-SIDE PITCHBOOK' },
  ]
  const available = all.filter(({ key }) => outputs[key])
  const missing   = all.filter(({ key }) => !outputs[key])

  let result = available
    .map(({ key, label }) => `### ${label}:\n${outputs[key]}`)
    .join('\n\n---\n\n')

  if (missing.length > 0) {
    result += `\n\n---\n\n⚠️ ANÁLISES NÃO DISPONÍVEIS:\n${missing.map(({ label }) => `- ${label}`).join('\n')}`
  }
  return result
}

type ContentBlock =
  | { type: 'text'; text: string }
  | { type: 'image'; source: { type: 'base64'; media_type: string; data: string } }
  | { type: 'document'; source: { type: 'base64'; media_type: string; data: string } }

function buildDocIntakeContent(summary: DocReadSummary, intakeStr: string): ContentBlock[] {
  const blocks: ContentBlock[] = []

  const filesSummary = summary.totalFiles === 0
    ? 'Nenhum arquivo encontrado no bucket desta análise.'
    : summary.processed.map(d => {
        const status = d.status === 'ok' ? '✓' : d.status === 'error' ? '✗' : '—'
        const detail = d.status !== 'ok' ? ` (${d.reason})` : ` (${d.sizeKb}KB, ${d.type})`
        return `${status} ${d.name}${detail}`
      }).join('\n')

  blocks.push({
    type: 'text',
    text: `Produza o Diagnóstico de Ingestão de Dados com base nos arquivos abaixo.

DEAL INTAKE:
${intakeStr}

---
ARQUIVOS PROCESSADOS: ${summary.totalFiles} arquivo(s)
${filesSummary}
${summary.errors.length > 0 ? `\nERROS: ${summary.errors.join('; ')}` : ''}
---

Os documentos seguem abaixo (PDFs, imagens e textos). Analise o conteúdo real de cada um.`,
  })

  for (const doc of summary.processed.filter(d => d.type === 'pdf' && d.status === 'ok' && d.base64)) {
    blocks.push({ type: 'text', text: `\n--- Documento PDF: ${doc.name} (${doc.sizeKb}KB) ---` })
    blocks.push({ type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: doc.base64! } })
  }

  for (const doc of summary.processed.filter(d => d.type === 'image' && d.status === 'ok' && d.base64)) {
    blocks.push({ type: 'text', text: `\n--- Imagem: ${doc.name} (${doc.sizeKb}KB) ---` })
    blocks.push({ type: 'image', source: { type: 'base64', media_type: doc.mediaType!, data: doc.base64! } })
  }

  const textDocs = summary.processed.filter(d => d.type === 'text' && d.status === 'ok' && d.content)
  if (textDocs.length > 0) {
    const combined = textDocs
      .map(d => `--- ${d.name} (${d.sizeKb}KB) ---\n${d.content}`)
      .join('\n\n')
    blocks.push({ type: 'text', text: `\n\nCONTEÚDO DOS DOCUMENTOS DE TEXTO:\n${combined}` })
  }

  return blocks
}

function getStepArgs(step: string, prompts: Record<string, string>, intakeStr: string, allOutputs: string, outputs: Record<string, string> = {}): { system: string; user: string } | null {
  const msg = (key: string, fallback: string) => (prompts[key] || fallback) + HUMANIZER_DIRECTIVE
  switch (step) {
    case 'orchestration':
      return {
        system: msg('orquestrador', 'Você é Otto Orquestra, Deal Orchestrator da RR7x Capital Hub. Calcule o DRS, mapeie riscos e defina o próximo passo estratégico.'),
        user: `Analise este deal intake e produza o diagnóstico completo:\n\n${intakeStr}`,
      }
    case 'pesquisa':
      return {
        system: msg('pesquisador', 'Você é Pedro Panorama, Market Intelligence Analyst da RR7x Capital Hub. Produza um Estudo de Viabilidade Econômica com veredicto Go/No-Go.'),
        user: `Produza a pesquisa mercadológica completa para este ativo:\n\n${intakeStr}`,
      }
    case 'diagnostico':
      return {
        system: msg('diagnosticador', 'Você é Davi Diagnóstico, Financial Diagnostician da RR7x Capital Hub. Diagnostique a saúde financeira e recomende a estrutura de operação.'),
        user: `Produza o diagnóstico financeiro completo para este ativo:\n\n${intakeStr}`,
      }
    case 'analise_ma':
      return {
        system: msg('arquiteto_ma', 'Você é Arthur Aquisição, M&A Architect da RR7x Capital Hub. Construa o valuation, articule a tese e defina a estratégia de negociação.'),
        user: `Produza a análise de M&A completa para este ativo:\n\n${intakeStr}`,
      }
    case 'contratos':
      return {
        system: msg('contratualista', 'Você é Clara Cláusula, Contracts Specialist da RR7x Capital Hub. Mapeie riscos jurídicos e recomende a documentação necessária.'),
        user: `Produza a análise contratual completa para este ativo:\n\n${intakeStr}`,
      }
    case 'originacao':
      return {
        system: msg('originador', 'Você é Victor Valor, Deal Originator da RR7x Capital Hub. Estruture o posicionamento comercial e o pipeline de compradores.'),
        user: `Produza a estratégia de venda e originação para este ativo:\n\n${intakeStr}`,
      }
    case 'estruturacao':
      return {
        system: msg('estruturador', 'Você é Estela Estrutura, Operation Structure Advisor da RR7x Capital Hub. Mapeie as operações financeiras e prescreva as melhores.'),
        user: `Produza a estruturação operacional completa para este ativo:\n\n${intakeStr}`,
      }
    case 'maturidade':
      return {
        system: msg('preparador', 'Você é Paulo Preparo, Deal Readiness Coach da RR7x Capital Hub. Emita o Veredicto de Maturidade definitivo e o plano de preparação.'),
        user: `Com base em todos os outputs dos especialistas abaixo, emita o Veredicto de Maturidade:\n\n${allOutputs}`,
      }
    case 'revisao':
      return {
        system: msg('revisor', 'Você é Rodrigo Relatório, Quality Reviewer da RR7x Capital Hub. Verifique coerência, completude e consistência entre todos os outputs.'),
        user: `Revise a coerência e qualidade de todos os outputs:\n\n${allOutputs}`,
      }
    case 'blind_teaser':
      return {
        system: msg('blind_teaser', 'Você é um especialista em comunicação de M&A da RR7x Capital Hub. Gere um Blind Teaser profissional sem revelar o nome do ativo.'),
        user: `Gere o Blind Teaser:\n\nDEAL INTAKE:\n${intakeStr}\n\nOUTPUTS:\n${allOutputs}`,
      }
    case 'sell_side_pitchbook':
      return {
        system: msg('sell_side_pitchbook', 'Você é um especialista em documentos de captação da RR7x Capital Hub. Gere um Sell-Side Pitchbook completo.'),
        user: `Gere o Sell-Side Pitchbook:\n\nDEAL INTAKE:\n${intakeStr}\n\nOUTPUTS:\n${allOutputs}`,
      }
    case 'relatorio_consolidado': {
      const allForReport = buildAllOutputsForReport(outputs)
      return {
        system: `Você é o Chief Intelligence Analyst da RR7x Capital Hub. Sua função é consolidar e sintetizar as análises dos especialistas em um único relatório estratégico executivo.

IMPORTANTE: Esta análise pode estar incompleta. Trabalhe com os dados disponíveis e indique claramente as lacunas quando relevante. Seu objetivo é sempre gerar inteligência acionável, mesmo com dados parciais. Nunca recuse gerar o relatório por falta de dados — adapte o nível de confiança da avaliação.` + HUMANIZER_DIRECTIVE,
        user: `Com base no deal intake e nas análises disponíveis abaixo, gere o Relatório Consolidado completo com EXATAMENTE estas 5 seções:

## 1. RESUMO EXECUTIVO GERAL
- Diagnóstico geral do ativo (2-3 parágrafos objetivos)
- Nível de maturidade da operação
- Principais pontos fortes identificados
- Principais riscos identificados
- **VEREDITO**: Apto para captação / Não apto / Precisa de ajustes (com justificativa clara e objetiva)

## 2. RESUMO POR AGENTE
Para cada agente com dados disponíveis, apresente em formato estruturado:
- O que foi analisado
- Principais insights
- Problemas identificados
- Recomendações práticas

(Se um agente não possui dados, indique brevemente e prossiga.)

## 3. ANÁLISE CRÍTICA CONSOLIDADA
- Cruzamento das análises dos agentes disponíveis
- Inconsistências ou contradições detectadas entre os relatórios
- Lacunas de informação que impedem avaliação completa
- Pontos críticos que travam uma captação ou M&A

## 4. PLANO DE AÇÃO SUGERIDO
### Itens Críticos (bloqueantes — resolver antes de qualquer coisa)
### Quick Wins (resolução em até 30 dias)
### Ajustes Estruturais (resolução em 60-180 dias)

## 5. SCORE GERAL DO ATIVO
- **Nota geral: X/10**
- Score por dimensão (X/10 cada):
  - Viabilidade de Mercado
  - Saúde Financeira
  - Risco Jurídico-Contratual
  - Maturidade para M&A/Captação
  - Posicionamento Comercial
- Critérios e premissas utilizados
- Recomendação final para o assessor/investidor

---
DEAL INTAKE:
${intakeStr}

---
ANÁLISES DISPONÍVEIS:
${allForReport}`,
      }
    }
    default:
      return null
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

    const { id } = await params
    const { step } = await req.json()

    const admin = createAdminClient()

    const { data: analise } = await admin.from('analises').select('*').eq('id', id).single()
    if (!analise) return NextResponse.json({ error: 'Análise não encontrada' }, { status: 404 })
    if (analise.user_id !== user.id && user.email !== ADMIN_EMAIL) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })
    }

    const intake = analise.deal_intake as Record<string, string>
    const outputs = (analise.outputs ?? {}) as Record<string, string>
    const prompts = await loadPrompts()
    const intakeStr = formatIntake(intake)
    const allOutputs = buildAllOutputs(outputs)

    let fullText = ''

    // drive_intake: lê arquivos reais do Supabase Storage e passa para Claude com content blocks
    if (step === 'drive_intake') {
      const summary = await readAnalyseDocs(id)
      const userContent = buildDocIntakeContent(summary, intakeStr)
      const systemPrompt = (prompts['doc_intake'] || `Você é o Agente de Ingestão de Dados da RR7x Capital Hub. Leia os documentos enviados e produza um diagnóstico documental detalhado: o que foi lido, o que cada documento revela sobre o ativo, lacunas identificadas e nível de confiança para a análise.

Seja completamente honesto: se um documento não pôde ser lido, diga claramente. Se foi lido, extraia e destaque as informações mais relevantes — números, datas, estrutura societária, indicadores financeiros, cláusulas contratuais relevantes, qualquer dado concreto disponível. O assessor precisa saber exatamente o que o sistema ingeriu para calibrar a análise.`) + HUMANIZER_DIRECTIVE

      const readable = new ReadableStream({
        start(controller) {
          const messageStream = anthropic.messages.stream({
            model: MODEL,
            max_tokens: 10000,
            system: systemPrompt,
            messages: [{ role: 'user', content: userContent as any }],
          })

          messageStream.on('text', (text) => {
            fullText += text
            controller.enqueue(new TextEncoder().encode(text))
          })

          messageStream.on('finalMessage', async () => {
            const newOutputs = { ...outputs, [step]: fullText }
            await admin.from('analises').update({
              outputs: newOutputs,
              atualizado_em: new Date().toISOString(),
            }).eq('id', id)
            controller.close()
          })

          messageStream.on('error', (err: Error) => {
            controller.error(err)
          })
        },
      })

      return new Response(readable, {
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          'Cache-Control': 'no-cache',
          'X-Accel-Buffering': 'no',
        },
      })
    }

    // Todos os outros steps
    const args = getStepArgs(step, prompts, intakeStr, allOutputs, outputs)
    if (!args) return NextResponse.json({ error: 'Step inválido' }, { status: 400 })

    const readable = new ReadableStream({
      start(controller) {
        const messageStream = anthropic.messages.stream({
          model: MODEL,
          max_tokens: 10000,
          system: args.system,
          messages: [{ role: 'user', content: args.user }],
        })

        messageStream.on('text', (text) => {
          fullText += text
          controller.enqueue(new TextEncoder().encode(text))
        })

        messageStream.on('finalMessage', async () => {
          const newOutputs = { ...outputs, [step]: fullText }
          await admin.from('analises').update({
            outputs: newOutputs,
            atualizado_em: new Date().toISOString(),
          }).eq('id', id)
          controller.close()
        })

        messageStream.on('error', (err: Error) => {
          controller.error(err)
        })
      },
    })

    return new Response(readable, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache',
        'X-Accel-Buffering': 'no',
      },
    })
  } catch (err: any) {
    console.error('[step error]', err)
    return NextResponse.json({ error: err?.message ?? 'Erro interno no agente' }, { status: 500 })
  }
}
