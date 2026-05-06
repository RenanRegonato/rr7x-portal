'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Topbar from '@/components/Topbar'
import PasswordStrength, { isPasswordStrong } from '@/components/PasswordStrength'

export default function ContaPage() {
  const [email,         setEmail]        = useState('')
  const [nome,          setNome]          = useState('')
  const [senhaAtual,    setSenhaAtual]    = useState('')
  const [novaSenha,     setNovaSenha]     = useState('')
  const [confirmaSenha, setConfirmaSenha] = useState('')
  const [loading,       setLoading]       = useState(false)
  const [success,       setSuccess]       = useState(false)
  const [error,         setError]         = useState('')

  const supabase = createClient()
  const router   = useRouter()

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { router.push('/auth/login'); return }
      setEmail(user.email ?? '')
      setNome((user.user_metadata?.nome as string | undefined) ?? '')
    })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSuccess(false)

    if (novaSenha !== confirmaSenha) {
      setError('A nova senha e a confirmação não coincidem.')
      return
    }
    if (!isPasswordStrong(novaSenha)) {
      setError('A nova senha não atende aos requisitos mínimos de segurança.')
      return
    }

    setLoading(true)

    // Verify current password by re-authenticating
    const { error: signInErr } = await supabase.auth.signInWithPassword({
      email,
      password: senhaAtual,
    })

    if (signInErr) {
      setError('Senha atual incorreta.')
      setLoading(false)
      return
    }

    // Update to new password
    const { error: updateErr } = await supabase.auth.updateUser({ password: novaSenha })
    setLoading(false)

    if (updateErr) {
      setError('Não foi possível alterar a senha. Tente novamente.')
      return
    }

    setSuccess(true)
    setSenhaAtual('')
    setNovaSenha('')
    setConfirmaSenha('')
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Topbar title="Minha Conta" />

      <div className="flex-1 p-6 max-w-lg">
        {/* User info */}
        <div className="bg-surface border border-border rounded-[14px] p-6 mb-6">
          <h2 className="font-display text-[15px] font-medium mb-4">Informações da conta</h2>
          <div className="space-y-3">
            <div>
              <p className="text-[11px] font-medium text-ink-3 uppercase tracking-wider mb-0.5">Nome</p>
              <p className="text-[14px] text-ink">{nome || '—'}</p>
            </div>
            <div>
              <p className="text-[11px] font-medium text-ink-3 uppercase tracking-wider mb-0.5">Email</p>
              <p className="text-[14px] text-ink">{email || '—'}</p>
            </div>
          </div>
        </div>

        {/* Password change */}
        <div className="bg-surface border border-border rounded-[14px] p-6">
          <h2 className="font-display text-[15px] font-medium mb-1">Alterar senha</h2>
          <p className="text-ink-3 text-[13px] mb-5">
            Confirme sua senha atual antes de definir uma nova.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[12px] font-medium text-ink-2 mb-1.5">Senha atual</label>
              <input
                type="password"
                value={senhaAtual}
                onChange={(e) => setSenhaAtual(e.target.value)}
                required
                autoComplete="current-password"
                className="w-full border border-border rounded-[10px] px-3 py-2.5 text-[13px] bg-surface outline-none transition-shadow focus:border-accent-strong focus:shadow-[0_0_0_3px_oklch(0.93_0.04_40)] placeholder:text-ink-3"
                placeholder="Sua senha atual"
              />
            </div>

            <div className="pt-2 border-t border-border">
              <div>
                <label className="block text-[12px] font-medium text-ink-2 mb-1.5">Nova senha</label>
                <input
                  type="password"
                  value={novaSenha}
                  onChange={(e) => setNovaSenha(e.target.value)}
                  required
                  autoComplete="new-password"
                  className="w-full border border-border rounded-[10px] px-3 py-2.5 text-[13px] bg-surface outline-none transition-shadow focus:border-accent-strong focus:shadow-[0_0_0_3px_oklch(0.93_0.04_40)] placeholder:text-ink-3"
                  placeholder="Mínimo 8 caracteres"
                />
                <PasswordStrength password={novaSenha} />
              </div>

              <div className="mt-4">
                <label className="block text-[12px] font-medium text-ink-2 mb-1.5">Confirmar nova senha</label>
                <input
                  type="password"
                  value={confirmaSenha}
                  onChange={(e) => setConfirmaSenha(e.target.value)}
                  required
                  autoComplete="new-password"
                  className="w-full border border-border rounded-[10px] px-3 py-2.5 text-[13px] bg-surface outline-none transition-shadow focus:border-accent-strong focus:shadow-[0_0_0_3px_oklch(0.93_0.04_40)] placeholder:text-ink-3"
                  placeholder="Repita a nova senha"
                />
                {confirmaSenha && novaSenha !== confirmaSenha && (
                  <p className="text-[11px] text-[oklch(0.50_0.20_25)] mt-1">As senhas não coincidem.</p>
                )}
              </div>
            </div>

            {error && (
              <div className="bg-warn-soft border border-[oklch(0.85_0.06_75)] text-[oklch(0.45_0.1_65)] text-[13px] px-4 py-3 rounded-[10px]">
                {error}
              </div>
            )}

            {success && (
              <div className="bg-ok/10 border border-ok/30 text-[oklch(0.40_0.20_155)] text-[13px] px-4 py-3 rounded-[10px]">
                Senha alterada com sucesso.
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !senhaAtual || !isPasswordStrong(novaSenha) || novaSenha !== confirmaSenha}
              className="bg-accent-strong hover:opacity-90 text-white font-semibold py-2.5 px-5 rounded-[10px] transition disabled:opacity-50 text-[13px]"
            >
              {loading ? 'Alterando...' : 'Alterar senha'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
