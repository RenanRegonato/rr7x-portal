import { createAdminClient } from '@/lib/supabase-server'
import { inngest } from '@/lib/inngest'
import { ocrPdf, ocrImage } from '@/lib/ingestion/mistral-ocr'
import { chunkText } from '@/lib/ingestion/chunker'
import { embedDocuments } from '@/lib/ingestion/voyage-embeddings'
import { extractFactsFromChunk, FACT_EXTRACTOR_MODEL } from '@/lib/ingestion/chunk-fact-extractor'

// step e logger vêm do Inngest SDK; tipo `any` no boundary porque o SDK envolve retornos
// em Jsonify<T> e isso não casa com generics manuais. Type safety preservada DENTRO de
// cada callback (TS infere o tipo do retorno).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Step = any
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Logger = any

interface ProcessParams {
  analiseId:  string
  documentId: string
  step:       Step
  logger:     Logger
}

export async function processDocument({ analiseId, documentId, step, logger }: ProcessParams) {
  const admin = createAdminClient()

  // 1) Carrega metadados do documento
  const doc = await step.run('load-document', async () => {
    const { data, error } = await admin
      .from('analise_documents')
      .select('id, file_path, file_name, file_size_bytes, file_category, status')
      .eq('id', documentId)
      .single()
    if (error || !data) throw new Error(`Documento ${documentId} não encontrado: ${error?.message}`)
    return data
  })

  if (doc.status === 'completed') {
    logger.info('Document already completed, skipping', { documentId })
    return { skipped: true }
  }

  // 2) Marca status = downloading
  await step.run('mark-downloading', async () => {
    await admin.from('analise_documents').update({ status: 'downloading' }).eq('id', documentId)
  })

  // 3) Download do Storage
  const buffer = await step.run('download-file', async () => {
    const { data, error } = await admin.storage.from('analises').download(doc.file_path)
    if (error || !data) throw new Error(`Download falhou: ${error?.message}`)
    return Buffer.from(await data.arrayBuffer())
  })

  // 4) Extrai texto (OCR via Mistral pra PDFs scaneados, parser nativo pra resto)
  const extracted = await step.run('extract-text', async () => {
    return await extractTextFromDocument(doc.file_category as ExtractCategory, buffer, doc.file_name, doc.file_path)
  })

  await step.run('mark-parsing-done', async () => {
    await admin.from('analise_documents').update({
      status:        'chunking',
      ocr_provider:  extracted.ocr_provider,
      pages_count:   extracted.pages_count,
      total_chars:   extracted.text.length,
    }).eq('id', documentId)
  })

  // 5) Chunking — quebra texto bruto em chunks de ~30k tokens com overlap
  const chunks = await step.run('chunk-text', async () => {
    return chunkText(extracted.text)
  }) as Array<{ index: number; text: string; char_start: number; char_end: number; token_count: number }>

  if (chunks.length === 0) {
    // Documento vazio ou ilegível — marca completed mesmo assim pra não travar o pipeline
    await step.run('mark-empty', async () => {
      await admin.from('analise_documents').update({
        status:       'completed',
        completed_at: new Date().toISOString(),
        total_chunks: 0,
      }).eq('id', documentId)
    })
  } else {
    // 5b) Atualiza total_chunks
    await step.run('set-total-chunks', async () => {
      await admin.from('analise_documents').update({
        status:       'embedding',
        total_chunks: chunks.length,
      }).eq('id', documentId)
    })

    // 5c) Embeddings em batch (voyage-3-large) — todas as chamadas em paralelo via SDK
    const embeddings = await step.run('embed-chunks', async () => {
      return await embedDocuments(chunks.map(c => c.text))
    })

    // 5d) Persiste chunks com embeddings em document_chunks
    await step.run('save-chunks', async () => {
      const rows = chunks.map((c, i) => ({
        document_id:     documentId,
        analise_id:      analiseId,
        chunk_index:     c.index,
        chunk_text:      c.text,
        char_start:      c.char_start,
        char_end:        c.char_end,
        page_start:      null,                       // PDFs com text-layer não preservam mapeamento exato
        page_end:        null,
        token_count:     c.token_count,
        embedding:       embeddings[i] as unknown as string, // pgvector aceita number[] como string
        embedding_model: 'voyage-3-large',
      }))
      await admin.from('document_chunks').upsert(rows, { onConflict: 'document_id,chunk_index' })
    })

    // 6) Fact extraction por chunk (Haiku 4.5, sequencial dentro deste doc)
    await step.run('mark-fact-extracting', async () => {
      await admin.from('analise_documents').update({ status: 'fact_extracting' }).eq('id', documentId)
    })

    for (let i = 0; i < chunks.length; i++) {
      await step.run(`extract-facts-chunk-${i}`, async () => {
        // Re-busca o chunk_id (foi criado no save-chunks step)
        const { data: chunkRow } = await admin
          .from('document_chunks')
          .select('id')
          .eq('document_id', documentId)
          .eq('chunk_index', chunks[i].index)
          .single()
        if (!chunkRow) return

        const facts = await extractFactsFromChunk({
          documentName:  doc.file_name,
          chunkText:     chunks[i].text,
          pageStartHint: null,
          pageEndHint:   null,
        })

        if (facts.length === 0) return

        const rows = facts.map(f => ({
          analise_id:   analiseId,
          document_id:  documentId,
          chunk_id:     chunkRow.id,
          fact_type:    f.fact_type,
          fact_key:     f.fact_key,
          fact_value:   f.fact_value,
          source_quote: f.source_quote,
          source_page:  f.source_page,
          confidence:   f.confidence,
          model_id:     FACT_EXTRACTOR_MODEL,
        }))
        await admin.from('document_facts').insert(rows)
      })

      await step.run(`bump-chunks-completed-${i}`, async () => {
        await admin
          .from('analise_documents')
          .update({ chunks_completed: i + 1 })
          .eq('id', documentId)
      })
    }
  }

  // 7) Marca completed e incrementa contador da análise (atomic read-then-update;
  // race condition aceitável pois Inngest serializa por concorrência=4 dentro da analise)
  await step.run('mark-completed', async () => {
    await admin.from('analise_documents').update({
      status:       'completed',
      completed_at: new Date().toISOString(),
    }).eq('id', documentId)

    const { data: a } = await admin
      .from('analises')
      .select('documents_completed')
      .eq('id', analiseId)
      .single()
    await admin
      .from('analises')
      .update({ documents_completed: (a?.documents_completed ?? 0) + 1 })
      .eq('id', analiseId)
  })

  // 8) Se foi o último doc, dispara consolidação do fact_bank
  await step.run('maybe-trigger-consolidation', async () => {
    const { data: a } = await admin
      .from('analises')
      .select('documents_completed, documents_failed, documents_total, fact_bank_consolidated_at')
      .eq('id', analiseId)
      .single()

    if (!a) return
    const done = (a.documents_completed ?? 0) + (a.documents_failed ?? 0)
    if (done >= (a.documents_total ?? 0) && !a.fact_bank_consolidated_at) {
      await inngest.send({
        name: 'analise/fact_bank.consolidate_requested',
        data: { analiseId },
      })
    }
  })

  return { ok: true, documentId, chars: extracted.text.length }
}

