import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createAdminClient } from '@/lib/supabase-server'
import { anthropic, MODEL } from '@/lib/anthropic'
import { readAnalyseDocs, DocReadSummary } from '@/lib/doc-reader'
import { fetchBCBIndicators } from '@/lib/bcb-data'
import { fetchCapitalMarketsData, fetchListedComparables, extractSectorKeywords } from '@/lib/cvm-data'
import { checkCADE, formatCADEForPrompt } from '@/lib/cade-check'
import { getFacts, formatTruthLayer } from '@/lib/truth-layer'
import { listBenchmarks, formatBenchmarksForPrompt } from '@/lib/benchmarks'
import { parseClaims, persistClaims, CLAIMS_DIRECTIVE } from '@/lib/claims'

// Steps que recebem extended thinking para raciocínio financeiro mais profundo
const THINKING_STEPS = new Set(['diagnostico', 'analise_ma', 'estruturacao'])

// Steps que emitem claims estruturados (Fase 8). Excluímos:
// - drive_intake (upstream, produz fatos)
// - blind_teaser e sell_side_pitchbook (documentos derivados de marketing)
const CLAIM_AGENTS = new Set([
  'orchestration', 'pesquisa', 'diagnostico', 'analise_ma', 'kyc',
  'contratos', 'originacao', 'estruturacao', 'maturidade', 'relatorio_consolidado',
])

// Cross-Reading (Fase 9): mapa de dependências reais entre agentes.
// Para cada agente, lista outros agentes cujos outputs ele deveria ler.
// Resolve o gap G2 do caso PRPEVE: agentes não viam uns aos outros.
// O sharedContextBlock já inclui drive_intake + orchestration; este mapa
// estende para incluir outputs específicos do mesmo wave anterior.
const CROSS_READING_DEPS: Record<string, string[]> = {
  // Wave 2 (depois de pesquisa, diagnostico, kyc, contratos):
  analise_ma:    ['diagnostico', 'contratos', 'pesquisa'],   // M&A precisa dos números, contratos e contexto de mercado
  estruturacao:  ['diagnostico', 'pesquisa'],                // estruturação de crédito precisa números e contexto
  originacao:    ['pesquisa', 'diagnostico', 'contratos'],   // originação precisa contexto e números
  // maturidade lê todos via allOutputs (lógica existente)
}

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

async function saveAuditLog(
  admin: ReturnType<typeof createAdminClient>,
  params: {
    analiseId:     string
    stepKey:       string
    modelId:       string
    inputTokens:   number
    outputTokens:  number
    intakeSnapshot: Record<string, string>
    contextSteps:  string[]
    externalData:  Record<string, boolean>
    startedAt:     number
  }
): Promise<void> {
  try {
    await admin.from('deal_step_audit_logs').insert({
      analise_id:      params.analiseId,
      step_key:        params.stepKey,
      model_id:        params.modelId,
      input_tokens:    params.inputTokens,
      output_tokens:   params.outputTokens,
      intake_snapshot: params.intakeSnapshot,
      context_steps:   params.contextSteps,
      external_data:   params.externalData,
      duration_ms:     Date.now() - params.startedAt,
    })
  } catch (e) {
    console.error('[saveAuditLog]', e)
  }
}

async function saveOutputVersion(admin: ReturnType<typeof createAdminClient>, analiseId: string, stepKey: string, content: string): Promise<void> {
  try {
    const { data: existing } = await admin
      .from('deal_output_versions')
      .select('version_num')
      .eq('analise_id', analiseId)
      .eq('step_key', stepKey)
      .order('version_num', { ascending: false })
      .limit(1)
      .maybeSingle()
    const nextVersion = (existing?.version_num ?? 0) + 1
    await admin.from('deal_output_versions').insert({
      analise_id:  analiseId,
      step_key:    stepKey,
      version_num: nextVersion,
      content,
    })
  } catch (e) {
    console.error('[saveOutputVersion]', e)
  }
}

async function loadPrompts(): Promise<Record<string, string>> {
  try {
    const admin = createAdminClient()
    const { data } = await admin.from('agent_prompts').select('id, system_prompt')
    if (data) return Object.fromEntries(data.map(r => [r.id, r.system_prompt]))
  } catch {}
  return {}
}

