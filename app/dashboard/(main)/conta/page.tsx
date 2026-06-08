'use client'

import { useState, useEffect, Suspense } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Topbar from '@/components/Topbar'
import PasswordStrength, { isPasswordStrong } from '@/components/PasswordStrength'

function maskTelefone(v: string) {
  const d = v.replace(/\D/g, '').slice(0, 11)
  if (d.length <= 2)  return `(${d}`
  if (d.length <= 6)  return `(${d.slice(0, 2)}) ${d.slice(2)}`
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
}

function isTelefoneValido(v: string) {
  const d = v.replace(/\D/g, '')
  return d.length === 10 || d.length === 11
}

const INPUT_CLS = 'w-full border border-border rounded-[10px] px-3 py-2.5 text-[13px] bg-surface outline-none transition-shadow focus:border-accent-strong focus:shadow-[0_0_0_3px_oklch(0.93_0.04_40)] placeholder:text-ink-3'

export default function ContaPage() {
  // Dados pessoais
  const [email,         setEmail]         = useState('')
  const [nome,          setNome]           = useState('')
  const [telefone,      setTelefone]       = useState('')
  const [dadosLoading,  setDadosLoading]   = useState(false)
  const [dadosSuccess,  setDadosSuccess]   = useState(false)
  const [dadosError,    setDadosError]     = useState('')

  // Senha
  const [senhaAtual,    setSenhaAtual]     = useState('')
  const [novaSenha,     setNovaSenha]      = useState('')
  const [confirmaSenha, setConfirmaSenha]  = useState('')
  const [senhaLoading,  setSenhaLoading]   = useState(false)
  const [senhaSuccess,  setSenhaSuccess]   = useState(false)
  const [senhaError,    setSenhaError]     = useState('')

  const supabase = createClient()
  const router   = useRouter()

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { router.push('/auth/login'); return }
      setEmail(user.email ?? '')
      setNome((user.user_metadata?.nome as string | undefined) ?? '')
      setTelefone((user.user_metadata?.telefone as string | undefined) ?? '')
    })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleDados(e: React.FormEvent) {
    e.preventDefault()
    setDadosError('')
    setDadosSuccess(false)

    if (!nome.trim() || nome.trim().split(' ').length < 2) {
      setDadosError('Informe nome e sobrenome.')
      return
    }
    if (telefone && !isTelefoneValido(telefone)) {
      setDadosError('Telefone inválido. Inclua o DDD.')
      return
    }

    setDadosLoading(true)
    const { error } = await supabase.auth.updateUser({
      data: { nome: nome.trim(), telefone },
    })
    setDadosLoading(false)

    if (error) { setDadosError('Erro ao salvar. Tente novamente.'); return }
    setDadosSuccess(true)
    router.refresh()
  }

  async function handleSenha(e: React.FormEvent) {
    e.preventDefault()
    setSenhaError('')
    setSenhaSuccess(false)

    if (novaSenha !== confirmaSenha) {
      setSenhaError('A nova senha e a confirmação não coincidem.')
      return
    }
    if (!isPasswordStrong(novaSenha)) {
      setSenhaError('A nova senha não atende aos requisitos mínimos de segurança.')
      return
    }

    setSenhaLoading(true)
    const { error: signInErr } = await supabase.auth.signInWithPassword({ email, password: senhaAtual })
    if (signInErr) {
      setSenhaError('Senha atual incorreta.')
      setSenhaLoading(false)
      return
    }

    const { error: updateErr } = await supabase.auth.updateUser({ password: novaSenha })
    setSenhaLoading(false)

    if (updateErr) { setSenhaError('Não foi possível alterar a senha. Tente novamente.'); return }
    setSenhaSuccess(true)
    setSenhaAtual('')
    setNovaSenha('')
    setConfirmaSenha('')
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Topbar title="Minha Conta" />

      <div className="flex-1 p-6 max-w-lg space-y-6">

        {/* ── Dados pessoais ── */}
        <div className="bg-surface border border-border rounded-[14px] p-6">
          <h2 className="font-display text-[15px] font-medium mb-1">Dados pessoais</h2>
          <p className="text-ink-3 text-[13px] mb-5">Nome e telefone exibidos internamente no sistema.</p>

          <form onSubmit={handleDados} className="space-y-4">
            <div>
              <label className="block text-[12px] font-medium text-ink-2 mb-1.5">Email</label>
              <input
                type="email"
                value={email}
                disabled
                className="w-full border border-border rounded-[10px] px-3 py-2.5 text-[13px] bg-surface-2 text-ink-3 outline-none cursor-not-allowed"
              />
              <p className="text-[11px] text-ink-3 mt-1">O email não pode ser alterado.</p>
            </div>

            <div>
              <label className="block text-[12px] font-medium text-ink-2 mb-1.5">
                Nome completo <span className="text-[oklch(0.55_0.18_25)]">*</span>
              </label>
              <input
                type="text"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                required
                autoComplete="name"
                className={INPUT_CLS}
                placeholder="João Silva"
              />
            </div>

            <div>
              <label className="block text-[12px] font-medium text-ink-2 mb-1.5">Telefone / WhatsApp</label>
              <input
                type="tel"
                value={telefone}
                onChange={(e) => setTelefone(maskTelefone(e.target.value))}
                autoComplete="tel"
                className={INPUT_CLS}
                placeholder="(11) 99999-9999"
              />
              {telefone && !isTelefoneValido(telefone) && (
                <p className="text-[11px] text-[oklch(0.50_0.20_25)] mt-1">Número incompleto. Inclua o DDD.</p>
              )}
            </div>

            {dadosError && (
              <div className="bg-warn-soft border border-[oklch(0.85_0.06_75)] text-[oklch(0.45_0.1_65)] text-[13px] px-4 py-3 rounded-[10px]">
                {dadosError}
              </div>
            )}
            {dadosSuccess && (
              <div className="bg-ok/10 border border-ok/30 text-[oklch(0.40_0.20_155)] text-[13px] px-4 py-3 rounded-[10px]">
                Dados atualizados com sucesso.
              </div>
            )}

            <button
              type="submit"
              disabled={dadosLoading || !nome.trim()}
              className="bg-accent-strong hover:opacity-90 text-white font-semibold py-2.5 px-5 rounded-[10px] transition disabled:opacity-50 text-[13px]"
            >
              {dadosLoading ? 'Salvando...' : 'Salvar dados'}
            </button>
          </form>
        </div>

        {/* ── Alterar senha ── */}
        <div className="bg-surface border border-border rounded-[14px] p-6">
          <h2 className="font-display text-[15px] font-medium mb-1">Alterar senha</h2>
          <p className="text-ink-3 text-[13px] mb-5">
            Confirme sua senha atual antes de definir uma nova.
          </p>

          <form onSubmit={handleSenha} className="space-y-4">
            <div>
              <label className="block text-[12px] font-medium text-ink-2 mb-1.5">Senha atual</label>
              <input
                type="password"
                value={senhaAtual}
                onChange={(e) => setSenhaAtual(e.target.value)}
                required
                autoComplete="current-password"
                className={INPUT_CLS}
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
                  className={INPUT_CLS}
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
                  className={INPUT_CLS}
                  placeholder="Repita a nova senha"
                />
                {confirmaSenha && novaSenha !== confirmaSenha && (
                  <p className="text-[11px] text-[oklch(0.50_0.20_25)] mt-1">As senhas não coincidem.</p>
                )}
              </div>
            </div>

            {senhaError && (
              <div className="bg-warn-soft border border-[oklch(0.85_0.06_75)] text-[oklch(0.45_0.1_65)] text-[13px] px-4 py-3 rounded-[10px]">
                {senhaError}
              </div>
            )}
            {senhaSuccess && (
              <div className="bg-ok/10 border border-ok/30 text-[oklch(0.40_0.20_155)] text-[13px] px-4 py-3 rounded-[10px]">
                Senha alterada com sucesso.
              </div>
            )}

            <button
              type="submit"
              disabled={senhaLoading || !senhaAtual || !isPasswordStrong(novaSenha) || novaSenha !== confirmaSenha}
              className="bg-accent-strong hover:opacity-90 text-white font-semibold py-2.5 px-5 rounded-[10px] transition disabled:opacity-50 text-[13px]"
            >
              {senhaLoading ? 'Alterando...' : 'Alterar senha'}
            </button>
          </form>
        </div>

      </div>
    </div>
  )
}
