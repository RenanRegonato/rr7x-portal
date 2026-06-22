// Whitelist de extensões de arquivo aceitas em uploads de cliente.
//
// Por que valida-se por EXTENSÃO (e não MIME real) aqui:
//   O cliente recebe uma signed URL e dá PUT direto no Supabase Storage. O
//   Storage não verifica MIME no PUT. Validar extensão no servidor antes de
//   gerar a signed URL impede que o nome seja `.exe`/`.html`/`.svg`. Isso é
//   defesa SEMPRE — mas não é tudo: cliente malicioso ainda pode renomear o
//   conteúdo. Validação real de conteúdo (sniffing de magic bytes) pode entrar
//   numa P4 via Inngest pós-upload.
//
// Não permitimos:
//   - executáveis (.exe, .bat, .sh, .cmd, .ps1, .app, .dmg, .deb, .rpm)
//   - HTML/scripts (.html, .htm, .js, .mjs, .php, .py, .rb, .pl) — XSS via bucket público
//   - SVG (pode embutir <script>) — XSS no logo
//   - arquivos sem extensão (ambíguos)

// IMPORTANTE: a whitelist deve refletir SOMENTE os formatos que o pipeline de
// ingestão consegue efetivamente LER (ver categorize() em app/api/analise/[id]/ingest/route.ts
// e extractTextFromDocument em lib/ingestion/process-document.ts). Aceitar um formato
// que a ingestão não extrai faz o arquivo subir, ser marcado "completed" e contribuir
// ZERO para a análise, sem o usuário perceber. Por isso ficaram de fora:
//   - .doc (Word binário legado — mammoth só lê .docx)
//   - .ppt/.pptx (PowerPoint — sem extrator; exporte para PDF)
//   - .rtf (sem extrator confiável)
//   - .heic/.heif (foto de iPhone — OCR só cobre jpg/jpeg/png/webp/gif)
const DOC_EXTENSIONS = new Set([
  'pdf',
  'docx',
  'xls', 'xlsx',
  'csv', 'tsv',
  'txt', 'md', 'json',
  'png', 'jpg', 'jpeg', 'webp', 'gif',
])

const LOGO_EXTENSIONS = new Set([
  'png', 'jpg', 'jpeg', 'webp',
  // NÃO permitimos SVG: pode embutir <script> e o bucket de logos é público,
  // o que viraria XSS via subdomínio do Supabase.
])

function extractExt(filename: string): string | null {
  const m = filename.toLowerCase().match(/\.([a-z0-9]+)$/)
  return m ? m[1] : null
}

export function isAllowedDocExtension(filename: string): boolean {
  const ext = extractExt(filename)
  return ext != null && DOC_EXTENSIONS.has(ext)
}

export function isAllowedLogoExtension(ext: string): boolean {
  return LOGO_EXTENSIONS.has(ext.toLowerCase().replace(/^\./, ''))
}

export const ALLOWED_DOC_EXTENSIONS_LIST = Array.from(DOC_EXTENSIONS).sort()
export const ALLOWED_LOGO_EXTENSIONS_LIST = Array.from(LOGO_EXTENSIONS).sort()
