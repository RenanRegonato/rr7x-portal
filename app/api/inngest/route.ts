import { serve } from 'inngest/next'
import { inngest } from '@/lib/inngest'
import { processDocument } from '@/lib/ingestion/process-document'
import { consolidateFactBank } from '@/lib/ingestion/consolidate-fact-bank'

// Função 1: processa 1 documento (download → OCR/parse → chunks → embeddings → facts)
export const processDocumentFn = inngest.createFunction(
  {
    id:          'process-document',
    name:        'Process a single document end-to-end',
    triggers:    [{ event: 'analise/document.process_requested' }],
    concurrency: { limit: 4 }, // 4 docs simultâneos
    retries:     3,
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

// signingKey lido automaticamente de INNGEST_SIGNING_KEY env var
export const { GET, POST, PUT } = serve({
  client:    inngest,
  functions: [processDocumentFn, consolidateFactBankFn],
})
