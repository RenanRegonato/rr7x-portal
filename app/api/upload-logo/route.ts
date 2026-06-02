import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createAdminClient } from '@/lib/supabase-server'
import { isAllowedLogoExtension, ALLOWED_LOGO_EXTENSIONS_LIST } from '@/lib/upload-validation'

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const { ext } = await req.json() as { ext: string }
  const safeExt = (ext ?? '').replace(/[^a-z0-9]/gi, '').toLowerCase() || 'png'

  // Bucket de logos é PÚBLICO — SVG/HTML/JS subidos viram XSS via subdomínio
  // Supabase. Whitelist rígida: só raster image formats.
  if (!isAllowedLogoExtension(safeExt)) {
    return NextResponse.json({
      error: `Tipo de imagem não permitido. Aceitos: ${ALLOWED_LOGO_EXTENSIONS_LIST.join(', ')}.`,
    }, { status: 400 })
  }

  const path = `${user.id}/logo.${safeExt}`

  const admin = createAdminClient()

  // Ensure logos bucket exists and is public
  const { data: bucket } = await admin.storage.getBucket('logos')
  if (!bucket) {
    await admin.storage.createBucket('logos', { public: true })
  } else if (!bucket.public) {
    await admin.storage.updateBucket('logos', { public: true })
  }

  const { data, error } = await admin.storage
    .from('logos')
    .createSignedUploadUrl(path)

  if (error || !data) {
    return NextResponse.json({ error: error?.message ?? 'Falha ao gerar URL' }, { status: 500 })
  }

  const { data: { publicUrl } } = admin.storage.from('logos').getPublicUrl(path)

  return NextResponse.json({ signedUrl: data.signedUrl, publicUrl })
}
