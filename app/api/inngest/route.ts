import { serve } from 'inngest/next'
import { inngest } from '@/lib/inngest'
import { processDocument, failDocumentAndMaybeConsolidate } from '@/lib/ingestion/process-document'
import { consolidateFactBank } from '@/lib/ingestion/consolidate-fact-bank'
import { runMatching, runReverseMatching } from '@/lib/invest-match/matching-engine'
import { notifyAssessorOfMatches } from '@/lib/invest-match/notify'
import { runAnalysisPipeline } from '@/lib/analise/run-pipeline'
import { recoverStuckIngestions } from '@/lib/ingestion/watchdog'

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

// signingKey lido automaticamente de INNGEST_SIGNING_KEY env var
export const { GET, POST, PUT } = serve({
  client:    inngest,
  functions: [processDocumentFn, consolidateFactBankFn, runThesisMatchingFn, reverseMatchingFn, runAnalysisPipelineFn, ingestionWatchdogFn],
})
