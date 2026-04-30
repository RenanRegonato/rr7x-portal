import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { checkDriveAccess } from '@/lib/drive'

export const maxDuration = 30

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ status: 'error', message: 'Não autenticado.' }, { status: 401 })

  const { url } = await req.json()
  if (!url || typeof url !== 'string') {
    return NextResponse.json({ status: 'error', message: 'URL não informada.' }, { status: 400 })
  }

  const result = await checkDriveAccess(url)
  return NextResponse.json(result)
}
