'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

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

export default function CompletarCadastroPage() {
  const [nome,     setNome]     = useState('')
  const [telefone, setTelefone] = useState('')
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState('')

  const supabase = createClient()
  const router   = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (!nome.trim() || nome.trim().split(' ').length < 2) {
      setError('Informe seu nome completo (nome e sobrenome).')
      return
    }
    if (!isTelefoneValido(telefone)) {
      setError('Informe um telefone válido com DDD.')
      return
    }

    setLoading(true)
    const { error: updateErr } = await supabase.auth.updateUser({
      data: { nome: nome.trim(), telefone },
    })

    if (updateErr) {
      setError('Erro ao salvar. Tente novamente.')
      setLoading(false)
      return
    }

    // Hard navigation garante que o middleware leia a sessão atualizada
    window.location.href = '/dashboard'
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
          {/* Step indicator */}
          <div className="flex items-center gap-2 mb-5">
            <div className="w-5 h-5 rounded-full bg-accent-strong grid place-items-center flex-none">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 6L9 17l-5-5"/>
              </svg>
            </div>
            <div className="h-px flex-1 bg-accent-strong/30"/>
            <div className="w-5 h-5 rounded-full border-2 border-accent-strong grid place-items-center flex-none">
              <div className="w-2 h-2 rounded-full bg-accent-strong"/>
            </div>
            <div className="h-px flex-1 bg-border"/>
            <div className="w-5 h-5 rounded-full border-2 border-border flex-none"/>
          </div>

          <h2 className="font-display text-[22px] font-medium tracking-tight mb-1">Complete seu cadastro</h2>
          <p className="text-ink-3 text-[13px] mb-6">
            Precisamos de mais alguns dados para liberar seu acesso ao painel.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[12px] font-medium text-ink-2 mb-1.5">
                Nome completo <span className="text-[oklch(0.55_0.18_25)]">*</span>
              </label>
              <input
                type="text"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                required
                autoFocus
                autoComplete="name"
                className="w-full border border-border rounded-[10px] px-3 py-2.5 text-[13px] bg-surface outline-none transition-shadow focus:border-accent-strong focus:shadow-[0_0_0_3px_oklch(0.93_0.04_40)] placeholder:text-ink-3"
                placeholder="João Silva"
              />
              <p className="text-[11px] text-ink-3 mt-1">Nome e sobrenome obrigatórios.</p>
            </div>

            <div>
              <label className="block text-[12px] font-medium text-ink-2 mb-1.5">
                Telefone / WhatsApp <span className="text-[oklch(0.55_0.18_25)]">*</span>
              </label>
              <input
                type="tel"
                value={telefone}
                onChange={(e) => setTelefone(maskTelefone(e.target.value))}
                required
                autoComplete="tel"
                className="w-full border border-border rounded-[10px] px-3 py-2.5 text-[13px] bg-surface outline-none transition-shadow focus:border-accent-strong focus:shadow-[0_0_0_3px_oklch(0.93_0.04_40)] placeholder:text-ink-3"
                placeholder="(11) 99999-9999"
              />
              {telefone && !isTelefoneValido(telefone) && (
                <p className="text-[11px] text-[oklch(0.50_0.20_25)] mt-1">
                  Número incompleto — inclua o DDD.
                </p>
              )}
            </div>

            {error && (
              <div className="bg-warn-soft border border-[oklch(0.85_0.06_75)] text-[oklch(0.45_0.1_65)] text-[13px] px-4 py-3 rounded-[10px]">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !nome.trim() || !isTelefoneValido(telefone)}
              className="w-full bg-accent-strong hover:opacity-90 text-white font-semibold py-2.5 rounded-[10px] transition disabled:opacity-50 text-[13px]"
            >
              {loading ? 'Salvando...' : 'Concluir e acessar o painel'}
            </button>
          </form>
        </div>

        <p className="text-center text-ink-3 text-[11px] mt-4">
          Você poderá editar esses dados depois em <strong>Minha Conta</strong>.
        </p>
      </div>
    </div>
  )
}
