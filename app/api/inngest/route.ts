import { serve } from 'inngest/next'
import { inngest } from '@/lib/inngest'
import { processDocument, failDocumentAndMaybeConsolidate } from '@/lib/ingestion/process-document'
import { consolidateFactBank } from '@/lib/ingestion/consolidate-fact-bank'
import { runMatching, runReverseMatching } from '@/lib/invest-match/matching-engine'
import { notifyAssessorOfMatches } from '@/lib/invest-match/notify'
import { runAnalysisPipeline } from '@/lib/analise/run-pipeline'
import { recoverStuckIngestions } from '@/lib/ingestion/watchdog'
import { runDealMonitor } from '@/lib/monitoring/deal-monitor'
import { runEtlCvmCadFiPage, criarIngestaoRun, finalizarIngestaoRun, rebuildGrafoEScore } from '@/lib/mapa-mercado/etl-cvm'
import { enrichEntidadesReceitaPage } from '@/lib/mapa-mercado/etl-receita'
import { embedEntidadesPage } from '@/lib/mapa-mercado/etl-embeddings'
import { runEtlBcbBancos } from '@/lib/mapa-mercado/etl-bcb'

// Cada step do Inngest é uma request HTTP serverless. Steps como extract-text
// (com OCR Mistral em PDFs grandes) e embed-chunks (várias chamadas Voyage)
// podem demorar mais que o default 60s da Vercel Pro. 300s = max do plano Pro.
// Se ainda assim travar em algum step, fragmentar o step em sub-steps menores.
export const maxDuration = 300

// Função 1: processa 1 documento (download → OCR/parse → chunks → embeddings → facts)
export const processDocumentFn = inngest.createFunction(
  {
    id:          'process-document',
    name:        'Process a single document end-to-end',
    triggers:    [{ event: 'analise/document.process_requested' }],
    concurrency: { limit: 4 }, // 4 docs simultâneos
    retries:     3,
    // Rede de segurança: se o processamento esgotar os 3 retries, o doc ficaria
    // preso num status transitório e a consolidação do fact_bank nunca dispararia
    // (um doc travado mata o deal inteiro). Aqui marcamos o doc como failed
    // (terminal) e reavaliamos a consolidação, para o deal seguir com os
    // documentos que deram certo. event.data.event = evento original que falhou.
    onFailure: async ({ event, error, step, logger }) => {
      const { analiseId, documentId } = event.data.event.data as { analiseId: string; documentId: string }
      logger.error('processDocument falhou após os retries; marcando doc como failed e reavaliando consolidação', {
        analiseId, documentId, error: error.message,
      })
      await failDocumentAndMaybeConsolidate({ analiseId, documentId, error: error.message, step })
    },
  },
  async ({ event, step, logger }) => {
    const { analiseId, documentId } = event.data as { analiseId: string; documentId: string }
    logger.info('Starting document processing', { analiseId, documentId })
    return await processDocument({ analiseId, documentId, step, logger })
  },
)

// Função 2: consolida fact_bank quando TODOS docs terminaram
export const consolidateFactBankFn = inngest.createFunction(
  {
    id:       'consolidate-fact-bank',
    name:     'Consolidate document facts into analysis fact_bank',
    triggers: [{ event: 'analise/fact_bank.consolidate_requested' }],
    retries:  2,
  },
  async ({ event, step, logger }) => {
    const { analiseId } = event.data as { analiseId: string }
    logger.info('Consolidating fact bank', { analiseId })
    return await consolidateFactBank({ analiseId, step, logger })
  },
)

// Função 3: roda o motor de matching v2 quando uma tese é criada/atualizada
export const runThesisMatchingFn = inngest.createFunction(
  {
    id:          'invest-match-run-matching',
    name:        'Invest Match — roda motor de matching para uma tese',
    triggers:    [{ event: 'invest-match/thesis.created' }],
    concurrency: { limit: 2 }, // 2 teses simultâneas (cada uma faz até 20 chamadas Sonnet)
    retries:     2,
  },
  async ({ event, step, logger }) => {
    const { teseId } = event.data as { teseId: string; analiseId: string | null; userId: string }
    logger.info('Running matching engine', { teseId })
    const result = await runMatching({ teseId, step, logger })

    // Avisa o assessor (dono do deal) se gerou matches — best-effort, não falha o job.
    if (result.matches_persistidos > 0) {
      await step.run('notify-assessor', () => notifyAssessorOfMatches({
        teseId,
        totalMatches:  result.matches_persistidos,
        autoAprovados: result.aprovados_auto,
      }))
    }

    return result
  },
)

