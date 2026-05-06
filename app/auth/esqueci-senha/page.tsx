'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import Link from 'next/link'

export default function EsqueciSenhaPage() {
  const [email,   setEmail]   = useState('')
  const [loading, setLoading] = useState(false)
  const [sent,    setSent]    = useState(false)

  const supabase = createClient()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    // Always show success — never expose whether the email exists (security)
    await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/auth/callback?next=/auth/nova-senha`,
    })

    setLoading(false)
    setSent(true)
  }

  if (sent) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center px-4">
        <div className="text-center max-w-md bg-surface border border-border rounded-[14px] shadow-soft-md p-10">
          <div className="w-12 h-12 rounded-full bg-ok/10 grid place-items-center mx-auto mb-4">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-ok">
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
              <path d="M22 6l-10 7L2 6"/>
            </svg>
          </div>
          <h2 className="font-display text-[22px] font-medium mb-2">Verifique seu email</h2>
          <p className="text-ink-3 text-[13px] mb-6">
            Se este email estiver cadastrado, você receberá um link para redefinir sua senha em instantes. Verifique também a caixa de spam.
          </p>
          <Link
            href="/auth/login"
            className="text-[13px] text-accent-strong hover:underline font-medium"
          >
            Voltar para o login
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2.5 mb-3">
            <div className="w-8 h-8 rounded-lg bg-accent grid place-items-center font-display italic font-semibold text-[18px] text-accent-ink">
              o
            </div>
            <span className="font-display font-medium text-[24px] tracking-tight">Otto</span>
          </div>
          <p className="text-ink-3 text-[13px]">Deal intelligence · RR7x Capital Hub</p>
        </div>

        <div className="bg-surface border border-border rounded-[14px] shadow-soft-md p-8">
          <h2 className="font-display text-[22px] font-medium tracking-tight mb-1">Esqueci minha senha</h2>
          <p className="text-ink-3 text-[13px] mb-6">
            Informe seu email e enviaremos um link seguro para redefinição de senha.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[12px] font-medium text-ink-2 mb-1.5">Email cadastrado</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoFocus
                className="w-full border border-border rounded-[10px] px-3 py-2.5 text-[13px] bg-surface outline-none transition-shadow focus:border-accent-strong focus:shadow-[0_0_0_3px_oklch(0.93_0.04_40)] placeholder:text-ink-3"
                placeholder="seu@escritorio.com.br"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-accent-strong hover:opacity-90 text-white font-semibold py-2.5 rounded-[10px] transition disabled:opacity-50 text-[13px]"
            >
              {loading ? 'Enviando...' : 'Enviar link de redefinição'}
            </button>

            <p className="text-center text-ink-3 text-[12px]">
              Lembrou a senha?{' '}
              <Link href="/auth/login" className="text-accent-strong hover:underline font-medium">
                Voltar ao login
              </Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  )
}
