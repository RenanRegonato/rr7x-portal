import { createAdminClient } from './supabase-server'

const BUCKET = 'analises'
const MAX_FILES = 100
const MAX_PDF_BYTES   = 100 * 1024 * 1024  // 100MB por PDF (só baixa; texto extraído não vai como binário)
const MAX_IMAGE_BYTES =  10 * 1024 * 1024  // 10MB por imagem
// Limite binário só se aplica a PDFs sem camada de texto (scanned) e imagens.
// PDFs com texto são extraídos e enviados como texto plano — sem custo binário.
// 15MB binário → ~20MB base64 → no limite da API Anthropic (~20MB).
const MAX_TOTAL_BYTES = 15 * 1024 * 1024
// PDFs com ao menos este número de caracteres são considerados "com texto"
const MIN_PDF_TEXT_CHARS = 200

export interface ProcessedDoc {
  name: string
  type: 'pdf' | 'image' | 'text' | 'skipped'
  status: 'ok' | 'error' | 'skipped'
  sizeKb: number
  content?: string
  base64?: string
  mediaType?: string
  reason?: string
}

export interface DocReadSummary {
  analiseId: string
  totalFiles: number
  processed: ProcessedDoc[]
  totalKbRead: number
  errors: string[]
}

type FileCategory = 'pdf' | 'image' | 'docx' | 'excel' | 'text' | 'unsupported'

function categorize(name: string): FileCategory {
  const ext = name.split('.').pop()?.toLowerCase() ?? ''
  if (ext === 'pdf') return 'pdf'
  if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) return 'image'
  if (['docx', 'doc'].includes(ext)) return 'docx'
  if (['xlsx', 'xls'].includes(ext)) return 'excel'
  if (['csv', 'txt', 'md'].includes(ext)) return 'text'
  return 'unsupported'
}

// Validates file magic bytes against declared extension to prevent disguised uploads.
function validateMimeSignature(buffer: Buffer, category: FileCategory, name: string): string | null {
  if (buffer.length < 8) return 'Arquivo muito pequeno ou corrompido.'

  if (category === 'pdf') {
    // PDF signature: %PDF (25 50 44 46)
    const isPdf = buffer[0] === 0x25 && buffer[1] === 0x50 && buffer[2] === 0x44 && buffer[3] === 0x46
    if (!isPdf) return `Arquivo "${name}" não é um PDF válido.`
  }

  if (category === 'image') {
    const ext = name.split('.').pop()?.toLowerCase() ?? ''
    const isJpeg = buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF
    const isPng  = buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47
    const isGif  = buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x38
    // WebP: bytes 0-3 = "RIFF", bytes 8-11 = "WEBP"
    const isWebp = buffer.length >= 12 &&
      buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46 &&
      buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50

    const isValidImage = isJpeg || isPng || isGif || isWebp
    if (!isValidImage) return `Arquivo "${name}" não é uma imagem válida (${ext}).`

    if (['jpg', 'jpeg'].includes(ext) && !isJpeg) return `Arquivo "${name}" não é um JPEG válido.`
    if (ext === 'png'  && !isPng)  return `Arquivo "${name}" não é um PNG válido.`
    if (ext === 'gif'  && !isGif)  return `Arquivo "${name}" não é um GIF válido.`
    if (ext === 'webp' && !isWebp) return `Arquivo "${name}" não é um WebP válido.`
  }

  return null
}

function imageMediaType(name: string): 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp' {
  const ext = name.split('.').pop()?.toLowerCase()
  if (ext === 'png') return 'image/png'
  if (ext === 'gif') return 'image/gif'
  if (ext === 'webp') return 'image/webp'
  return 'image/jpeg'
}

