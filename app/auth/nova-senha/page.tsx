'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import PasswordStrength, { isPasswordStrong } from '@/components/PasswordStrength'

export default function NovaSenhaPage() {
  const [senha,    setSenha]    = useState('')
  const [confirma, setConfirma] = useState('')
  const [error,    setError]    = useState('')
  const [loading,  setLoading]  = useState(false)
  const [success,  setSuccess]  = useState(false)

  const supabase = createClient()
  const router   = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (senha !== confirma) {
      setError('As senhas não coincidem.')
      return
    }
    if (!isPasswordStrong(senha)) {
      setError('A senha não atende aos requisitos mínimos de segurança.')
      return
    }

    setLoading(true)
    const { error: updateErr } = await supabase.auth.updateUser({ password: senha })
    setLoading(false)

    if (updateErr) {
      setError('Não foi possível redefinir a senha. O link pode ter expirado.')
      return
    }

    setSuccess(true)
    setTimeout(() => router.push('/dashboard'), 2500)
  }

  if (success) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center px-4">
        <div className="text-center max-w-md bg-surface border border-border rounded-[14px] shadow-soft-md p-10">
          <div className="w-12 h-12 rounded-full bg-ok/10 grid place-items-center mx-auto mb-4">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-ok">
              <path d="M20 6L9 17l-5-5"/>
            </svg>
          </div>
          <h2 className="font-display text-[22px] font-medium mb-2">Senha redefinida</h2>
          <p className="text-ink-3 text-[13px]">
            Sua senha foi atualizada com sucesso. Redirecionando para o painel…
          </p>
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
          <h2 className="font-display text-[22px] font-medium tracking-tight mb-1">Redefinir senha</h2>
          <p className="text-ink-3 text-[13px] mb-6">
            Escolha uma nova senha segura para sua conta.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[12px] font-medium text-ink-2 mb-1.5">Nova senha</label>
              <input
                type="password"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                required
                autoFocus
                className="w-full border border-border rounded-[10px] px-3 py-2.5 text-[13px] bg-surface outline-none transition-shadow focus:border-accent-strong focus:shadow-[0_0_0_3px_oklch(0.93_0.04_40)] placeholder:text-ink-3"
                placeholder="Mínimo 8 caracteres"
              />
              <PasswordStrength password={senha} />
            </div>

            <div>
              <label className="block text-[12px] font-medium text-ink-2 mb-1.5">Confirmar nova senha</label>
              <input
                type="password"
                value={confirma}
                onChange={(e) => setConfirma(e.target.value)}
                required
                className="w-full border border-border rounded-[10px] px-3 py-2.5 text-[13px] bg-surface outline-none transition-shadow focus:border-accent-strong focus:shadow-[0_0_0_3px_oklch(0.93_0.04_40)] placeholder:text-ink-3"
                placeholder="Repita a nova senha"
              />
              {confirma && senha !== confirma && (
                <p className="text-[11px] text-[oklch(0.50_0.20_25)] mt-1">As senhas não coincidem.</p>
              )}
            </div>

            {error && (
              <div className="bg-warn-soft border border-[oklch(0.85_0.06_75)] text-[oklch(0.45_0.1_65)] text-[13px] px-4 py-3 rounded-[10px]">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !isPasswordStrong(senha) || senha !== confirma}
              className="w-full bg-accent-strong hover:opacity-90 text-white font-semibold py-2.5 rounded-[10px] transition disabled:opacity-50 text-[13px]"
            >
              {loading ? 'Salvando...' : 'Salvar nova senha'}
            </button>

            <p className="text-center text-ink-3 text-[12px]">
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
