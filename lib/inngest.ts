import { Inngest } from 'inngest'

export const inngest = new Inngest({
  id: 'rr7x-portal',
  eventKey: process.env.INNGEST_EVENT_KEY,
})

export type Events = {
  'analise/documents.ingest_requested': {
    data: {
      analiseId: string
      userId:    string
    }
  }
  'analise/document.process_requested': {
    data: {
      analiseId:  string
      documentId: string
    }
  }
  'analise/fact_bank.consolidate_requested': {
    data: {
      analiseId: string
    }
  }
  'analise/pipeline.run_requested': {
    data: {
      analiseId: string
    }
  }
  'analise/chunks.categorize_requested': {
    data: {
      analiseId?: string  // se vazio, categoriza TODOS chunks não categorizados
    }
  }
  'invest-match/thesis.created': {
    data: {
      teseId:    string
      analiseId: string | null   // null pra teses manuais
      userId:    string          // pra auditoria
    }
  }
  'invest-match/investidor.match_requested': {
    data: {
      investidorId: string
      userId:       string       // pra auditoria
    }
  }
  'deal/monitor.run_requested': {
    data: {
      manual?: boolean           // disparo manual (admin) vs cron
    }
  }
  'mapa-mercado/etl.cvm_requested': {
    data: {
      manual?:   boolean         // disparo manual (admin) vs cron
      max?:      number          // limite de fundos a processar (0 = todos)
      pageSize?: number          // tamanho da página (default 8000)
    }
  }
  'mapa-mercado/etl.receita_requested': {
    data: {
      manual?:   boolean         // disparo manual (admin) vs cron
      pageSize?: number          // entidades por página (default 120)
    }
  }
  'mapa-mercado/etl.embed_requested': {
    data: {
      manual?:   boolean         // disparo manual (admin) vs cron
      pageSize?: number          // entidades por página (default 128)
    }
  }
  'mapa-mercado/etl.bcb_requested': {
    data: {
      manual?: boolean           // disparo manual (admin) vs cron
      anoMes?: string            // trimestre específico (YYYYMM); default = mais recente
    }
  }
}
