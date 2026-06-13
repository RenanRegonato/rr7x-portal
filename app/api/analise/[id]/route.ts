import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createAdminClient } from '@/lib/supabase-server'
import { isAdminViewer } from '@/lib/get-role'
import { audit, extractIp } from '@/lib/audit'

export async function DELETE(
  req: NextRequest,
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

  // Dono pode apagar; admin (gestor) pode apagar qualquer deal.
  // 404 para deal inexistente ou sem permissão (não vaza existência).
  if (!analise || (analise.user_id !== user.id && !(await isAdminViewer(user.id)))) {
    return NextResponse.json({ error: 'Não encontrada' }, { status: 404 })
  }

  // Arquivos ficam sob o user_id do DONO do deal (não de quem apaga).
  const ownerId = analise.user_id

  // Delete uploaded files from storage
  const { data: files } = await admin.storage
    .from('analises')
    .list(`${ownerId}/${id}`)

  if (files && files.length > 0) {
    const paths = files.map((f) => `${ownerId}/${id}/${f.name}`)
    await admin.storage.from('analises').remove(paths)
  }

  await admin.from('analises').delete().eq('id', id)

  void audit({
    event:    'analise.deleted',
    userId:   user.id,
    targetId: id,
    ip:       extractIp(req.headers),
    userAgent: req.headers.get('user-agent'),
  })

  return NextResponse.json({ ok: true })
}
