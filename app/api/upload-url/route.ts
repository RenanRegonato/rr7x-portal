import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createAdminClient } from '@/lib/supabase-server'
import { checkRateLimit, rateLimitResponse } from '@/lib/rate-limit'
import { UploadUrlSchema } from '@/lib/schemas'

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  // 200 requisições de upload por hora por usuário
  const rl = await checkRateLimit(`upload:${user.id}`, 200, 3600)
  if (!rl.allowed) return rateLimitResponse(rl.resetIn)

  const body = await req.json()
  const parsed = UploadUrlSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Parâmetros inválidos.', details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    )
  }
  const { analiseId, files } = parsed.data

  const admin = createAdminClient()
  const { data: analise } = await admin
    .from('analises')
    .select('id, user_id')
    .eq('id', analiseId)
    .single()

  if (!analise || analise.user_id !== user.id) {
    return NextResponse.json({ error: 'Análise não encontrada.' }, { status: 404 })
  }

  const urls = await Promise.all(
    files.map(async ({ name }) => {
      const safeName = name.replace(/[^a-zA-Z0-9._-]/g, '_')
      const path = `${user.id}/${analiseId}/${safeName}`
      const { data, error } = await admin.storage
        .from('analises')
        .createSignedUploadUrl(path)

      if (error || !data) {
        return { name, originalName: name, error: error?.message ?? 'Falha ao gerar URL.' }
      }

      return { name: safeName, originalName: name, signedUrl: data.signedUrl, token: data.token, path }
    })
  )

  return NextResponse.json({ urls })
}
