export type DriveValidationStatus = 'ok' | 'blocked' | 'error' | 'timeout'

export interface DriveValidation {
  status: DriveValidationStatus
  message: string
}

export async function checkDriveAccess(url: string): Promise<DriveValidation> {
  // Google Docs / Sheets públicos: export direto sem autenticação
  const gdocMatch = url.match(/docs\.google\.com\/(document|spreadsheets)\/d\/([^/?]+)/)
  if (gdocMatch) {
    const [, docType, docId] = gdocMatch
    const fmt = docType === 'spreadsheets' ? 'csv' : 'txt'
    try {
      const res = await fetch(`https://docs.google.com/${docType}/d/${docId}/export?format=${fmt}`, {
        signal: AbortSignal.timeout(8000),
      })
      if (res.ok) return { status: 'ok', message: `${docType === 'spreadsheets' ? 'Planilha' : 'Documento'} acessível.` }
      return { status: 'blocked', message: 'Arquivo privado. Configure como "qualquer pessoa com o link pode visualizar".' }
    } catch (e: any) {
      return { status: e?.name === 'TimeoutError' ? 'timeout' : 'error', message: 'Falha ao acessar o arquivo.' }
    }
  }

  // Pastas e demais URLs do Drive: Jina AI reader
  try {
    const res = await fetch(`https://r.jina.ai/${url}`, {
      headers: { 'Accept': 'text/plain', 'X-Return-Format': 'text' },
      signal: AbortSignal.timeout(12000),
    })
    if (res.ok) {
      const text = await res.text()
      const meaningful = text.replace(/\s+/g, ' ').trim()
      if (meaningful.length > 300) {
        return { status: 'ok', message: `Pasta acessível (${Math.round(meaningful.length / 1000)}KB de conteúdo detectado).` }
      }
      return {
        status: 'blocked',
        message: 'Pasta acessível mas sem conteúdo legível. Verifique as permissões ou se há arquivos na pasta.',
      }
    }
    return {
      status: 'blocked',
      message: `Sem acesso ao link (HTTP ${res.status}). Configure a pasta como pública antes de continuar.`,
    }
  } catch (e: any) {
    const isTimeout = e?.name === 'TimeoutError' || e?.name === 'AbortError'
    return {
      status: isTimeout ? 'timeout' : 'error',
      message: isTimeout
        ? 'Timeout ao verificar o link. Verifique se a URL está correta e a pasta é pública.'
        : `Erro de conexão: ${e?.message ?? 'desconhecido'}.`,
    }
  }
}
