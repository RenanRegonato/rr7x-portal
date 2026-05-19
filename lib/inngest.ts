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
}
