/**
 * GET /api/dossie
 * Gera e retorna o PDF do Dossiê de Documentação da Mandor.
 * Acessível a qualquer usuário autenticado (assessores e gestores).
 */

import { NextRequest, NextResponse } from 'next/server'
import { getUserContext } from '@/lib/get-role'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  const ctx = await getUserContext()
  if (!ctx) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  try {
    // Importação lazy — react-pdf é pesado, não queremos no bundle principal
    const { gerarDossiePDF } = await import('@/lib/dossie-pdf')
    const buffer = await gerarDossiePDF()

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        'Content-Type':        'application/pdf',
        'Content-Disposition': 'attachment; filename="Mandor-Dossie-Documentacao.pdf"',
        'Content-Length':      buffer.byteLength.toString(),
        'Cache-Control':       'private, max-age=3600',
      },
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[DOSSIE-PDF] Erro ao gerar PDF:', msg)
    return NextResponse.json({ error: 'Erro ao gerar o dossiê' }, { status: 500 })
  }
}
