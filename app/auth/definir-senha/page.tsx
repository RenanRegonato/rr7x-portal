'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import PasswordStrength, { isPasswordStrong } from '@/components/PasswordStrength'

export default function DefinirSenhaPage() {
  const [senha,    setSenha]    = useState('')
  const [confirma, setConfirma] = useState('')
  const [error,    setError]    = useState('')
  const [loading,  setLoading]  = useState(false)
  const [success,  setSuccess]  = useState(false)
  const [pronto,   setPronto]   = useState(false)

  const supabase = createClient()
  const router   = useRouter()

  // Convites usam fluxo de token direto (hash) — precisamos trocar explicitamente
  useEffect(() => {
    const hash = window.location.hash
    if (!hash) { setPronto(true); return }

    const params = new URLSearchParams(hash.replace('#', ''))
    const accessToken  = params.get('access_token')
    const refreshToken = params.get('refresh_token')

    if (accessToken && refreshToken) {
      supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken })
        .then(() => {
          // Limpa o hash da URL sem recarregar a página
          window.history.replaceState(null, '', window.location.pathname)
          setPronto(true)
        })
    } else {
      setPronto(true)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

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
      setError('Não foi possível definir a senha. Solicite um novo convite.')
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
          <h2 className="font-display text-[22px] font-medium mb-2">Tudo pronto!</h2>
          <p className="text-ink-3 text-[13px]">
            Sua senha foi criada. Redirecionando para o painel…
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
          <div className="inline-flex items-center gap-2.5 mb-3">
            <div className="w-8 h-8 rounded-lg bg-accent grid place-items-center font-display italic font-semibold text-[18px] text-accent-ink">
              o
            </div>
            <span className="font-display font-medium text-[24px] tracking-tight">Otto</span>
          </div>
          <p className="text-ink-3 text-[13px]">Deal intelligence · RR7x Capital Hub</p>
        </div>

        <div className="bg-surface border border-border rounded-[14px] shadow-soft-md p-8">
          <h2 className="font-display text-[22px] font-medium tracking-tight mb-1">Bem-vindo ao Otto</h2>
          <p className="text-ink-3 text-[13px] mb-6">
            Você foi convidado. Crie sua senha para acessar a plataforma.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[12px] font-medium text-ink-2 mb-1.5">Criar senha</label>
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
              <label className="block text-[12px] font-medium text-ink-2 mb-1.5">Confirmar senha</label>
              <input
                type="password"
                value={confirma}
                onChange={(e) => setConfirma(e.target.value)}
                required
                className="w-full border border-border rounded-[10px] px-3 py-2.5 text-[13px] bg-surface outline-none transition-shadow focus:border-accent-strong focus:shadow-[0_0_0_3px_oklch(0.93_0.04_40)] placeholder:text-ink-3"
                placeholder="Repita a senha"
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
              disabled={!pronto || loading || !isPasswordStrong(senha) || senha !== confirma}
              className="w-full bg-accent-strong hover:opacity-90 text-white font-semibold py-2.5 rounded-[10px] transition disabled:opacity-50 text-[13px]"
            >
              {loading ? 'Criando conta...' : 'Criar senha e acessar'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
