'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

// Reads Supabase error hash fragments (#error=...&error_code=...)
// and redirects to /auth/login with a readable query param.
export default function AuthErrorHandler() {
  const router = useRouter()

  useEffect(() => {
    const hash = window.location.hash
    if (!hash.includes('error=')) return

    const params = new URLSearchParams(hash.replace('#', ''))
    const code   = params.get('error_code') ?? params.get('error') ?? 'unknown'

    const mensagens: Record<string, string> = {
      otp_expired:   'link_expirado',
      access_denied: 'link_expirado',
      invalid_token: 'link_invalido',
    }

    const erro = mensagens[code] ?? 'link_invalido'
    router.replace(`/auth/login?erro=${erro}`)
  }, [router])

  return null
}
