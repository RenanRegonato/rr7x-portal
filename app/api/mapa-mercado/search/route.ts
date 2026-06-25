// GET /api/mapa-mercado/search?q=&tipos=gestora,banco&uf=SP&limit=&offset=
// Busca unificada de participantes do mercado. Só retorna dado redistribuível.
import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { buscarEntidades } from '@/lib/mapa-mercado/queries'
import type { EntidadeTipo } from '@/lib/mapa-mercado/types'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'não autenticado' }, { status: 401 })

  const sp = req.nextUrl.searchParams
  const tiposRaw = sp.get('tipos')
  const limit = Math.min(Number(sp.get('limit')) || 30, 100)
  const offset = Math.max(Number(sp.get('offset')) || 0, 0)

  const { entidades, total } = await buscarEntidades({
    q:      sp.get('q') ?? undefined,
    tipos:  tiposRaw ? (tiposRaw.split(',').filter(Boolean) as EntidadeTipo[]) : undefined,
    uf:     sp.get('uf') ?? undefined,
    limit,
    offset,
  })

  return NextResponse.json({ entidades, total })
}
