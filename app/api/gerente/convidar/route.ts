import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'
import { getUserContext } from '@/lib/get-role'

export async function POST(req: NextRequest) {
  const ctx = await getUserContext()
  if (!ctx || ctx.role !== 'gerente') {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })
  }
  if (!ctx.escritorioId) {
    return NextResponse.json({ error: 'Escritório não configurado' }, { status: 400 })
  }

  const { email } = await req.json()
  if (!email?.trim()) return NextResponse.json({ error: 'Email obrigatório' }, { status: 400 })

  const admin = createAdminClient()

  const { data: inviteData, error: inviteErr } = await admin.auth.admin.inviteUserByEmail(
    email.trim(),
    {
      data: {
        invited_role:          'assessor',
        invited_escritorio_id: ctx.escritorioId,
      },
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? ''}/auth/callback?next=/auth/definir-senha`,
    }
  )

  if (inviteErr) return NextResponse.json({ error: inviteErr.message }, { status: 500 })

  // Pre-create perfil so the callback knows the user is already provisioned
  if (inviteData?.user) {
    await admin.from('perfis').upsert({
      user_id:       inviteData.user.id,
      role:          'assessor',
      escritorio_id: ctx.escritorioId,
      atualizado_em: new Date().toISOString(),
    }, { onConflict: 'user_id' })
  }

  return NextResponse.json({ ok: true })
}