// Função 4: originação reversa — busca teses compatíveis para um investidor
export const reverseMatchingFn = inngest.createFunction(
  {
    id:          'invest-match-reverse-matching',
    name:        'Invest Match — busca oportunidades (teses) para um investidor',
    triggers:    [{ event: 'invest-match/investidor.match_requested' }],
    concurrency: { limit: 2 },
    retries:     2,
  },
  async ({ event, step, logger }) => {
    const { investidorId } = event.data as { investidorId: string; userId: string }
    logger.info('Running reverse matching', { investidorId })
    return await runReverseMatching({ investidorId, step, logger })
  },
)

// Função 5: orquestra o pipeline de análise multi-agente 100% server-side.
// Substitui o antigo runPipeline() que rodava no navegador do dono. Cada agente
// é um step.run() — durável e com retry. A página vira apenas viewer (polling).
export const runAnalysisPipelineFn = inngest.createFunction(
  {
    id:          'run-analysis-pipeline',
    name:        'Run multi-agent analysis pipeline server-side',
    triggers:    [{ event: 'analise/pipeline.run_requested' }],
    concurrency: { limit: 3 }, // até 3 análises simultâneas
    retries:     2,
  },
  async ({ event, step, logger }) => {
    const { analiseId } = event.data as { analiseId: string }
    logger.info('Running analysis pipeline', { analiseId })
    return await runAnalysisPipeline({ analiseId, step, logger })
  },
)

// Função 6: watchdog (cron) — backstop da ingestão. Recupera análises cuja
// ingestão começou mas nunca consolidou porque um doc ficou preso sem esgotar
// retries (evento perdido, doc em 'pending', etc.), que o onFailure não alcança.
// Conservador: só age após GRACE_MIN (default 60min), depois do ciclo de retries.
export const ingestionWatchdogFn = inngest.createFunction(
  {
    id:       'ingestion-watchdog',
    name:     'Watchdog: recupera ingestões travadas (backstop do onFailure)',
    triggers: [{ cron: '*/15 * * * *' }], // a cada 15 minutos
    retries:  1,
  },
  async ({ step, logger }) => {
    logger.info('watchdog: varrendo ingestões travadas')
    return await recoverStuckIngestions({ step, logger })
  },
)

// Função 7: monitoramento contínuo de deals (cron diário + disparo manual).
// Re-checa a situação cadastral do CNPJ dos deals concluídos e gera alertas.
export const dealMonitorFn = inngest.createFunction(
  {
    id:       'deal-monitor',
    name:     'Monitoramento contínuo de deals (situação cadastral)',
    triggers: [
      { cron: '0 9 * * *' },                  // todo dia às 09:00 UTC
      { event: 'deal/monitor.run_requested' }, // disparo manual (admin)
    ],
    retries:  1,
  },
  async ({ logger }) => {
    logger.info('deal-monitor: varrendo deals concluídos')
    return await runDealMonitor()
  },
)

// Função 8: ETL do Mapa Inteligente do Mercado (CVM Dados Abertos / ODbL).
// Carrega o cadastro de fundos, monta entidades + veículos + prestadores e
// reconstrói o grafo de conexões e o score de relevância. Cron semanal +
// disparo manual (admin via POST /api/mapa-mercado/etl/cvm).
export const mapaMercadoEtlCvmFn = inngest.createFunction(
  {
    id:       'mapa-mercado-etl-cvm',
    name:     'Mapa do Mercado: ETL CVM (cadastro de fundos)',
    triggers: [
      { cron: '0 7 * * 1' },                       // toda segunda 07:00 UTC
      { event: 'mapa-mercado/etl.cvm_requested' },  // disparo manual (admin)
    ],
    concurrency: { limit: 1 },                      // ETL pesado: nunca em paralelo
    retries:     1,
  },
  async ({ event, step, logger }) => {
    // event.data pode vir do cron (sem campos) ou do disparo manual.
    const data = event.data as { max?: number; pageSize?: number } | undefined
    const pageSize = data?.pageSize ?? 8000
    const max = data?.max ?? 0                 // 0 = base completa (~60k)
    const MAX_PAGINAS = 40                       // backstop (40 * 8000 = 320k)

    const runId = await step.run('iniciar-run', () => criarIngestaoRun())
    const acc = { lidas: 0, veiculos: 0, prestadores: 0 }

    try {
      let offset = 0
      for (let p = 0; p < MAX_PAGINAS; p++) {
        if (max > 0 && offset >= max) break
        const limit = max > 0 ? Math.min(pageSize, max - offset) : pageSize
        // Cada página é um step próprio (300s cada) → sem timeout na base toda.
        const res = await step.run(`pagina-${p}-off-${offset}`, () =>
          runEtlCvmCadFiPage({ offset, limit, logger }),
        )
        acc.lidas += res.lidas
        acc.veiculos += res.veiculos
        acc.prestadores += res.prestadores
        if (res.lidas < limit) break            // última página (acabou o arquivo)
        offset += pageSize
      }
      await step.run('finalizar-run', () => finalizarIngestaoRun(runId, 'completed', acc))
      await step.run('rebuild-grafo-score', () => rebuildGrafoEScore({ logger }))
      return { status: 'completed', ...acc }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      await step.run('marcar-falha', () => finalizarIngestaoRun(runId, 'failed', acc, msg))
      throw err
    }
  },
)

