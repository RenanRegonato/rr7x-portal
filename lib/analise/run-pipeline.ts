import { createAdminClient } from '@/lib/supabase-server'
import { INTERNAL_PIPELINE_TOKEN_HEADER } from '@/lib/internal-auth'
import { sendCompletionEmail } from '@/lib/email'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Step = any
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Logger = any

interface RunPipelineParams {
  analiseId: string
  step:      Step
  logger:    Logger
}

// ─── objetivo conditionals (copiados de page.tsx — devem ficar idênticos) ──────
const MA_OBJECTIVES        = ['Vender 100%', 'Vender participação', 'Captar investimento']
const ESTRUTURA_OBJECTIVES = ['Estruturar crédito']

function isMAActive(objetivo?: string)        { return MA_OBJECTIVES.some((o)        => (objetivo ?? '').includes(o)) }
function isEstruturaActive(objetivo?: string) { return ESTRUTURA_OBJECTIVES.some((o) => (objetivo ?? '').includes(o)) }

function baseUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL ?? 'https://www.mandor.com.br'
}

function internalHeaders(extra?: Record<string, string>): Record<string, string> {
  const token = process.env.INTERNAL_PIPELINE_TOKEN ?? ''
  return {
    [INTERNAL_PIPELINE_TOKEN_HEADER]: token,
    ...(extra ?? {}),
  }
}

// Lê os outputs atuais da análise — usado pra resume (pular agentes já prontos).
async function readOutputs(admin: ReturnType<typeof createAdminClient>, analiseId: string): Promise<Record<string, string>> {
  const { data } = await admin
    .from('analises')
    .select('outputs')
    .eq('id', analiseId)
    .single()
  return (data?.outputs ?? {}) as Record<string, string>
}

// Roda um agente via POST /api/analise/[id]/step. A rota salva o output sozinha
// (server-side); só precisamos consumir o stream até o fim e checar res.ok.
async function runStepAgent(analiseId: string, stepKey: string): Promise<void> {
  const res = await fetch(`${baseUrl()}/api/analise/${analiseId}/step`, {
    method:  'POST',
    headers: internalHeaders({ 'Content-Type': 'application/json' }),
    body:    JSON.stringify({ step: stepKey }),
  })

  if (!res.ok) {
    const detail = await res.text().catch(() => '')
    throw new Error(`step ${stepKey} falhou: HTTP ${res.status} ${detail.slice(0, 300)}`)
  }

  // Consome o stream até o fim. A rota grava o output em analises.outputs[step]
  // no finalMessage — não precisamos parsear o texto. Mas detectamos o marcador
  // de erro que a rota injeta no stream (\x00ERROR:).
  if (res.body) {
    const reader  = res.body.getReader()
    const decoder = new TextDecoder()
    let buf = ''
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      buf += decoder.decode(value, { stream: true })
      if (buf.includes('\x00ERROR:')) {
        const msg = buf.split('\x00ERROR:')[1] ?? 'erro interno no agente'
        throw new Error(`step ${stepKey} erro no stream: ${msg.trim().slice(0, 300)}`)
      }
    }
  }
}

// Endpoints de checagem (consistency / risk / coverage / mesa / fact-extract):
// POST simples com token interno. Best-effort no browser (não falhava o pipeline),
// mas aqui propagamos erro pra que o Inngest possa retentar.
async function runCheckEndpoint(analiseId: string, path: string): Promise<void> {
  // BEST-EFFORT: validadores (consistency/risk/coverage/mesa/fact-extract) NÃO
  // podem derrubar o pipeline. No navegador eles falhavam em silêncio e a análise
  // seguia até o relatório. Um 429 transitório do Claude numa dessas chamadas não
  // pode impedir a geração do relatório consolidado. Loga e prossegue.
  try {
    const res = await fetch(`${baseUrl()}/api/analise/${analiseId}/${path}`, {
      method:  'POST',
      headers: internalHeaders(),
    })
    if (!res.ok) {
      const detail = await res.text().catch(() => '')
      console.warn(`[pipeline] ${path} HTTP ${res.status} (best-effort, prossegue): ${detail.slice(0, 200)}`)
    }
  } catch (e) {
    console.warn(`[pipeline] ${path} falhou (best-effort, prossegue): ${(e as Error).message}`)
  }
}

/**
 * Orquestra o pipeline multi-agente 100% server-side (via Inngest).
 *
 * Replica EXATAMENTE a sequência do antigo runPipeline() do navegador
 * (app/dashboard/(main)/analise/[id]/page.tsx), porém cada agente é envolvido
 * num step.run() do Inngest pra durabilidade/retry, e o estado é lido do banco
 * (não do estado React). Resume: relê analises.outputs antes de cada agente e
 * pula os que já têm output (espelha o maybeRun).
 */
