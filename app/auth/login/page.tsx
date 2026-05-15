'use client'

import { useState, useEffect, Suspense } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'

const ERRO_MSGS: Record<string, string> = {
  link_expirado: 'Este link expirou. Solicite um novo convite ou use "Esqueci minha senha".',
  link_invalido: 'Link inválido. Solicite um novo convite ou use "Esqueci minha senha".',
}

function ErroParam({ onErro }: { onErro: (msg: string) => void }) {
  const searchParams = useSearchParams()
  useEffect(() => {
    const erro = searchParams.get('erro')
    if (erro && ERRO_MSGS[erro]) onErro(ERRO_MSGS[erro])
  }, [searchParams, onErro])
  return null
}

export default function LoginPage() {
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [error,    setError]    = useState('')
  const [loading,  setLoading]  = useState(false)
  const router   = useRouter()
  const supabase = createClient()

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError('Email ou senha incorretos.')
      setLoading(false)
    } else {
      router.push('/dashboard')
      router.refresh()
    }
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
          <Suspense>
            <ErroParam onErro={setError} />
          </Suspense>
          <h2 className="font-display text-[22px] font-medium tracking-tight mb-1">Acesse sua conta</h2>
          <p className="text-ink-3 text-[13px] mb-6">Bem-vindo de volta.</p>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-[12px] font-medium text-ink-2 mb-1.5">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full border border-border rounded-[10px] px-3 py-2.5 text-[13px] bg-surface outline-none transition-shadow focus:border-accent-strong focus:shadow-[0_0_0_3px_oklch(0.93_0.04_40)] placeholder:text-ink-3"
                placeholder="seu@escritorio.com.br"
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-[12px] font-medium text-ink-2">Senha</label>
                <Link href="/auth/esqueci-senha" className="text-[11px] text-accent-strong hover:underline">
                  Esqueci minha senha
                </Link>
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full border border-border rounded-[10px] px-3 py-2.5 text-[13px] bg-surface outline-none transition-shadow focus:border-accent-strong focus:shadow-[0_0_0_3px_oklch(0.93_0.04_40)] placeholder:text-ink-3"
                placeholder="••••••••"
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
              {loading ? 'Entrando...' : 'Entrar'}
            </button>

            <p className="text-center text-ink-3 text-[12px]">
              Não tem conta?{' '}
              <Link href="/auth/signup" className="text-accent-strong hover:underline font-medium">
                Criar conta
              </Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  )
}
