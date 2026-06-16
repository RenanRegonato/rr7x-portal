import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

// POST /api/release/seen { version }
// Marca a versão da release como "vista" no user_metadata do usuário logado, para
// o aviso "Plataforma Atualizada" não reaparecer. Mesmo padrão do onboarding.
export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const version = typeof body.version === 'string' ? body.version : null
  if (!version) return NextResponse.json({ error: 'version obrigatória' }, { status: 400 })

  const { error } = await supabase.auth.updateUser({ data: { last_seen_release_version: version } })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