export async function runAnalysisPipeline({ analiseId, step, logger }: RunPipelineParams) {
  const admin = createAdminClient()

  // Carrega a análise (objetivo decide quais agentes condicionais rodam).
  const analise = await step.run('load-analise', async () => {
    const { data, error } = await admin
      .from('analises')
      .select('id, user_id, status, deal_intake, outputs')
      .eq('id', analiseId)
      .single()
    if (error || !data) throw new Error(`load-analise: ${error?.message ?? 'não encontrada'}`)
    return data
  }) as { id: string; user_id: string; status: string; deal_intake: Record<string, string> | null; outputs: Record<string, string> | null }

  const objetivo     = (analise.deal_intake ?? {}).objetivo
  const runMA        = isMAActive(objetivo)
  const runEstrutura = isEstruturaActive(objetivo)

  logger.info('Pipeline start', { analiseId, runMA, runEstrutura })

  // Marca processando logo no início.
  await step.run('set-processando', async () => {
    await admin
      .from('analises')
      .update({ status: 'processando', atualizado_em: new Date().toISOString() })
      .eq('id', analiseId)
    return { ok: true }
  })

  // Roda um agente, pulando se o output já existe (resume). Cada chamada relê o
  // banco pra ter o estado atual (steps anteriores deste run já gravaram).
  async function maybeRunAgent(stepKey: string): Promise<void> {
    await step.run(`agent-${stepKey}`, async () => {
      const current = await readOutputs(admin, analiseId)
      if (current[stepKey]) {
        logger.info('Pulando agente (output já existe)', { analiseId, stepKey })
        return { skipped: true, stepKey }
      }
      await runStepAgent(analiseId, stepKey)
      return { skipped: false, stepKey }
    })
  }

  try {
    // ── Sequência idêntica ao runPipeline do navegador ──────────────────────
    await maybeRunAgent('drive_intake')

    // Truth Layer: extrai fatos a partir do drive_intake. Idempotente
    // (a rota retorna 200 sem reexecutar se já foi extraído).
    await step.run('fact-extract', async () => {
      await runCheckEndpoint(analiseId, 'fact-extract')
      return { ok: true }
    })

    await maybeRunAgent('orchestration')

    // Wave 1 (sequencial)
    await maybeRunAgent('pesquisa')
    await maybeRunAgent('diagnostico')
    await maybeRunAgent('kyc')
    await maybeRunAgent('contratos')

    // Wave 2 (sequencial, lê outputs da Wave 1)
    if (runMA)        await maybeRunAgent('analise_ma')
    if (runEstrutura) await maybeRunAgent('estruturacao')
    await maybeRunAgent('originacao')

    await maybeRunAgent('maturidade')

    // Checagens (idempotentes — sempre rodam ao final do pipeline).
    await step.run('consistency-check', async () => {
      await runCheckEndpoint(analiseId, 'consistency-check')
      return { ok: true }
    })
    await step.run('risk-correlation', async () => {
      await runCheckEndpoint(analiseId, 'risk-correlation')
      return { ok: true }
    })
    await step.run('coverage-check', async () => {
      await runCheckEndpoint(analiseId, 'coverage-check')
      return { ok: true }
    })
    await step.run('mesa-revisao', async () => {
      await runCheckEndpoint(analiseId, 'mesa-revisao')
      return { ok: true }
    })

    // Documentos de captação + relatório consolidado (sequencial).
    await maybeRunAgent('blind_teaser')
    await maybeRunAgent('sell_side_pitchbook')
    await maybeRunAgent('relatorio_consolidado')

    // Conclui — usar analise-status?concluir=1 exigiria sessão de usuário; marca
    // direto via admin e dispara o email de conclusão (best-effort, mesmo helper).
    await step.run('set-concluido', async () => {
      await admin
        .from('analises')
        .update({ status: 'concluido', atualizado_em: new Date().toISOString() })
        .eq('id', analiseId)
      return { ok: true }
    })

    await step.run('notify-concluido', async () => {
      try {
        const { data: a } = await admin
          .from('analises')
          .select('nome_ativo, user_id')
          .eq('id', analiseId)
          .single()
        if (!a) return { status: 'skipped', reason: 'analise_not_found' }
        const { data: owner } = await admin.auth.admin.getUserById(a.user_id)
        const to = owner?.user?.email
        if (!to) return { status: 'skipped', reason: 'no_email' }
        await sendCompletionEmail({ to, nomeAtivo: a.nome_ativo ?? 'Análise', analiseId, baseUrl: baseUrl() })
        return { status: 'sent', to }
      } catch (e) {
        return { status: 'failed', error: (e as Error).message }
      }
    })

    logger.info('Pipeline concluído', { analiseId })
    return { ok: true, analiseId }
  } catch (err) {
    const e = err as Error
    logger.error('Pipeline falhou', { analiseId, error: e.message })
    // Marca erro + grava a mensagem no banco para diagnóstico (logs do Inngest
    // não são acessíveis via CLI). Lê depois em analises.outputs.__pipeline_error__.
    await step.run('set-erro', async () => {
      const { data: cur } = await admin.from('analises').select('outputs').eq('id', analiseId).single()
      await admin
        .from('analises')
        .update({
          status: 'erro',
          outputs: {
            ...((cur?.outputs as Record<string, string>) ?? {}),
            __pipeline_error__: JSON.stringify({ message: e.message, at: new Date().toISOString() }),
          },
          atualizado_em: new Date().toISOString(),
        })
        .eq('id', analiseId)
      return { ok: true }
    })
    // Relança pra que o Inngest registre a falha (e possa retentar conforme retries).
    throw e
  }
}
