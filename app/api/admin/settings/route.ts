import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient, createServerSupabaseClient } from '@/lib/supabase-server'
import { isAdminViewer } from '@/lib/get-role'

async function requireAdmin(): Promise<boolean> {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false
  return isAdminViewer(user.id)
}

/* ── GET /api/admin/settings — lê o modo manutenção ── */
export async function GET() {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('app_settings')
    .select('value')
    .eq('key', 'maintenance')
    .maybeSingle()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const value = (data?.value as { enabled?: boolean; message?: string } | undefined) ?? {}
  return NextResponse.json({
    maintenance: { enabled: value.enabled === true, message: value.message ?? '' },
  })
}

/* ── PATCH /api/admin/settings — liga/desliga manutenção + mensagem ── */
export async function PATCH(req: NextRequest) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }
  const body = await req.json().catch(() => ({}))
  const enabled = body.enabled === true
  const message = typeof body.message === 'string' ? body.message.trim().slice(0, 500) : ''

  const supabase = createAdminClient()
  const { error } = await supabase
    .from('app_settings')
    .upsert({ key: 'maintenance', value: { enabled, message } }, { onConflict: 'key' })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ maintenance: { enabled, message } })
}
