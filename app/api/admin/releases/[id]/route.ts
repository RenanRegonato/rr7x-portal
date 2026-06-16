import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient, createServerSupabaseClient } from '@/lib/supabase-server'
import { isAdminViewer } from '@/lib/get-role'

async function requireAdmin(): Promise<boolean> {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false
  return isAdminViewer(user.id)
}

function toList(v: unknown): string[] {
  if (Array.isArray(v)) return v.map(String).map(s => s.trim()).filter(Boolean)
  if (typeof v === 'string') return v.split('\n').map(s => s.trim()).filter(Boolean)
  return []
}

/* ── PATCH /api/admin/releases/[id] — edita / publica / despublica ── */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }
  const { id } = await params
  const body = await req.json().catch(() => ({}))

  const patch: Record<string, unknown> = {}
  if (typeof body.version === 'string') patch.version = body.version.trim()
  if (typeof body.title === 'string') patch.title = body.title.trim()
  if (body.release_date) patch.release_date = body.release_date
  if ('improvements' in body) patch.improvements = toList(body.improvements)
  if ('new_features' in body) patch.new_features = toList(body.new_features)
  if ('fixes' in body) patch.fixes = toList(body.fixes)

  // Publicar carimba published_at; despublicar zera.
  if (typeof body.published === 'boolean') {
    patch.published = body.published
    patch.published_at = body.published ? new Date().toISOString() : null
  }

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('platform_releases')
    .update(patch)
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ release: data })
}

/* ── DELETE /api/admin/releases/[id] ── */
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }
  const { id } = await params
  const supabase = createAdminClient()
  const { error } = await supabase.from('platform_releases').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