async function loadEscritorio(userId: string): Promise<{ block: string; escritorioId: string | null }> {
  try {
    const admin = createAdminClient()

    // Resolve escritório: perfis.escritorio_id first, then owner fallback (admin case)
    const { data: perfil } = await admin
      .from('perfis')
      .select('escritorio_id')
      .eq('user_id', userId)
      .maybeSingle()

    let escritorioId: string | null = perfil?.escritorio_id ?? null

    if (!escritorioId) {
      const { data: owned } = await admin
        .from('escritorios')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle()
      escritorioId = owned?.id ?? null
    }

    if (!escritorioId) return { block: '', escritorioId: null }

    const { data } = await admin.from('escritorios').select('*').eq('id', escritorioId).single()
    if (!data || !data.nome) return { block: '', escritorioId }

    const lines = [
      `Nome: ${data.nome}`,
      data.cnpj          ? `CNPJ: ${data.cnpj}` : '',
      data.endereco      ? `Endereço: ${data.endereco}` : '',
      data.cidade_uf     ? `Cidade/UF: ${data.cidade_uf}` : '',
      data.telefone      ? `Telefone: ${data.telefone}` : '',
      data.email_contato ? `Email: ${data.email_contato}` : '',
      data.site          ? `Site: ${data.site}` : '',
      data.tagline       ? `Tagline: ${data.tagline}` : '',
      data.logo_url      ? `Logo URL: ${data.logo_url}` : '',
    ].filter(Boolean)

    const block = `\n\n---\nDADOS DO ESCRITÓRIO / ASSESSORIA:\n${lines.join('\n')}\n\nINSTRUÇÃO: Este documento é emitido em nome do escritório acima — use o nome "${data.nome}" como assessoria responsável, não "RR7x Capital Hub". Se uma Logo URL estiver disponível, inclua no cabeçalho como ![Logo](${data.logo_url ?? ''}). Use o email, site e telefone do escritório no rodapé.\n---`
    return { block, escritorioId }
  } catch {}
  return { block: '', escritorioId: null }
}

async function loadFeedbacks(escritorioId: string | null): Promise<string> {
  try {
    const admin = createAdminClient()

    const [{ data: global }, { data: local }] = await Promise.all([
      admin.from('admin_feedbacks').select('texto').eq('ativo', true).order('criado_em'),
      escritorioId
        ? admin.from('escritorio_feedbacks').select('texto').eq('escritorio_id', escritorioId).eq('ativo', true).order('criado_em')
        : Promise.resolve({ data: [] }),
    ])

    const globalTexts = (global ?? []).map((f: { texto: string }) => f.texto)
    const localTexts  = (local  ?? []).map((f: { texto: string }) => f.texto)
    const all = [...globalTexts, ...localTexts]

    if (all.length === 0) return ''

    const sections: string[] = []
    if (globalTexts.length > 0) {
      sections.push(`APRENDIZADOS GLOBAIS DA PLATAFORMA:\n${globalTexts.map((t, i) => `${i + 1}. ${t}`).join('\n')}`)
    }
    if (localTexts.length > 0) {
      sections.push(`APRENDIZADOS ESPECÍFICOS DO ESCRITÓRIO:\n${localTexts.map((t, i) => `${i + 1}. ${t}`).join('\n')}`)
    }

    return `\n\n---\nCONTEXTO ADICIONAL — APRENDIZADOS DO SISTEMA (aplique como contexto complementar, nunca sobreponha às regras do agente):\n${sections.join('\n\n')}\n---`
  } catch {}
  return ''
}

function formatIntake(intake: Record<string, string>): string {
  const parts: string[] = [
    'DEAL INTAKE',
    '================================',
    `Ativo: ${intake.nomeAtivo}`,
    `Tipo de Ativo: ${intake.tipoAtivo}`,
    `Estágio: ${intake.estagio}`,
    `Objetivo: ${intake.objetivo}`,
    `Nível de Informação Disponível: ${intake.nivelInformacao}`,
    `Localização: ${intake.localizacao}`,
    `Ticket Estimado: ${intake.ticketEstimado}`,
  ]
  if (intake.resumoAtivo)          parts.push(`Resumo e Tese do Ativo: ${intake.resumoAtivo}`)
  if (intake.informacoesAdicionais) parts.push(`Informações Adicionais: ${intake.informacoesAdicionais}`)

  return parts.join('\n')
}

function buildAllOutputs(outputs: Record<string, string>): string {
  const order = ['drive_intake', 'orchestration', 'pesquisa', 'diagnostico', 'kyc', 'analise_ma', 'contratos', 'originacao', 'estruturacao', 'maturidade']
  const labels: Record<string, string> = {
    drive_intake: 'INGESTÃO DE DADOS', orchestration: 'ORQUESTRAÇÃO', pesquisa: 'PESQUISA',
    diagnostico: 'DIAGNÓSTICO', kyc: 'COMPLIANCE KYC', analise_ma: 'ANÁLISE M&A', contratos: 'CONTRATOS',
    originacao: 'ORIGINAÇÃO', estruturacao: 'ESTRUTURAÇÃO', maturidade: 'MATURIDADE',
  }
  return order.filter(k => outputs[k]).map(k => `${labels[k]}:\n${outputs[k]}`).join('\n\n')
}