export async function readAnalyseDocs(userId: string, analiseId: string): Promise<DocReadSummary> {
  const admin = createAdminClient()
  const errors: string[] = []
  const processed: ProcessedDoc[] = []
  let totalKbRead = 0
  let totalBytesLoaded = 0
  const prefix = `${userId}/${analiseId}`

  const { data: fileList, error: listError } = await admin.storage
    .from(BUCKET)
    .list(prefix, { limit: MAX_FILES, sortBy: { column: 'name', order: 'asc' } })

  if (listError || !fileList) {
    return {
      analiseId, totalFiles: 0, processed: [], totalKbRead: 0,
      errors: [`Erro ao listar arquivos: ${listError?.message ?? 'bucket não encontrado ou vazio'}`],
    }
  }

  const files = fileList
    .filter(f => f.name !== '.emptyFolderPlaceholder' && f.name)
    .slice(0, MAX_FILES)

  // Sequential processing to avoid OOM from parallel large file loads
  for (const file of files) {
    const sizeBytes = file.metadata?.size ?? 0
    const sizeKb = Math.round(sizeBytes / 1024)
    const cat = categorize(file.name)

    if (cat === 'unsupported') {
      processed.push({ name: file.name, type: 'skipped', status: 'skipped', sizeKb, reason: 'Formato não suportado.' })
      continue
    }
    if (cat === 'pdf' && sizeBytes > MAX_PDF_BYTES) {
      processed.push({ name: file.name, type: 'pdf', status: 'skipped', sizeKb, reason: `PDF muito grande (${sizeKb}KB). Limite: 30MB.` })
      continue
    }
    if (cat === 'image' && sizeBytes > MAX_IMAGE_BYTES) {
      processed.push({ name: file.name, type: 'image', status: 'skipped', sizeKb, reason: `Imagem muito grande (${sizeKb}KB). Limite: 5MB.` })
      continue
    }
    // Images are always sent as binary base64; check budget before downloading
    if (cat === 'image' && totalBytesLoaded + sizeBytes > MAX_TOTAL_BYTES) {
      processed.push({ name: file.name, type: 'image', status: 'skipped', sizeKb, reason: `Limite total de conteúdo binário atingido (${Math.round(MAX_TOTAL_BYTES / 1024 / 1024)}MB).` })
      continue
    }

    try {
      const { data: blob, error: dlErr } = await admin.storage
        .from(BUCKET)
        .download(`${prefix}/${file.name}`)

      if (dlErr || !blob) {
        const reason = `Download falhou: ${dlErr?.message ?? 'desconhecido'}`
        processed.push({ name: file.name, type: cat === 'pdf' ? 'pdf' : cat === 'image' ? 'image' : 'text', status: 'error', sizeKb, reason })
        errors.push(`${file.name}: ${reason}`)
        continue
      }

      const arrayBuffer = await blob.arrayBuffer()
      const buffer = Buffer.from(arrayBuffer)

      if (cat === 'pdf' || cat === 'image') {
        const mimeError = validateMimeSignature(buffer, cat, file.name)
        if (mimeError) {
          processed.push({ name: file.name, type: cat, status: 'error', sizeKb, reason: mimeError })
          errors.push(`${file.name}: ${mimeError}`)
          continue
        }
      }

      if (cat === 'pdf') {
        // Try text extraction first (PDFs with a text layer)
        let extractedText: string | null = null
        try {
          const { PDFParse } = await import('pdf-parse')
          const parser = new PDFParse({ data: new Uint8Array(buffer), verbosity: 0 })
          const result = await parser.getText()
          await parser.destroy()
          if (result.text && result.text.trim().length >= MIN_PDF_TEXT_CHARS) {
            extractedText = result.text
          }
        } catch { /* scanned PDF or parse error — fall through to binary */ }

        if (extractedText !== null) {
          // Text-layer PDF: send as plain text, no binary budget consumed
          processed.push({ name: file.name, type: 'text', status: 'ok', sizeKb, content: extractedText.slice(0, 200000) })
          totalKbRead += sizeKb
          continue
        }

        // Scanned PDF (no text layer): fall back to base64 binary
        if (totalBytesLoaded + sizeBytes > MAX_TOTAL_BYTES) {
          processed.push({ name: file.name, type: 'pdf', status: 'skipped', sizeKb, reason: `PDF sem camada de texto e limite binário atingido (${Math.round(MAX_TOTAL_BYTES / 1024 / 1024)}MB).` })
          continue
        }
        processed.push({ name: file.name, type: 'pdf', status: 'ok', sizeKb, base64: buffer.toString('base64'), mediaType: 'application/pdf' })
        totalKbRead += sizeKb
        totalBytesLoaded += sizeBytes
        continue
      }

      if (cat === 'image') {
        processed.push({ name: file.name, type: 'image', status: 'ok', sizeKb, base64: buffer.toString('base64'), mediaType: imageMediaType(file.name) })
        totalKbRead += sizeKb
        totalBytesLoaded += sizeBytes
        continue
      }

      if (cat === 'docx') {
        const mammoth = await import('mammoth')
        const result = await mammoth.default.extractRawText({ buffer })
        processed.push({ name: file.name, type: 'text', status: 'ok', sizeKb, content: result.value.slice(0, 200000) })
        totalKbRead += sizeKb
        continue
      }

      if (cat === 'excel') {
        const XLSX = await import('xlsx')
        const workbook = XLSX.default.read(buffer, { type: 'buffer' })
        const sheets = workbook.SheetNames
          .map(name => `--- Aba: ${name} ---\n${XLSX.default.utils.sheet_to_csv(workbook.Sheets[name])}`)
          .join('\n\n')
        processed.push({ name: file.name, type: 'text', status: 'ok', sizeKb, content: sheets.slice(0, 200000) })
        totalKbRead += sizeKb
        continue
      }

      // text / csv / txt
      const content = buffer.toString('utf-8').slice(0, 200000)
      processed.push({ name: file.name, type: 'text', status: 'ok', sizeKb, content })
      totalKbRead += sizeKb

    } catch (e: any) {
      const reason = `Erro ao processar arquivo: ${e?.message ?? 'desconhecido'}`
      processed.push({ name: file.name, type: cat === 'pdf' ? 'pdf' : cat === 'image' ? 'image' : 'text', status: 'error', sizeKb, reason })
      errors.push(`${file.name}: ${reason}`)
    }
  }

  return { analiseId, totalFiles: files.length, processed, totalKbRead, errors }
}
