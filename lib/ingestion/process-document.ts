import { createAdminClient } from '@/lib/supabase-server'
import { inngest } from '@/lib/inngest'
import { ocrPdf, ocrImage } from '@/lib/ingestion/mistral-ocr'
import { chunkText } from '@/lib/ingestion/chunker'
import { embedDocuments } from '@/lib/ingestion/voyage-embeddings'
import { extractFactsFromChunk, FACT_EXTRACTOR_MODEL } from '@/lib/ingestion/chunk-fact-extractor'
import { extractDeterministicFacts } from '@/lib/extract/deterministic-facts'

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

// REGRA DE OURO: step.run() tem limite de 4MB de output. Buffer de PDFs grandes
// e textos longos NÃO podem ser retornados. Dados pesados ficam no banco; steps
// retornam apenas counts/IDs/strings curtas.

export async function processDocument({ analiseId, documentId, step, logger }: ProcessParams) {
  const admin = createAdminClient()

  // 1) Carrega metadados
  const doc = await step.run('load-document', async () => {
    const { data, error } = await admin
      .from('analise_documents')
      .select('id, file_path, file_name, file_size_bytes, file_category, status')
      .eq('id', documentId)
      .single()
    if (error || !data) throw new Error(`Documento ${documentId} não encontrado: ${error?.message}`)
    return data
  }) as { id: string; file_path: string; file_name: string; file_size_bytes: number; file_category: string; status: string }

  if (doc.status === 'completed') {
    logger.info('Document already completed, skipping', { documentId })
    return { skipped: true }
  }

  // 2) Download → extract → chunk → save chunks (sem embedding ainda).
  //    Buffer e texto bruto vivem DENTRO deste step. Output retornado é só counts.
  const summary = await step.run('download-extract-chunk-save', async () => {
    await admin.from('analise_documents').update({ status: 'downloading' }).eq('id', documentId)

    const { data: blob, error: dlErr } = await admin.storage.from('analises').download(doc.file_path)
    if (dlErr || !blob) throw new Error(`Download falhou: ${dlErr?.message ?? 'sem dados'}`)
    const buffer = Buffer.from(await blob.arrayBuffer())

    await admin.from('analise_documents').update({ status: 'parsing' }).eq('id', documentId)
    const extracted = await extractTextFromDocument(
      doc.file_category as ExtractCategory,
      buffer,
      doc.file_name,
      doc.file_path,
    )

    await admin.from('analise_documents').update({ status: 'chunking' }).eq('id', documentId)
    const chunks = chunkText(extracted.text)

    if (chunks.length > 0) {
      // Insere em lotes pra não estourar payload do Postgres em docs com 100+ chunks
      const BATCH = 50
      for (let i = 0; i < chunks.length; i += BATCH) {
        const slice = chunks.slice(i, i + BATCH)
        const rows = slice.map(c => ({
          document_id:     documentId,
          analise_id:      analiseId,
          chunk_index:     c.index,
          chunk_text:      c.text,
          char_start:      c.char_start,
          char_end:        c.char_end,
          page_start:      null,
          page_end:        null,
          token_count:     c.token_count,
          embedding:       null,                  // preenchido no step embed-all-chunks
          embedding_model: 'voyage-3-large',
        }))
        const { error: insErr } = await admin.from('document_chunks').upsert(rows, { onConflict: 'document_id,chunk_index' })
        if (insErr) throw new Error(`Falha ao salvar chunks: ${insErr.message}`)
      }
    }

    await admin.from('analise_documents').update({
      status:       chunks.length > 0 ? 'embedding' : 'completed',
      ocr_provider: extracted.ocr_provider,
      pages_count:  extracted.pages_count,
      total_chars:  extracted.text.length,
      total_chunks: chunks.length,
      completed_at: chunks.length === 0 ? new Date().toISOString() : null,
    }).eq('id', documentId)

    return {
      total_chunks:  chunks.length,
      total_chars:   extracted.text.length,
      ocr_provider:  extracted.ocr_provider,
      pages_count:   extracted.pages_count,
    }
  }) as { total_chunks: number; total_chars: number; ocr_provider: string | null; pages_count: number | null }

  // Doc vazio (sem texto extraível): incrementa contador e segue
  if (summary.total_chunks === 0) {
    await step.run('inc-completed-empty', async () => {
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
    await maybeTriggerConsolidation(admin, analiseId, step)
    return { ok: true, documentId, chars: summary.total_chars, total_chunks: 0 }
  }

  // 3) Embeddings: lê chunks do banco, faz Voyage em batch, update no banco.
  //    Embedding vectors NÃO são retornados como output do step (são grandes).
  await step.run('embed-all-chunks', async () => {
    const { data: rows } = await admin
      .from('document_chunks')
      .select('id, chunk_text')
      .eq('document_id', documentId)
      .order('chunk_index')
    if (!rows || rows.length === 0) return { embedded: 0 }

    const embeddings = await embedDocuments(rows.map(r => r.chunk_text))

    for (let i = 0; i < rows.length; i++) {
      const { error: upErr } = await admin
        .from('document_chunks')
        .update({ embedding: embeddings[i] as unknown as string })
        .eq('id', rows[i].id)
      if (upErr) throw new Error(`Falha ao atualizar embedding ${i}: ${upErr.message}`)
    }
    return { embedded: rows.length }
  })

  // 4) Marca status pra fact_extracting
  await step.run('mark-fact-extracting', async () => {
    await admin.from('analise_documents').update({ status: 'fact_extracting' }).eq('id', documentId)
  })

  // 5) Lista chunk_ids (output pequeno: só array de { id, idx })
  const chunkRefs = await step.run('list-chunk-refs', async () => {
    const { data } = await admin
      .from('document_chunks')
      .select('id, chunk_index')
      .eq('document_id', documentId)
      .order('chunk_index')
    return (data ?? []).map(c => ({ id: c.id, idx: c.chunk_index }))
  }) as Array<{ id: string; idx: number }>

  // 6) Fact extraction por chunk — cada step lê o chunk do banco pelo ID
  for (const cr of chunkRefs) {
    await step.run(`extract-facts-chunk-${cr.idx}`, async () => {
      const { data: chunk } = await admin
        .from('document_chunks')
        .select('chunk_text')
        .eq('id', cr.id)
        .single()
      if (!chunk) return { facts: 0 }

      // Extração híbrida: determinística (rules) + IA (Haiku). Em colisão de
      // (fact_type, key), o determinístico VENCE — é validado (CNPJ/CPF) ou
      // ancorado em parser, mais confiável e auditável que o palpite do modelo.
      // model_id='deterministic' permite medir a cobertura via llm_usage_log/facts.
      const detFacts = extractDeterministicFacts(chunk.chunk_text)
      const aiFacts = await extractFactsFromChunk({
        documentName:  doc.file_name,
        chunkText:     chunk.chunk_text,
        pageStartHint: null,
        pageEndHint:   null,
        analiseId,
        documentId,
      })

      type FactRow = {
        fact_type: string; fact_key: string; fact_value: string
        source_quote: string | null; source_page: number | null
        confidence: number; model_id: string
      }
      const byKey = new Map<string, FactRow>()
      for (const f of aiFacts)  byKey.set(`${f.fact_type}::${f.fact_key}`, { ...f, model_id: FACT_EXTRACTOR_MODEL })
      for (const f of detFacts) byKey.set(`${f.fact_type}::${f.fact_key}`, { ...f, model_id: 'deterministic' })

      if (byKey.size === 0) return { facts: 0 }

      const rows = [...byKey.values()].map(r => ({
        analise_id:   analiseId,
        document_id:  documentId,
        chunk_id:     cr.id,
        fact_type:    r.fact_type,
        fact_key:     r.fact_key,
        fact_value:   r.fact_value,
        source_quote: r.source_quote,
        source_page:  r.source_page,
        confidence:   r.confidence,
        model_id:     r.model_id,
      }))
      await admin.from('document_facts').insert(rows)
      return { facts: rows.length, deterministic: detFacts.length, ai: aiFacts.length }
    })

    await step.run(`bump-chunks-completed-${cr.idx}`, async () => {
      const { data: d } = await admin
        .from('analise_documents')
        .select('chunks_completed')
        .eq('id', documentId)
        .single()
      await admin
        .from('analise_documents')
        .update({ chunks_completed: (d?.chunks_completed ?? 0) + 1 })
        .eq('id', documentId)
    })
  }

  // 7) Marca completed e incrementa contador da análise
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
  await maybeTriggerConsolidation(admin, analiseId, step)

  return { ok: true, documentId, chars: summary.total_chars, total_chunks: summary.total_chunks }
}

async function maybeTriggerConsolidation(
  admin:     ReturnType<typeof createAdminClient>,
  analiseId: string,
  step:      Step,
) {
  await step.run('maybe-trigger-consolidation', async () => {
    const { data: a } = await admin
      .from('analises')
      .select('documents_total, fact_bank_consolidated_at')
      .eq('id', analiseId)
      .single()
    if (!a) return { triggered: false }
    // Conta os documentos REALMENTE terminados (completed/failed) em vez do
    // contador incremental `documents_completed`, que sofria corrida (read-then-
    // write) quando dois docs terminavam juntos — travava em N-1/N e impedia a
    // consolidação automática de disparar. A contagem é determinística.
    const { count: doneCount } = await admin
      .from('analise_documents')
      .select('*', { count: 'exact', head: true })
      .eq('analise_id', analiseId)
      .in('status', ['completed', 'failed'])
    const done = doneCount ?? 0
    if (done >= (a.documents_total ?? 0) && !a.fact_bank_consolidated_at) {
      await inngest.send({
        name: 'analise/fact_bank.consolidate_requested',
        data: { analiseId },
      })
      return { triggered: true }
    }
    return { triggered: false }
  })
}

/**
 * Marca um documento como FALHO (estado terminal) quando o processamento esgotou
 * os retries do Inngest, e em seguida reavalia a consolidação. Sem isto, um doc
 * que trava fica para sempre num status transitório, o contador de documentos
 * terminais nunca alcança documents_total e a consolidação do fact_bank nunca
 * dispara, matando o deal inteiro por causa de um único documento. Idempotente:
 * não mexe em docs já completed/failed. Chamado pelo onFailure de processDocumentFn.
 */
export async function failDocumentAndMaybeConsolidate(
  { analiseId, documentId, error, step }:
  { analiseId: string; documentId: string; error: string; step: Step },
) {
  const admin = createAdminClient()

  await step.run('mark-document-failed', async () => {
    const { data: d } = await admin
      .from('analise_documents')
      .select('status')
      .eq('id', documentId)
      .single()
    if (d?.status === 'completed' || d?.status === 'failed') {
      return { skipped: true, status: d.status }
    }
    await admin.from('analise_documents').update({
      status:        'failed',
      error_message: error.slice(0, 2000),
      completed_at:  new Date().toISOString(),
    }).eq('id', documentId)

    // Contador observável no nível da análise (best-effort; o gate de
    // consolidação conta os terminais direto de analise_documents, não daqui).
    const { data: a } = await admin
      .from('analises')
      .select('documents_failed')
      .eq('id', analiseId)
      .single()
    await admin
      .from('analises')
      .update({ documents_failed: (a?.documents_failed ?? 0) + 1 })
      .eq('id', analiseId)
    return { ok: true, documentId }
  })

  // Reavalia: se este era o último doc não-terminal, dispara a consolidação com
  // os fatos dos documentos que deram certo (o deal segue sem o que falhou).
  await maybeTriggerConsolidation(admin, analiseId, step)
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
