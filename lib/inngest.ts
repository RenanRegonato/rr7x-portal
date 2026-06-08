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
}
