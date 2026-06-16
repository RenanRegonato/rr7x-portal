import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient, createServerSupabaseClient } from '@/lib/supabase-server'
import { isAdminViewer } from '@/lib/get-role'

async function requireAdmin(): Promise<boolean> {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false
  return isAdminViewer(user.id)
}

// Normaliza uma textarea (uma linha = um item) em string[].
function toList(v: unknown): string[] {
  if (Array.isArray(v)) return v.map(String).map(s => s.trim()).filter(Boolean)
  if (typeof v === 'string') return v.split('\n').map(s => s.trim()).filter(Boolean)
  return []
}

/* ── GET /api/admin/releases — lista todas (admin) ── */
export async function GET() {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('platform_releases')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ releases: data ?? [] })
}

/* ── POST /api/admin/releases — cria release ── */
export async function POST(req: NextRequest) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }
  const body = await req.json().catch(() => ({}))
  const version = typeof body.version === 'string' ? body.version.trim() : ''
  if (!version) return NextResponse.json({ error: 'Versão é obrigatória' }, { status: 400 })

  const published = body.published === true
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('platform_releases')
    .insert({
      version,
      title: typeof body.title === 'string' && body.title.trim() ? body.title.trim() : 'Plataforma atualizada',
      release_date: body.release_date || new Date().toISOString().slice(0, 10),
      improvements: toList(body.improvements),
      new_features: toList(body.new_features),
      fixes: toList(body.fixes),
      published,
      published_at: published ? new Date().toISOString() : null,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ release: data }, { status: 201 })
}