// Função 9: enriquecimento das entidades do Mapa via Receita (BrasilAPI).
// Completa município/UF/CNAE/situação e marca bancos pelo CNAE. Paginado
// (lotes de ~120, gentil com rate-limit) + drain monotônico até esgotar.
export const mapaMercadoEnrichReceitaFn = inngest.createFunction(
  {
    id:       'mapa-mercado-enrich-receita',
    name:     'Mapa do Mercado: enriquecimento Receita (cidade/UF/CNAE)',
    triggers: [
      { cron: '30 7 * * 1' },                          // segunda 07:30 UTC (após o ETL CVM)
      { event: 'mapa-mercado/etl.receita_requested' },  // disparo manual (admin)
    ],
    concurrency: { limit: 1 },
    retries:     1,
  },
  async ({ event, step, logger }) => {
    const pageSize = (event.data as { pageSize?: number } | undefined)?.pageSize ?? 120
    const MAX_PAGINAS = 20                              // 20 * 120 = 2400 (cobre ~1.3k atuais)
    const acc = { processadas: 0, enriquecidas: 0, bancos: 0, falhas: 0 }
    for (let p = 0; p < MAX_PAGINAS; p++) {
      const res = await step.run(`receita-pagina-${p}`, () => enrichEntidadesReceitaPage({ limit: pageSize, logger }))
      acc.processadas += res.processadas
      acc.enriquecidas += res.enriquecidas
      acc.bancos += res.bancos_marcados
      acc.falhas += res.falhas
      if (res.processadas < pageSize) break            // esgotou as não-tentadas
    }
    return acc
  },
)

// Função 10: embeddings das entidades p/ busca semântica (voyage-3-large).
// Paginado (lotes de 128 = batch do voyage) + drain por embedding IS NULL.
export const mapaMercadoEmbedFn = inngest.createFunction(
  {
    id:       'mapa-mercado-embed',
    name:     'Mapa do Mercado: embeddings das entidades (busca semântica)',
    triggers: [
      { cron: '0 8 * * 1' },                          // segunda 08:00 UTC (após enrich)
      { event: 'mapa-mercado/etl.embed_requested' },   // disparo manual (admin)
    ],
    concurrency: { limit: 1 },
    retries:     1,
  },
  async ({ event, step, logger }) => {
    const pageSize = (event.data as { pageSize?: number } | undefined)?.pageSize ?? 128
    const MAX_PAGINAS = 30
    const acc = { processadas: 0, gravadas: 0 }
    for (let p = 0; p < MAX_PAGINAS; p++) {
      const res = await step.run(`embed-pagina-${p}`, () => embedEntidadesPage({ limit: pageSize, logger }))
      acc.processadas += res.processadas
      acc.gravadas += res.gravadas
      if (res.processadas < pageSize) break
    }
    return acc
  },
)

// Função 11: dados financeiros dos bancos (BCB IF.data). Ativo, carteira de
// crédito, carteira PJ, PL, lucro por trimestre → mercado_metricas.
export const mapaMercadoEtlBcbFn = inngest.createFunction(
  {
    id:       'mapa-mercado-etl-bcb',
    name:     'Mapa do Mercado: ETL BCB (bancos / carteira PJ)',
    triggers: [
      { cron: '0 9 5 * *' },                          // dia 5 de cada mês 09:00 UTC
      { event: 'mapa-mercado/etl.bcb_requested' },     // disparo manual (admin)
    ],
    concurrency: { limit: 1 },
    retries:     1,
  },
  async ({ step, logger }) => {
    return await step.run('etl-bcb', () => runEtlBcbBancos({ logger }))
  },
)

// signingKey lido automaticamente de INNGEST_SIGNING_KEY env var
export const { GET, POST, PUT } = serve({
  client:    inngest,
  functions: [processDocumentFn, consolidateFactBankFn, runThesisMatchingFn, reverseMatchingFn, runAnalysisPipelineFn, ingestionWatchdogFn, dealMonitorFn, mapaMercadoEtlCvmFn, mapaMercadoEnrichReceitaFn, mapaMercadoEmbedFn, mapaMercadoEtlBcbFn],
})
