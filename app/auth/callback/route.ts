import { createServerClient } from '@supabase/ssr'
import { createAdminClient } from '@/lib/supabase-server'
import { sendNewSignupNotification } from '@/lib/email'
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
    // Link expirado/inválido: redireciona para o login com mensagem clara
    // (a página de login mapeia ?erro=link_expirado para texto em português)
    // em vez de seguir silenciosamente para um /dashboard sem sessão.
    try {
      const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
      if (exchangeError) {
        return NextResponse.redirect(`${origin}/auth/login?erro=link_expirado`)
      }
    } catch {
      return NextResponse.redirect(`${origin}/auth/login?erro=link_expirado`)
    }

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

        const nome = (user.user_metadata?.nome as string | undefined) ?? null

        if (invitedRole) {
          await admin.from('perfis').insert({
            user_id:       user.id,
            role:          invitedRole,
            escritorio_id: invitedEscId || null,
          })

          // Avisa a equipe comercial sobre novo gestor (não notifica assessores).
          if (invitedRole === 'gerente') {
            let escNome: string | null = null
            if (invitedEscId) {
              const { data: esc } = await admin
                .from('escritorios').select('nome').eq('id', invitedEscId).maybeSingle()
              escNome = esc?.nome ?? null
            }
            await notifySignupSafe({
              tipo: 'gestor', email: user.email!, nome, escritorioNome: escNome,
              role: invitedRole, baseUrl: origin,
            })
          }
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

          // Novo escritório criado via self-signup → avisa a equipe comercial.
          await notifySignupSafe({
            tipo: 'escritorio', email: user.email!, nome, escritorioNome,
            role: 'gerente', baseUrl: origin,
          })
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

// Envio best-effort: notificação de novo cadastro nunca deve quebrar o login.
async function notifySignupSafe(params: {
  tipo:           'escritorio' | 'gestor'
  email:          string
  nome:           string | null
  escritorioNome: string | null
  role:           string
  baseUrl:        string
}) {
  try {
    await sendNewSignupNotification(params)
  } catch (e) {
    console.error('[auth/callback] falha ao notificar novo cadastro:', e)
  }
}
