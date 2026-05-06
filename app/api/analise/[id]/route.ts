import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createAdminClient } from '@/lib/supabase-server'

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const admin = createAdminClient()

  const { data: analise } = await admin
    .from('analises')
    .select('user_id')
    .eq('id', id)
    .single()

  if (!analise) return NextResponse.json({ error: 'Não encontrada' }, { status: 404 })
  if (analise.user_id !== user.id) return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })

  // Delete uploaded files from storage
  const { data: files } = await admin.storage
    .from('analises')
    .list(`${user.id}/${id}`)

  if (files && files.length > 0) {
    const paths = files.map((f) => `${user.id}/${id}/${f.name}`)
    await admin.storage.from('analises').remove(paths)
  }

  await admin.from('analises').delete().eq('id', id)

  return NextResponse.json({ ok: true })
}
