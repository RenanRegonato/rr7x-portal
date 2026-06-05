import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

// POST /api/onboarding/complete
// Marca o onboarding como concluído no user_metadata do usuário logado.
// (user_metadata existe para todo usuário autenticado e vale cross-device,
// sem depender de uma linha em `perfis` nem de migration.)
export async function POST() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  // updateUser mescla `data` no user_metadata (preserva as demais chaves).
  const { error } = await supabase.auth.updateUser({ data: { onboarding_completed: true } })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
