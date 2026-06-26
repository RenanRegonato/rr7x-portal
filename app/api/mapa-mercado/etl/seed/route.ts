import { NextRequest, NextResponse } from 'next/server'
import { getUserContext } from '@/lib/get-role'
import { seedMapaMercado } from '@/lib/mapa-mercado/etl-seed'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  const ctx = await getUserContext()
  if (!ctx) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  if (ctx.role !== 'admin') return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })

  try {
    console.log('[SEED-API] Iniciando seed do Mapa Inteligente...')
    const result = await seedMapaMercado()

    console.log('[SEED-API] Seed completado:', result)
    return NextResponse.json({
      success: true,
      message: 'Seed executado com sucesso',
      result,
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[SEED-API] Erro:', msg)
    return NextResponse.json(
      { error: msg },
      { status: 500 }
    )
  }
}
