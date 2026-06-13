// GET /api/mapa-mercado/entidades/[id] — ficha completa de um participante.
import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { getEntidade, getVeiculosDaEntidade, getConexoes, getMetricas } from '@/lib/mapa-mercado/queries'

export const dynamic = 'force-dynamic'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'não autenticado' }, { status: 401 })

  const entidade = await getEntidade(id)
  if (!entidade) return NextResponse.json({ error: 'não encontrada' }, { status: 404 })

  const [veiculos, conexoes, metricas] = await Promise.all([
    getVeiculosDaEntidade(id),
    getConexoes(id),
    getMetricas(id),
  ])

  return NextResponse.json({ entidade, veiculos, conexoes, metricas })
}
