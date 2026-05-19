import { Mistral } from '@mistralai/mistralai'
import { createAdminClient } from '@/lib/supabase-server'

const SIGNED_URL_TTL_SECONDS = 600 // 10 min
const OCR_MODEL = 'mistral-ocr-latest'

let _client: Mistral | null = null
function client(): Mistral {
  if (!_client) {
    const apiKey = process.env.MISTRAL_API_KEY
    if (!apiKey) throw new Error('MISTRAL_API_KEY not set')
    _client = new Mistral({ apiKey })
  }
  return _client
}

interface OcrResult {
  text:         string  // concat de todos os páginas em markdown
  pages_count:  number
  ocr_provider: 'mistral'
}

/** OCR de um PDF scaneado via Mistral. Usa signed URL do Supabase (TTL 10min). */
export async function ocrPdf(filePath: string): Promise<OcrResult> {
  const admin = createAdminClient()
  const { data, error } = await admin.storage
    .from('analises')
    .createSignedUrl(filePath, SIGNED_URL_TTL_SECONDS)
  if (error || !data?.signedUrl) {
    throw new Error(`Falha ao gerar signed URL para OCR: ${error?.message ?? 'sem URL'}`)
  }

  const response = await client().ocr.process({
    model:    OCR_MODEL,
    document: { type: 'document_url', documentUrl: data.signedUrl },
  })

  const text = response.pages
    .map(p => `--- Página ${p.index + 1} ---\n${p.markdown}`)
    .join('\n\n')

  return { text, pages_count: response.pages.length, ocr_provider: 'mistral' }
}

/** OCR de uma imagem via Mistral. Usa data URL inline (base64). */
export async function ocrImage(buffer: Buffer, mediaType: string): Promise<OcrResult> {
  const dataUrl = `data:${mediaType};base64,${buffer.toString('base64')}`

  const response = await client().ocr.process({
    model:    OCR_MODEL,
    document: { type: 'image_url', imageUrl: dataUrl },
  })

  const text = response.pages.map(p => p.markdown).join('\n\n')
  return { text, pages_count: response.pages.length, ocr_provider: 'mistral' }
}
