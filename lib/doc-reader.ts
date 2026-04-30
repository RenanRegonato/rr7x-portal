import { createAdminClient } from './supabase-server'

const BUCKET = 'analises'
const MAX_FILES = 15
const MAX_PDF_BYTES = 20 * 1024 * 1024
const MAX_IMAGE_BYTES = 5 * 1024 * 1024

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
  const prefix = `${userId}/${analiseId}`

  const { data: fileList, error: listError } = await admin.storage
    .from(BUCKET)
    .list(prefix, { limit: MAX_FILES + 5, sortBy: { column: 'name', order: 'asc' } })

  if (listError || !fileList) {
    return {
      analiseId, totalFiles: 0, processed: [], totalKbRead: 0,
      errors: [`Erro ao listar arquivos: ${listError?.message ?? 'bucket não encontrado ou vazio'}`],
    }
  }

  const files = fileList
    .filter(f => f.name !== '.emptyFolderPlaceholder' && f.name)
    .slice(0, MAX_FILES)

  await Promise.allSettled(
    files.map(async (file) => {
      const sizeBytes = file.metadata?.size ?? 0
      const sizeKb = Math.round(sizeBytes / 1024)
      const cat = categorize(file.name)

      if (cat === 'unsupported') {
        processed.push({ name: file.name, type: 'skipped', status: 'skipped', sizeKb, reason: 'Formato não suportado.' })
        return
      }
      if (cat === 'pdf' && sizeBytes > MAX_PDF_BYTES) {
        processed.push({ name: file.name, type: 'pdf', status: 'skipped', sizeKb, reason: `PDF muito grande (${sizeKb}KB). Limite: 20MB.` })
        return
      }
      if (cat === 'image' && sizeBytes > MAX_IMAGE_BYTES) {
        processed.push({ name: file.name, type: 'image', status: 'skipped', sizeKb, reason: `Imagem muito grande (${sizeKb}KB). Limite: 5MB.` })
        return
      }

      const { data: blob, error: dlErr } = await admin.storage
        .from(BUCKET)
        .download(`${prefix}/${file.name}`)

      if (dlErr || !blob) {
        const reason = `Download falhou: ${dlErr?.message ?? 'desconhecido'}`
        processed.push({ name: file.name, type: cat === 'pdf' ? 'pdf' : cat === 'image' ? 'image' : 'text', status: 'error', sizeKb, reason })
        errors.push(`${file.name}: ${reason}`)
        return
      }

      const arrayBuffer = await blob.arrayBuffer()
      const buffer = Buffer.from(arrayBuffer)

      if (cat === 'pdf') {
        processed.push({ name: file.name, type: 'pdf', status: 'ok', sizeKb, base64: buffer.toString('base64'), mediaType: 'application/pdf' })
        totalKbRead += sizeKb
        return
      }

      if (cat === 'image') {
        processed.push({ name: file.name, type: 'image', status: 'ok', sizeKb, base64: buffer.toString('base64'), mediaType: imageMediaType(file.name) })
        totalKbRead += sizeKb
        return
      }

      if (cat === 'docx') {
        try {
          const mammoth = await import('mammoth')
          const result = await mammoth.default.extractRawText({ buffer })
          processed.push({ name: file.name, type: 'text', status: 'ok', sizeKb, content: result.value.slice(0, 200000) })
          totalKbRead += sizeKb
        } catch (e: any) {
          const reason = `Erro ao ler Word: ${e?.message}`
          processed.push({ name: file.name, type: 'text', status: 'error', sizeKb, reason })
          errors.push(`${file.name}: ${reason}`)
        }
        return
      }

      if (cat === 'excel') {
        try {
          const XLSX = await import('xlsx')
          const workbook = XLSX.default.read(buffer, { type: 'buffer' })
          const sheets = workbook.SheetNames
            .map(name => `--- Aba: ${name} ---\n${XLSX.default.utils.sheet_to_csv(workbook.Sheets[name])}`)
            .join('\n\n')
          processed.push({ name: file.name, type: 'text', status: 'ok', sizeKb, content: sheets.slice(0, 200000) })
          totalKbRead += sizeKb
        } catch (e: any) {
          const reason = `Erro ao ler Excel: ${e?.message}`
          processed.push({ name: file.name, type: 'text', status: 'error', sizeKb, reason })
          errors.push(`${file.name}: ${reason}`)
        }
        return
      }

      // text / csv / txt
      const content = buffer.toString('utf-8').slice(0, 200000)
      processed.push({ name: file.name, type: 'text', status: 'ok', sizeKb, content })
      totalKbRead += sizeKb
    })
  )

  return { analiseId, totalFiles: files.length, processed, totalKbRead, errors }
}