type ExtractCategory = 'pdf' | 'image' | 'docx' | 'excel' | 'text' | 'unsupported'

function mimeFromName(name: string): string {
  const ext = name.split('.').pop()?.toLowerCase()
  if (ext === 'png') return 'image/png'
  if (ext === 'gif') return 'image/gif'
  if (ext === 'webp') return 'image/webp'
  return 'image/jpeg'
}

/** Extrai texto bruto do documento. OCR via Mistral pra PDFs scaneados e imagens. */
async function extractTextFromDocument(
  category: ExtractCategory,
  buffer:   Buffer,
  fileName: string,
  filePath: string,
): Promise<{ text: string; pages_count: number | null; ocr_provider: string | null }> {
  if (category === 'pdf') {
    // Tenta camada de texto primeiro (PDFs editáveis)
    try {
      const { PDFParse } = await import('pdf-parse')
      const parser = new PDFParse({ data: new Uint8Array(buffer), verbosity: 0 })
      const result = await parser.getText()
      await parser.destroy()
      if (result.text && result.text.trim().length >= 200) {
        return { text: result.text, pages_count: result.total ?? null, ocr_provider: 'native' }
      }
    } catch { /* sem text layer, cai pra OCR */ }
    return await ocrPdf(filePath)
  }

  if (category === 'image') {
    return await ocrImage(buffer, mimeFromName(fileName))
  }

  if (category === 'docx') {
    const mammoth = await import('mammoth')
    const result = await mammoth.default.extractRawText({ buffer })
    return { text: result.value, pages_count: null, ocr_provider: 'native' }
  }

  if (category === 'excel') {
    const XLSX = await import('xlsx')
    const workbook = XLSX.default.read(buffer, { type: 'buffer' })
    const sheets = workbook.SheetNames
      .map(name => `--- Aba: ${name} ---\n${XLSX.default.utils.sheet_to_csv(workbook.Sheets[name])}`)
      .join('\n\n')
    return { text: sheets, pages_count: workbook.SheetNames.length, ocr_provider: 'native' }
  }

  if (category === 'text') {
    return { text: buffer.toString('utf-8'), pages_count: null, ocr_provider: 'native' }
  }

  return { text: '', pages_count: null, ocr_provider: null }
}
