// Categoriza um arquivo pela extensão para escolher o extrator na ingestão.
// FONTE ÚNICA: usada pela rota de ingestão e pelos endpoints de remediação
// (reenvio / texto colado). Manter em sincronia com a whitelist de upload
// (lib/upload-validation.ts) — só categorias != 'unsupported' são realmente lidas.
export type FileCategory = 'pdf' | 'image' | 'docx' | 'excel' | 'text' | 'unsupported'

export function categorizeFile(name: string): FileCategory {
  const ext = name.split('.').pop()?.toLowerCase() ?? ''
  if (ext === 'pdf') return 'pdf'
  if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) return 'image'
  if (ext === 'docx') return 'docx'
  if (['xlsx', 'xls'].includes(ext)) return 'excel'
  if (['csv', 'tsv', 'txt', 'md', 'json'].includes(ext)) return 'text'
  return 'unsupported'
}
