import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { getMaintenance } from '@/lib/app-settings'

// Bypass do modo manutenção: a equipe continua acessando o dashboard enquanto os
// clientes veem a página de manutenção. Lista de e-mails (mesmo padrão de
// DEMO_EMAILS abaixo) para evitar query/role-check no Edge.
const ADMIN_EMAILS = new Set([
  'gestor@renanregonato.com.br',
  'agenciarr7@gmail.com',
])

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  const pathname = request.nextUrl.pathname

  // Modo manutenção: clientes são levados a /manutencao; a equipe (ADMIN_EMAILS)
  // continua usando o dashboard normalmente. Leitura cacheada + fail-open.
  if (pathname.startsWith('/dashboard') && !ADMIN_EMAILS.has(user?.email ?? '')) {
    const maint = await getMaintenance(supabase)
    if (maint.enabled) {
      return NextResponse.redirect(new URL('/manutencao', request.url))
    }
  }

  // Protege rotas do dashboard
  if (!user && pathname.startsWith('/dashboard')) {
    return NextResponse.redirect(new URL('/auth/login', request.url))
  }

  // Redireciona usuário logado da landing para dashboard
  if (user && pathname === '/') {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  if (user && pathname.startsWith('/dashboard')) {
    // Gate de onboarding: usuário sem nome deve completar o cadastro
    const nome = user.user_metadata?.nome as string | undefined
    if (!nome?.trim()) {
      return NextResponse.redirect(new URL('/auth/completar-cadastro', request.url))
    }

    // 2FA obrigatório para todo o dashboard — exceto a conta de demonstração comercial,
    // que precisa de login sem fricção durante apresentações ao vivo (dados fictícios).
    const DEMO_EMAILS = new Set(['demo@meridianocapital.com.br'])
    if (!DEMO_EMAILS.has(user.email ?? '')) {
      const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
      if (aal && aal.currentLevel !== 'aal2') {
        const mfaUrl = new URL('/auth/mfa-required', request.url)
        mfaUrl.searchParams.set('next', pathname)
        return NextResponse.redirect(mfaUrl)
      }
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/', '/dashboard/:path*'],
}
