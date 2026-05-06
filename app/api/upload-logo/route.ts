import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createAdminClient } from '@/lib/supabase-server'

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const { ext } = await req.json() as { ext: string }
  const safeExt = ext.replace(/[^a-z0-9]/gi, '').toLowerCase() || 'png'
  const path = `${user.id}/logo.${safeExt}`

  const admin = createAdminClient()
  const { data, error } = await admin.storage
    .from('logos')
    .createSignedUploadUrl(path)

  if (error || !data) {
    return NextResponse.json({ error: error?.message ?? 'Falha ao gerar URL' }, { status: 500 })
  }

  const { data: { publicUrl } } = admin.storage.from('logos').getPublicUrl(path)

  return NextResponse.json({ signedUrl: data.signedUrl, publicUrl })
}
