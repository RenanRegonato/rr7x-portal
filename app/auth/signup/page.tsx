'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { traduzErroSupabase } from '@/lib/auth-errors'

export default function SignupPage() {
  const [email,      setEmail]      = useState('')
  const [password,   setPassword]   = useState('')
  const [nome,       setNome]       = useState('')
  const [escritorio, setEscritorio] = useState('')
  const [error,      setError]      = useState('')
  const [success,    setSuccess]    = useState(false)
  const [jaExiste,   setJaExiste]   = useState(false)
  const [loading,    setLoading]    = useState(false)
  const supabase = createClient()

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    setJaExiste(false)

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { nome, escritorio },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    })

    if (error) {
      setError(traduzErroSupabase(error))
      setLoading(false)
      return
    }

    // Proteção anti-enumeração do Supabase: quando o e-mail JÁ possui conta, o
    // signUp retorna um usuário com identities vazio (não cria conta duplicada nem
    // reenvia link). Detectamos para impedir duplicidade e direcionar à redefinição.
    const identities = data.user?.identities
    if (identities && identities.length === 0) {
      setJaExiste(true)
      setLoading(false)
      return
    }

    setSuccess(true)
  }

  if (success) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center px-4">
        <div className="text-center max-w-md bg-surface border border-border rounded-[14px] shadow-soft-md p-10">
          <div className="text-5xl mb-4">✉️</div>
          <h2 className="font-display text-[22px] font-medium mb-2">Verifique seu email</h2>
          <p className="text-ink-3 text-[13px]">
            Enviamos um link de confirmação para{' '}
            <strong className="text-ink font-semibold">{email}</strong>.
            Clique no link para ativar sua conta.
          </p>
        </div>
      </div>
    )
  }

  if (jaExiste) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center px-4">
        <div className="text-center max-w-md bg-surface border border-border rounded-[14px] shadow-soft-md p-10">
          <div className="text-5xl mb-4">🔐</div>
          <h2 className="font-display text-[22px] font-medium mb-2">Você já tem uma conta</h2>
          <p className="text-ink-3 text-[13px] mb-6">
            Já existe um acesso registrado para{' '}
            <strong className="text-ink font-semibold">{email}</strong>.
            Não criamos uma conta duplicada. Para entrar, use sua senha — ou redefina, se esqueceu.
          </p>
          <div className="flex flex-col gap-2.5">
            <Link
              href="/auth/esqueci-senha"
              className="w-full bg-accent-strong hover:opacity-90 text-white font-semibold py-2.5 rounded-[10px] transition text-[13px]"
            >
              Redefinir minha senha
            </Link>
            <Link href="/auth/login" className="text-accent-strong hover:underline font-medium text-[13px]">
              Ir para o login
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <img src="/logo/mandor-horizontal.svg" alt="Mandor" className="h-9 w-auto mx-auto mb-2" />
          <p className="text-ink-3 text-[13px]">Nenhum deal sem análise</p>
        </div>

        <div className="bg-surface border border-border rounded-[14px] shadow-soft-md p-8">
          <h2 className="font-display text-[22px] font-medium tracking-tight mb-1">Criar conta</h2>
          <p className="text-ink-3 text-[13px] mb-6">Comece a analisar deals em até 90 minutos.</p>

          <form onSubmit={handleSignup} className="space-y-4">
            <div>
              <label className="block text-[12px] font-medium text-ink-2 mb-1.5">Nome completo</label>
              <input
                type="text"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                required
                className="w-full border border-border rounded-[10px] px-3 py-2.5 text-[13px] bg-surface outline-none transition-shadow focus:border-accent-strong focus:shadow-[0_0_0_3px_oklch(0.93_0.04_40)] placeholder:text-ink-3"
                placeholder="João Silva"
              />
            </div>
            <div>
              <label className="block text-[12px] font-medium text-ink-2 mb-1.5">Escritório / Empresa</label>
              <input
                type="text"
                value={escritorio}
                onChange={(e) => setEscritorio(e.target.value)}
                required
                className="w-full border border-border rounded-[10px] px-3 py-2.5 text-[13px] bg-surface outline-none transition-shadow focus:border-accent-strong focus:shadow-[0_0_0_3px_oklch(0.93_0.04_40)] placeholder:text-ink-3"
                placeholder="Capital Assessoria"
              />
            </div>
            <div>
              <label className="block text-[12px] font-medium text-ink-2 mb-1.5">Email corporativo</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full border border-border rounded-[10px] px-3 py-2.5 text-[13px] bg-surface outline-none transition-shadow focus:border-accent-strong focus:shadow-[0_0_0_3px_oklch(0.93_0.04_40)] placeholder:text-ink-3"
                placeholder="joao@escritorio.com.br"
              />
            </div>
            <div>
              <label className="block text-[12px] font-medium text-ink-2 mb-1.5">Senha</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                className="w-full border border-border rounded-[10px] px-3 py-2.5 text-[13px] bg-surface outline-none transition-shadow focus:border-accent-strong focus:shadow-[0_0_0_3px_oklch(0.93_0.04_40)] placeholder:text-ink-3"
                placeholder="Mínimo 8 caracteres"
              />
            </div>

            {error && (
              <div className="bg-warn-soft border border-[oklch(0.85_0.06_75)] text-[oklch(0.45_0.1_65)] text-[13px] px-4 py-3 rounded-[10px]">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-accent-strong hover:opacity-90 text-white font-semibold py-2.5 rounded-[10px] transition disabled:opacity-50 text-[13px]"
            >
              {loading ? 'Criando conta...' : 'Criar conta'}
            </button>

            <p className="text-center text-ink-3 text-[12px]">
              Já tem conta?{' '}
              <Link href="/auth/login" className="text-accent-strong hover:underline font-medium">
                Entrar
              </Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  )
}
