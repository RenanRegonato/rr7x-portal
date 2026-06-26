/**
 * GET /api/dossie-publico
 * Versao publica do PDF do Dossie de Documentacao.
 * Sem autenticacao — para enviar a clientes antes do cadastro.
 */

import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(_req: NextRequest) {
  try {
    const { gerarDossiePDF } = await import('@/lib/dossie-pdf')
    const buffer = await gerarDossiePDF()

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        'Content-Type':        'application/pdf',
        'Content-Disposition': 'attachment; filename="Mandor-Dossie-Documentacao.pdf"',
        'Content-Length':      buffer.byteLength.toString(),
        'Cache-Control':       'public, max-age=86400',
      },
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[DOSSIE-PDF-PUBLICO] Erro ao gerar PDF:', msg)
    return NextResponse.json({ error: 'Erro ao gerar o dossie' }, { status: 500 })
  }
}
