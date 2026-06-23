/**
 * POST /api/admin/chunks-categorize
 * Dispara categorização de chunks em background (admin-only).
 * Útil para reprocessar chunks não categorizados ou para backfill.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { isAdmin } from '@/lib/get-role'
import { inngest } from '@/lib/inngest'

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  const admin = await isAdmin(user.id)
  if (!admin) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })
  }

  const { analiseId } = await req.json() as { analiseId?: string }

  try {
    await inngest.send({
      name: 'analise/chunks.categorize_requested',
      data: { analiseId },
    })

    const msg = analiseId
      ? `Categorização disparada para análise ${analiseId}`
      : 'Categorização disparada para TODOS chunks não categorizados'

    return NextResponse.json({ ok: true, message: msg, analiseId: analiseId ?? null })
  } catch (err) {
    console.error('Erro ao disparar categorização:', err)
    return NextResponse.json(
      { error: 'Falha ao disparar categorização' },
      { status: 500 }
    )
  }
}
