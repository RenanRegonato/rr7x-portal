import { createServerClient } from '@supabase/ssr'
import { createAdminClient } from '@/lib/supabase-server'
import { cookies } from 'next/headers'
import { NextResponse, type NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  // ?next= allows callers to specify a post-auth redirect (e.g. /auth/nova-senha, /auth/definir-senha)
  const next = searchParams.get('next')

  if (code) {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll() },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          },
        },
      }
    )
    await supabase.auth.exchangeCodeForSession(code)

    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const admin = createAdminClient()
      const { data: perfil } = await admin
        .from('perfis')
        .select('user_id')
        .eq('user_id', user.id)
        .maybeSingle()

      if (!perfil) {
        const invitedRole  = user.user_metadata?.invited_role as string | undefined
        const invitedEscId = user.user_metadata?.invited_escritorio_id as string | undefined

        if (invitedRole) {
          await admin.from('perfis').insert({
            user_id:       user.id,
            role:          invitedRole,
            escritorio_id: invitedEscId || null,
          })
        } else {
          const escritorioNome = (user.user_metadata?.escritorio as string | undefined)
            || user.email?.split('@')[1]
            || 'Meu Escritório'

          const { data: esc } = await admin
            .from('escritorios')
            .insert({ nome: escritorioNome, user_id: user.id })
            .select('id')
            .single()

          if (esc) {
            await admin.from('perfis').insert({
              user_id:       user.id,
              role:          'gerente',
              escritorio_id: esc.id,
            })
          }
        }
      }

      // Redirect to the requested next page (e.g. password setup/reset pages)
      if (next) {
        return NextResponse.redirect(`${origin}${next}`)
      }
    }
  }

  return NextResponse.redirect(`${origin}/dashboard`)
}
