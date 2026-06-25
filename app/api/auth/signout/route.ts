import { createServerSupabaseClient } from '@/lib/supabase-server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient()
  await supabase.auth.signOut()
  const origin = req.nextUrl.origin
  return NextResponse.redirect(new URL('/', origin), { status: 303 })
}
