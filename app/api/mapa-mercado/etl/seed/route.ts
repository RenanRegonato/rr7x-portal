import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { seedMapaMercado } from '@/lib/mapa-mercado/etl-seed'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  // TODO: Validar autenticação (admin only)
  // Por enquanto, permitir disparo sem autenticação para facilitar testes.
  // Em produção, adicionar verificação de admin.

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