function buildAllOutputsForReport(outputs: Record<string, string>): string {
  const all = [
    { key: 'drive_intake',   label: 'INGESTÃO DE DADOS — Diagnóstico Documental' },
    { key: 'orchestration',  label: 'ORQUESTRAÇÃO — Mandor Orquestra (Deal Orchestrator)' },
    { key: 'pesquisa',       label: 'PESQUISA MERCADOLÓGICA — Pedro Panorama (Market Intelligence)' },
    { key: 'diagnostico',    label: 'DIAGNÓSTICO FINANCEIRO — Davi Diagnóstico (Financial Diagnostician)' },
    { key: 'kyc',            label: 'COMPLIANCE KYC — Carmen Compliance (KYC & Compliance Analyst)' },
    { key: 'analise_ma',     label: 'ANÁLISE DE M&A — Arthur Aquisição (M&A Architect)' },
    { key: 'contratos',      label: 'ANÁLISE CONTRATUAL — Clara Cláusula (Contracts Specialist)' },
    { key: 'originacao',     label: 'VENDA & ORIGINAÇÃO — Victor Valor (Deal Originator)' },
    { key: 'estruturacao',   label: 'ESTRUTURAÇÃO OPERACIONAL — Estela Estrutura (Operations Advisor)' },
    { key: 'maturidade',     label: 'VEREDICTO DE MATURIDADE — Paulo Preparo (Deal Readiness Coach)' },
    { key: 'revisao',        label: 'REVISÃO FINAL — Rodrigo Relatório (Quality Reviewer)' },
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

type CacheControl = { type: 'ephemeral'; ttl?: '5m' | '1h' }

type ContentBlock =
  | { type: 'text'; text: string; cache_control?: CacheControl }
  | { type: 'image'; source: { type: 'base64'; media_type: string; data: string } }
  | { type: 'document'; source: { type: 'base64'; media_type: string; data: string } }

type SystemBlock = { type: 'text'; text: string; cache_control?: CacheControl }

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

/**
 * Modo Fase 13: monta o input do drive_intake a partir do fact_bank consolidado
 * (resultado da ingestão assíncrona). Substitui a leitura bruta dos PDFs por um
 * resumo estruturado já processado, evitando que o drive_intake bata em long-context.
 */
function buildDriveIntakeFromFactBank(factBank: Record<string, unknown>, intakeStr: string): ContentBlock[] {
  const factsArr = Array.isArray((factBank as { facts?: unknown }).facts)
    ? (factBank as { facts: unknown[] }).facts
    : []

  const factsByType = new Map<string, unknown[]>()
  for (const f of factsArr) {
    const ft = (f as { fact_type?: string })?.fact_type ?? 'outros'
    const arr = factsByType.get(ft) ?? []
    arr.push(f)
    factsByType.set(ft, arr)
  }

  const factsSummary = Array.from(factsByType.entries())
    .map(([type, list]) => `### ${type} (${list.length})\n${JSON.stringify(list, null, 2)}`)
    .join('\n\n')

  const stats = (factBank as { stats?: unknown }).stats ?? {}

  return [{
    type: 'text',
    text: `Produza o Diagnóstico de Ingestão de Dados a partir do FACT_BANK consolidado pela ingestão assíncrona da Fase 13.

DEAL INTAKE:
${intakeStr}

---
FACT_BANK CONSOLIDADO:

Estatísticas: ${JSON.stringify(stats)}

${factsSummary}

---

Sua tarefa: produzir um diagnóstico narrativo do que os documentos do deal revelam, **usando exclusivamente o fact_bank acima**. Não invente fatos não listados. Cite documentos pelos source_doc dos fatos. Aponte lacunas e conflitos explicitamente (status: conflict).`,
  }]
}

function getStepArgs(step: string, prompts: Record<string, string>, intakeStr: string, allOutputs: string, outputs: Record<string, string> = {}, escritorioBlock = '', feedbackBlock = '', bcbData = '', cvmCapital = '', cvmComps = '', intake: Record<string, string> = {}, truthLayerBlock = '', benchmarksBlock = ''): { system: SystemBlock[]; user: string | ContentBlock[] } | null {
  // HUMANIZER_DIRECTIVE como primeiro bloco de sistema: prefixo estável compartilhado por
  // TODOS os agentes e TODAS as análises → máximo de cache hit na API Anthropic.
  // Cada análise paga o custo de leitura do HUMANIZER_DIRECTIVE apenas na primeira chamada;
  // as demais (paralelas ou de outros usuários) lêem do cache.
  const humanizerBlock: SystemBlock = { type: 'text', text: HUMANIZER_DIRECTIVE, cache_control: { type: 'ephemeral', ttl: '1h' } }

  // Truth Layer (Fase 6): bloco de fatos consolidados, cacheado por análise.
  // Vai ANTES do prompt específico para que o agente leia primeiro o que é fato
  // antes das instruções de execução. Só é incluído se houver conteúdo (drive_intake
  // não recebe truth layer, já que é a fonte dos fatos).
  const truthBlock: SystemBlock | null = truthLayerBlock
    ? { type: 'text', text: truthLayerBlock, cache_control: { type: 'ephemeral', ttl: '1h' } }
    : null

  // Benchmark Registry (Fase 7): parâmetros de mercado para validação quantitativa.
  // Cacheado globalmente (mesmos benchmarks pra todas análises) → cache hit alto.
  const benchmarksBlk: SystemBlock | null = benchmarksBlock
    ? { type: 'text', text: benchmarksBlock, cache_control: { type: 'ephemeral', ttl: '1h' } }
    : null

  // CLAIMS_DIRECTIVE (Fase 8): instrução para o agente emitir claims estruturados
  // ao final do output (bloco invisível parseado pelo sistema).
  // Cacheado globalmente — diretiva idêntica para todos os agentes analíticos.
  const claimsBlock: SystemBlock | null = CLAIM_AGENTS.has(step)
    ? { type: 'text', text: CLAIMS_DIRECTIVE, cache_control: { type: 'ephemeral', ttl: '1h' } }
    : null

  // Ordem: humanizer → benchmarks → claims directive → truth (por análise) → prompt do agente
  function sysBlocks(agentPrompt: string): SystemBlock[] {
    const blocks: SystemBlock[] = [humanizerBlock]
    if (benchmarksBlk) blocks.push(benchmarksBlk)
    if (claimsBlock)   blocks.push(claimsBlock)
    if (truthBlock)    blocks.push(truthBlock)
    blocks.push({ type: 'text', text: agentPrompt + feedbackBlock, cache_control: { type: 'ephemeral', ttl: '1h' } })
    return blocks
  }

  // Contexto compartilhado base: ingestão + orquestração (cacheado globalmente).
  const docsContextText = [
    outputs['drive_intake']  ? `INGESTÃO DE DOCUMENTOS (o que foi lido e extraído dos arquivos enviados):\n${outputs['drive_intake']}` : '',
    outputs['orchestration'] ? `ORQUESTRAÇÃO / DRS:\n${outputs['orchestration']}` : '',
  ].filter(Boolean).join('\n\n---\n\n')

  const sharedContextBlock: ContentBlock | null = docsContextText
    ? { type: 'text', text: `DEAL INTAKE:\n${intakeStr}\n\n---\n\n${docsContextText}`, cache_control: { type: 'ephemeral', ttl: '1h' } }
    : null

  // Cross-Reading (Fase 9): bloco extra com outputs de agentes upstream específicos
  // do mesmo wave. NÃO é cacheado (varia por step) mas o conteúdo é determinado.
  const crossDeps = CROSS_READING_DEPS[step] ?? []
  const crossReadingText = crossDeps
    .filter(k => outputs[k])
    .map(k => `## OUTPUT DO AGENTE ${k.toUpperCase()} (use como contexto):\n${outputs[k]}`)
    .join('\n\n---\n\n')
  const crossReadingBlock: ContentBlock | null = crossReadingText
    ? { type: 'text', text: crossReadingText }
    : null

  // Para agentes paralelos: user content = [bloco cacheado compartilhado, cross-reading (se houver), instrução específica]
  function parallelUser(instruction: string): ContentBlock[] {
    const blocks: ContentBlock[] = []
    if (sharedContextBlock) blocks.push(sharedContextBlock)
    if (crossReadingBlock)  blocks.push(crossReadingBlock)
    blocks.push({ type: 'text', text: instruction })
    return blocks.length > 1
      ? blocks
      : [{ type: 'text', text: `${instruction}\n\nDEAL INTAKE:\n${intakeStr}` }]
  }

  // Para documentos de captação (blind_teaser + sell_side_pitchbook): bloco cacheado compartilhado
  // Os dois rodam em Promise.all — o mesmo prefixo é cacheado e lido pelos dois sem custo duplo.
  const sharedCaptacaoBlock: ContentBlock | null = allOutputs
    ? { type: 'text', text: `DEAL INTAKE:\n${intakeStr}\n\n---\n\nANÁLISES DOS ESPECIALISTAS:\n${allOutputs}`, cache_control: { type: 'ephemeral', ttl: '1h' } }
    : null

  function captacaoUser(instruction: string): ContentBlock[] {
    if (sharedCaptacaoBlock) {
      return [sharedCaptacaoBlock, { type: 'text', text: instruction + escritorioBlock }]
    }
    return [{ type: 'text', text: `${instruction}\n\nDEAL INTAKE:\n${intakeStr}${escritorioBlock}` }]
  }

  switch (step) {
    case 'orchestration':
      return {
        system: sysBlocks(prompts['orquestrador'] || 'Você é Mandor Orquestra, Deal Orchestrator da RR7x Capital Hub. Calcule o DRS, mapeie riscos e defina o próximo passo estratégico.'),
        user: outputs['drive_intake']
          ? `Analise este deal intake e produza o diagnóstico completo:\n\n${intakeStr}\n\n---\nINGESTÃO DE DOCUMENTOS:\n${outputs['drive_intake']}`
          : `Analise este deal intake e produza o diagnóstico completo:\n\n${intakeStr}`,
      }
    case 'pesquisa':
      return {
        system: sysBlocks(prompts['pesquisador'] || 'Você é Pedro Panorama, Market Intelligence Analyst da RR7x Capital Hub. Produza inteligência de mercado rigorosa: mapeamento setorial, benchmarks, múltiplos de transação e posição de mercado para a operação proposta. Não emita veredicto de aptidão sobre o deal — isso cabe ao Orchestrator (DRS) e ao Deal Readiness Coach (Maturidade). Sua função é dados externos e contexto setorial.'),
        user: parallelUser(`Produza a pesquisa mercadológica completa para este ativo.${bcbData}${cvmComps}`),
      }
    case 'kyc': {
      const cadeCheck   = checkCADE(intake)
      const cadeContext = formatCADEForPrompt(cadeCheck)
      return {
        system: sysBlocks(prompts['kyc'] || 'Você é Carmen Compliance, KYC & Compliance Analyst da RR7x Capital Hub. Realize o screening de conformidade, KYC e red flags regulatórios do deal.'),
        user: parallelUser(`Realize o screening de compliance e KYC completo para este deal.${cadeContext}`),
      }
    }
    case 'diagnostico':
      return {
        system: sysBlocks(prompts['diagnosticador'] || 'Você é Davi Diagnóstico, Financial Diagnostician da RR7x Capital Hub. Diagnostique a saúde financeira e recomende a estrutura de operação.'),
        user: parallelUser('Produza o diagnóstico financeiro completo para este ativo.'),
      }
    case 'analise_ma':
      return {
        system: sysBlocks(prompts['arquiteto_ma'] || 'Você é Arthur Aquisição, M&A Architect da RR7x Capital Hub. Construa o valuation, articule a tese e defina a estratégia de negociação.'),
        user: parallelUser('Produza a análise de M&A completa para este ativo.'),
      }
    case 'contratos':
      return {
        system: sysBlocks(prompts['contratualista'] || 'Você é Clara Cláusula, Contracts Specialist da RR7x Capital Hub. Mapeie riscos jurídicos e recomende a documentação necessária.'),
        user: parallelUser('Produza a análise contratual completa para este ativo.'),
      }
    case 'originacao':
      return {
        system: sysBlocks(prompts['originador'] || 'Você é Victor Valor, Deal Originator da RR7x Capital Hub. Estruture o posicionamento comercial, o perfil de compradores-alvo e o pipeline de originação. Sua entrega é estratégia e inteligência comercial — os documentos finais (Blind Teaser, Pitchbook) são produzidos por agentes dedicados que usam seu output como insumo.'),
        user: parallelUser('Produza a estratégia de venda e originação para este ativo.'),
      }
    case 'estruturacao':
      return {
        system: sysBlocks(prompts['estruturador'] || 'Você é Estela Estrutura, Operation Structure Advisor da RR7x Capital Hub. Mapeie as operações financeiras e prescreva as melhores.'),
        user: parallelUser(`Produza a estruturação operacional completa para este ativo.${bcbData}${cvmCapital}`),
      }
    case 'maturidade':
      return {
        system: sysBlocks(prompts['preparador'] || 'Você é Paulo Preparo, Deal Readiness Coach da RR7x Capital Hub. Emita o Veredicto de Maturidade definitivo e o plano de preparação.'),
        user: `Com base em todos os outputs dos especialistas abaixo, emita o Veredicto de Maturidade:\n\n${allOutputs}`,
      }
    case 'revisao':
      return {
        system: sysBlocks(prompts['revisor'] || 'Você é Rodrigo Relatório, Quality Reviewer da RR7x Capital Hub. Verifique coerência, completude e consistência entre todos os outputs.'),
        user: `Revise a coerência e qualidade de todos os outputs:\n\n${allOutputs}`,
      }
    case 'blind_teaser':
      return {
        system: sysBlocks(prompts['blind_teaser'] || `Você é um especialista em comunicação de M&A da RR7x Capital Hub. Produza um Blind Teaser profissional de 1-2 páginas sem revelar nome, CNPJ ou qualquer dado identificador do ativo.

ESTRUTURA DO BLIND TEASER:
- Cabeçalho com logo e dados do escritório emissor
- Headline: proposta de valor do deal em 1 frase
- Visão geral do ativo (setor, localização, porte — sem identificar)
- Principais métricas financeiras (ticket, EBITDA, receita — anonimizados)
- Tese de investimento: por que este ativo é atrativo
- Perfil do comprador / investidor ideal
- Próximos passos e contato do escritório
- Rodapé com dados de contato do escritório

IDENTIDADE DO DOCUMENTO:
- Use o nome do escritório (campo DADOS DO ESCRITÓRIO) como emissor — nunca "RR7x Capital Hub"
- Se Logo URL disponível, inclua: ![Logo](url) no topo
- Se não houver dados de escritório: use "Assessoria Confidencial"
- Email, telefone e site do escritório no rodapé

TOM: documento profissional de mercado financeiro — objetivo, direto, sem linguagem de marketing barata.`),
        user: captacaoUser('Gere o Blind Teaser completo baseado nas análises acima.'),
      }
    case 'sell_side_pitchbook':
      return {
        system: sysBlocks(prompts['sell_side_pitchbook'] || `Você é um especialista em documentos de captação da RR7x Capital Hub. Produza um Sell-Side Pitchbook completo, detalhado e profissional.

ESTRUTURA DO SELL-SIDE PITCHBOOK:
1. Capa com logo e dados do escritório
2. Sumário executivo do deal
3. Descrição completa do ativo (setor, modelo de negócio, histórico)
4. Análise financeira: receitas, EBITDA, margens, valuation range
5. Tese de M&A: por que comprar/investir neste ativo agora
6. Análise de mercado e posicionamento competitivo
7. Estrutura da transação proposta e condições
8. Perfil de compradores / investidores ideais
9. Riscos e mitigações
10. Timeline da operação e próximos passos
11. Apêndices com dados de suporte

IDENTIDADE DO DOCUMENTO:
- Use o nome do escritório (campo DADOS DO ESCRITÓRIO) como emissor — nunca "RR7x Capital Hub"
- Se Logo URL disponível, inclua: ![Logo](url) no topo
- Se não houver dados de escritório: use "Assessoria Confidencial"
- Email, telefone e site do escritório no rodapé de cada seção

TOM: documento de alto nível para sofisticados — fundos de PE, family offices, estratégicos. Direto, com dados factuais, sem exageros comerciais.`),
        user: captacaoUser('Gere o Sell-Side Pitchbook completo baseado nas análises acima.'),
      }
    case 'relatorio_consolidado': {
      const allForReport = buildAllOutputsForReport(outputs)
      const defaultRelatorioSystem = `Você é o Chief Intelligence Analyst da RR7x Capital Hub. Sua função é produzir o relatório estratégico executivo que integra e cross-referencia todas as análises especializadas do squad em um documento único, acionável e sem redundâncias.

Este relatório é o documento que o assessor usa para tomar decisões e apresentar ao cliente ou investidor. Cada seção deve conter inteligência nova — síntese cross-dimensional, contradições identificadas, priorização executiva — não reproduzir o que os especialistas já escreveram.

PRINCÍPIO CENTRAL: Se você está apenas resumindo o que Pedro ou Arthur já escreveu, está desperdiçando espaço e degradando a qualidade do relatório. Produza síntese, não sumarização.

Esta análise pode estar incompleta. Trabalhe com os dados disponíveis e indique lacunas quando relevante. Nunca recuse gerar o relatório por falta de dados — adapte o nível de confiança da avaliação.`

      return {
        system: sysBlocks(prompts['relatorio_consolidado'] || defaultRelatorioSystem),
        user: `Produza o Relatório Consolidado Estratégico com EXATAMENTE estas 5 seções:

## 1. DIAGNÓSTICO EXECUTIVO

ANTES de escrever, faça internamente uma auditoria de consistência:
- Quais dados dos agentes se contradizem ou são incompatíveis?
- Quais lacunas críticas impedem avaliação completa?
- O que os documentos revelam que diverge do deal intake declarado?
Incorpore esses achados aqui e na Seção 3.

Escreva:
- Caracterização objetiva do ativo e da operação proposta (1 parágrafo factual — sem floreio)
- Síntese cross-dimensional: como os achados financeiros, mercadológicos, jurídicos e estratégicos se conectam e se afetam mutuamente — não liste agentes, cruze dimensões
- Veredicto de Maturidade: extraia e cite o veredicto exato do Paulo Preparo (se disponível) com a justificativa central — não o recalcule
- Os 3-4 fatores determinantes para o sucesso ou fracasso desta operação específica

## 2. DIAGNÓSTICO POR DIMENSÃO

Para cada dimensão: 3-5 bullets com dado concreto + implicação direta para a operação.
NÃO resuma o relatório do agente — extraia os achados que o assessor precisa saber para decidir.
Formato: [dado ou achado] → [implicação para a operação]

**Dimensão financeira** (Davi Diagnóstico + Ingestão de Dados)
**Dimensão mercadológica** (Pedro Panorama)
**Dimensão jurídico-contratual** (Clara Cláusula)
**Dimensão estratégica** (Arthur Aquisição + Estela Estrutura)
**Dimensão comercial** (Victor Valor)

Se uma dimensão não tem dados disponíveis: declare "Sem dados disponíveis — risco de avaliação incompleta nesta dimensão."

## 3. ANÁLISE CRÍTICA CROSS-DIMENSIONAL

Produza APENAS achados que não existem em nenhum relatório individual — apenas o que emerge do cruzamento:
- Contradições entre agentes (cite os agentes conflitantes e o dado específico)
- Dados que se invalidam mutuamente
- Lacunas que nenhum agente cobriu mas que impactam materialmente a operação
- Riscos ocultos que só aparecem na intersecção das análises
- Inconsistências entre o deal intake declarado e o que os documentos/análises revelam

Se não há contradições materiais: declare explicitamente. Não invente conflitos.

## 4. PRIORIZAÇÃO EXECUTIVA

Com base no Veredicto de Maturidade (Paulo Preparo) e nos achados das seções anteriores:

**Bloqueantes imediatos** (o que impede a operação de avançar hoje):
Para cada item: O que é | Por que bloqueia | Quem resolve | Prazo realista

**Complementos ao roadmap do Paulo** (gaps que o Paulo não mapeou, visão cross-agente):
Liste apenas se existirem. NÃO repita o que Paulo já mapeou.

**Alerta de risco oculto** (máx. 2):
Riscos que emergem somente da visão cruzada — que nenhum agente identificou isoladamente.

## 5. DIAGNÓSTICO DE RISCO EXECUTIVO

NÃO recalcule score. O DRS já foi calculado pelo Orchestrator (Mandor Orquestra).

**Deal Readiness Score (DRS):** extraia o valor exato do relatório de Orquestração. Se não disponível: declare ausência.

**Riscos executivos materiais** (4-5 riscos, formato tabular):
| Risco | Probabilidade | Impacto na operação | Mitigação disponível |

**Recomendação final ao assessor** (2-3 frases diretas, sem platitude):
Qual a ação concreta da próxima semana para avançar este deal ou decidir não avançar.

---
DEAL INTAKE:
${intakeStr}

---
ANÁLISES DISPONÍVEIS:
${allForReport}${escritorioBlock}`,
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
    const { step, regeneracao_id } = await req.json() as { step: string; regeneracao_id?: string }

    const admin = createAdminClient()

    const { data: analise } = await admin.from('analises').select('*').eq('id', id).single()
    if (!analise) return NextResponse.json({ error: 'Análise não encontrada' }, { status: 404 })
    if (analise.user_id !== user.id && user.email !== ADMIN_EMAIL) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })
    }

    const intake = analise.deal_intake as Record<string, string>
    const outputs = (analise.outputs ?? {}) as Record<string, string>
    const sectorKeywords = extractSectorKeywords(
      intake.tipoAtivo ?? '',
      intake.resumoAtivo ?? ''
    )

    // Agentes que se beneficiam de benchmarks de mercado (decidem viabilidade
    // de produto financeiro ou múltiplos de M&A). Truncar nos outros evita
    // poluir o prompt sem necessidade.
    const stepUsaBenchmarks = ['estruturacao', 'analise_ma', 'pesquisa', 'originacao', 'maturidade'].includes(step)

    // Carrega escritório antes do paralelo — usado tanto para escritorioBlock
    // quanto para listar benchmarks com merge de overrides do escritório (Fase 12)
    const escritorioData = await loadEscritorio(analise.user_id)
    const escritorioIdParaBenchmarks = escritorioData.escritorioId ?? undefined

    const [prompts, bcbData, cvmCapital, cvmComps, factsData, benchmarksData] = await Promise.all([
      loadPrompts(),
      (step === 'pesquisa' || step === 'estruturacao') ? fetchBCBIndicators() : Promise.resolve(''),
      step === 'estruturacao' ? fetchCapitalMarketsData(sectorKeywords)  : Promise.resolve(''),
      step === 'pesquisa'     ? fetchListedComparables(sectorKeywords)   : Promise.resolve(''),
      getFacts(id),
      stepUsaBenchmarks ? listBenchmarks({ escritorio_id: escritorioIdParaBenchmarks }) : Promise.resolve([]),
    ])
    const escritorioBlock = escritorioData.block
    const feedbackBlock   = await loadFeedbacks(escritorioData.escritorioId)
    const intakeStr    = formatIntake(intake)
    const allOutputs   = buildAllOutputs(outputs)
    // Truth Layer: bloco de fatos consolidados que será injetado no system prompt
    // de TODOS os agentes (exceto drive_intake, que é a fonte original dos fatos).
    const truthLayerBlock = step === 'drive_intake' ? '' : formatTruthLayer(factsData)
    // Benchmark Registry (Fase 7): parâmetros de mercado para validação
    // quantitativa pelos agentes que recomendam produtos/estruturas.
    const benchmarksBlock = stepUsaBenchmarks ? formatBenchmarksForPrompt(benchmarksData) : ''

    const stepStartedAt  = Date.now()
    const contextSteps   = Object.keys(outputs).filter((k) => outputs[k])
    const externalData   = { bcb: !!bcbData, cvmCapital: !!cvmCapital, cvmComps: !!cvmComps }

    let fullText = ''

    // drive_intake: dois modos
    //   - Novo (Fase 13): se já existe fact_bank consolidado, monta o input a partir
    //     dele (compacto, ~30k tokens). Sem custo de re-ler PDFs gigantes.
    //   - Legado: lê arquivos reais do Supabase Storage e passa pra Claude com content blocks.
    // Trocar via flag `analise.fact_bank_consolidated_at IS NOT NULL`.
    if (step === 'drive_intake') {
      const factBank = (analise as { fact_bank?: unknown }).fact_bank
      const useFactBank = !!factBank && !!(analise as { fact_bank_consolidated_at?: string }).fact_bank_consolidated_at

      const userContent: ContentBlock[] = useFactBank
        ? buildDriveIntakeFromFactBank(factBank as Record<string, unknown>, intakeStr)
        : buildDocIntakeContent(await readAnalyseDocs(analise.user_id, id), intakeStr)
      const docIntakeSystem: SystemBlock[] = [
        { type: 'text', text: HUMANIZER_DIRECTIVE, cache_control: { type: 'ephemeral', ttl: '1h' } },
        {
          type: 'text',
          text: (prompts['doc_intake'] || `Você é o Agente de Ingestão de Dados da RR7x Capital Hub. Leia os documentos enviados e produza um diagnóstico documental detalhado: o que foi lido, o que cada documento revela sobre o ativo, lacunas identificadas e nível de confiança para a análise.

Seja completamente honesto: se um documento não pôde ser lido, diga claramente. Se foi lido, extraia e destaque as informações mais relevantes — números, datas, estrutura societária, indicadores financeiros, cláusulas contratuais relevantes, qualquer dado concreto disponível. O assessor precisa saber exatamente o que o sistema ingeriu para calibrar a análise.`) + feedbackBlock,
          cache_control: { type: 'ephemeral', ttl: '1h' },
        },
      ]

      const readable = new ReadableStream({
        start(controller) {
          const messageStream = anthropic.messages.stream({
            model: MODEL,
            max_tokens: 10000,
            system: docIntakeSystem as any,
            messages: [{ role: 'user', content: userContent as any }],
          })

          messageStream.on('text', (text) => {
            fullText += text
            controller.enqueue(new TextEncoder().encode(text))
          })

          messageStream.on('finalMessage', (msg) => {
            void (async () => {
              const { data: latest } = await admin.from('analises').select('outputs').eq('id', id).single()
              const latestOutputs = (latest?.outputs ?? outputs) as Record<string, string>
              await Promise.all([
                admin.from('analises').update({
                  outputs: { ...latestOutputs, [step]: fullText },
                  atualizado_em: new Date().toISOString(),
                }).eq('id', id),
                saveOutputVersion(admin, id, step, fullText),
                saveAuditLog(admin, {
                  analiseId:      id,
                  stepKey:        step,
                  modelId:        MODEL,
                  inputTokens:    msg.usage?.input_tokens  ?? 0,
                  outputTokens:   msg.usage?.output_tokens ?? 0,
                  intakeSnapshot: intake,
                  contextSteps,
                  externalData,
                  startedAt:      stepStartedAt,
                }),
              ])
              controller.close()
            })().catch(() => controller.close())
          })

          messageStream.on('error', (err: Error) => {
            try {
              controller.enqueue(new TextEncoder().encode(`\x00ERROR:${err.message}`))
              controller.close()
            } catch { /* stream já fechado */ }
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
    const args = getStepArgs(step, prompts, intakeStr, allOutputs, outputs, escritorioBlock, feedbackBlock, bcbData, cvmCapital, cvmComps, intake, truthLayerBlock, benchmarksBlock)
    if (!args) return NextResponse.json({ error: 'Step inválido' }, { status: 400 })

    // Se houver regeneração executada para este step, injeta o briefing do
    // assessor como prefixo no user content. O Revisor já aprovou ou o
    // assessor decidiu prosseguir apesar do contra-argumento.
    if (regeneracao_id) {
      const { data: regen } = await admin
        .from('regeneracoes')
        .select('briefing_o_que, briefing_motivo, executada, step_key, analise_id')
        .eq('id', regeneracao_id)
        .maybeSingle()

      if (regen && regen.executada && regen.analise_id === id && regen.step_key === step) {
        const briefingHeader =
`# DIRETRIZ DE REGENERAÇÃO (BRIEFING DO ASSESSOR)

O assessor responsável solicitou a regeneração deste step com o seguinte briefing. Considere essas diretrizes ao produzir o novo output, mantendo o rigor técnico habitual da análise.

**O que ele quer alterar:**
${regen.briefing_o_que}

**Motivo:**
${regen.briefing_motivo}

---

# INSTRUÇÕES ORIGINAIS DO STEP

`
        if (typeof args.user === 'string') {
          args.user = briefingHeader + args.user
        } else if (Array.isArray(args.user)) {
          args.user = [
            { type: 'text', text: briefingHeader },
            ...args.user,
          ] as typeof args.user
        }
      }
    }

    const useThinking = THINKING_STEPS.has(step)

    const readable = new ReadableStream({
      start(controller) {
        const streamParams: any = {
          model:      MODEL,
          max_tokens: useThinking ? 16000 : 10000,
          system:     args.system as any,
          messages:   [{ role: 'user', content: args.user as any }],
        }
        if (useThinking) {
          streamParams.thinking = { type: 'enabled', budget_tokens: 8000 }
        }
        const messageStream = anthropic.messages.stream(streamParams)

        messageStream.on('text', (text) => {
          fullText += text
          controller.enqueue(new TextEncoder().encode(text))
        })

        messageStream.on('finalMessage', (msg) => {
          void (async () => {
            // Fase 8: extrai bloco <!--CLAIMS-START-->...<!--CLAIMS-END--> do output
            // antes de persistir o texto narrativo. Claims vão para tabela própria.
            const { claims, cleanedText } = CLAIM_AGENTS.has(step)
              ? parseClaims(fullText)
              : { claims: [], cleanedText: fullText }

            const textForStorage = cleanedText

            const { data: latest } = await admin.from('analises').select('outputs').eq('id', id).single()
            const latestOutputs = (latest?.outputs ?? outputs) as Record<string, string>
            await Promise.all([
              admin.from('analises').update({
                outputs: { ...latestOutputs, [step]: textForStorage },
                atualizado_em: new Date().toISOString(),
              }).eq('id', id),
              saveOutputVersion(admin, id, step, textForStorage),
              saveAuditLog(admin, {
                analiseId:      id,
                stepKey:        step,
                modelId:        MODEL,
                inputTokens:    msg.usage?.input_tokens  ?? 0,
                outputTokens:   msg.usage?.output_tokens ?? 0,
                intakeSnapshot: intake,
                contextSteps,
                externalData,
                startedAt:      stepStartedAt,
              }),
              // Persiste claims em tabela própria (apaga as anteriores deste step antes)
              claims.length > 0 ? persistClaims(id, step, claims) : Promise.resolve(),
            ])
            controller.close()
          })().catch(() => controller.close())
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
