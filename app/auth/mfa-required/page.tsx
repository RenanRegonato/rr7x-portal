'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

type Step = 'loading' | 'enroll' | 'verify' | 'done' | 'error'

export default function MfaRequiredPage() {
  const supabase = createClient()
  const router   = useRouter()

  const [step,       setStep]       = useState<Step>('loading')
  const [factorId,   setFactorId]   = useState('')
  const [qrCode,     setQrCode]     = useState('')
  const [secret,     setSecret]     = useState('')
  const [code,       setCode]       = useState('')
  const [error,      setError]      = useState('')
  const [loading,    setLoading]    = useState(false)

  useEffect(() => {
    async function init() {
      // Se o usuário já tem MFA ativo (aal2), redireciona direto
      const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
      if (aal?.currentLevel === 'aal2') {
        router.replace('/dashboard/admin')
        return
      }

      // Inicia o processo de enrollment TOTP
      const { data, error: enrollErr } = await supabase.auth.mfa.enroll({ factorType: 'totp' })
      if (enrollErr || !data) {
        setError('Erro ao iniciar configuração de autenticação. Tente novamente.')
        setStep('error')
        return
      }

      setFactorId(data.id)
      setQrCode(data.totp.qr_code)    // SVG data URL do Supabase
      setSecret(data.totp.secret)     // Código manual para apps que não leem QR
      setStep('enroll')
    }
    init()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault()
    if (!code.trim() || code.length !== 6) {
      setError('Digite o código de 6 dígitos do seu autenticador.')
      return
    }
    setLoading(true)
    setError('')

    try {
      const { data: challenge } = await supabase.auth.mfa.challenge({ factorId })
      if (!challenge) throw new Error('Falha ao criar desafio MFA.')

      const { error: verifyErr } = await supabase.auth.mfa.verify({
        factorId,
        challengeId: challenge.id,
        code: code.trim(),
      })

      if (verifyErr) {
        setError('Código inválido. Verifique seu autenticador e tente novamente.')
        return
      }

      setStep('done')
      setTimeout(() => router.replace('/dashboard/admin'), 1500)
    } catch (e: any) {
      setError(e?.message ?? 'Erro inesperado.')
    } finally {
      setLoading(false)
    }
  }

  if (step === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg">
        <p className="text-ink-3 text-[14px]">Carregando...</p>
      </div>
    )
  }

  if (step === 'done') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg">
        <div className="text-center">
          <p className="text-[28px] font-display font-medium text-ink mb-2">Autenticação ativada</p>
          <p className="text-ink-3 text-[14px]">Redirecionando para o painel admin...</p>
        </div>
      </div>
    )
  }

  if (step === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg">
        <div className="text-center max-w-sm">
          <p className="text-[22px] font-display font-medium text-ink mb-2">Erro na configuração</p>
          <p className="text-ink-3 text-[14px] mb-6">{error}</p>
          <button
            onClick={() => { setStep('loading'); setError('') }}
            className="px-6 py-2 rounded-lg bg-cyan-500 text-white text-[14px] font-medium hover:bg-cyan-600 transition"
          >
            Tentar novamente
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <p className="text-[28px] font-display font-medium text-ink mb-2">
            Autenticação em dois fatores
          </p>
          <p className="text-ink-3 text-[14px]">
            O acesso ao painel admin requer verificação adicional. Configure seu autenticador para continuar.
          </p>
        </div>

        <div className="bg-surface border border-border rounded-2xl p-8">
          {/* Passo 1: escanear QR */}
          <div className="mb-6">
            <p className="text-[13px] font-medium text-ink mb-3">
              1. Escaneie o QR code com seu autenticador
            </p>
            {qrCode && (
              <div className="flex justify-center mb-4">
                <img
                  src={qrCode}
                  alt="QR Code para autenticador"
                  className="w-44 h-44 rounded-lg border border-border"
                />
              </div>
            )}
            <details className="text-[12px] text-ink-3 cursor-pointer">
              <summary className="hover:text-ink transition">Não consegue escanear? Use o código manual</summary>
              <code className="block mt-2 p-2 bg-bg rounded text-[11px] break-all select-all">
                {secret}
              </code>
            </details>
          </div>

          {/* Passo 2: digitar código */}
          <form onSubmit={handleVerify}>
            <p className="text-[13px] font-medium text-ink mb-3">
              2. Digite o código de 6 dígitos gerado pelo app
            </p>
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]{6}"
              maxLength={6}
              value={code}
              onChange={e => setCode(e.target.value.replace(/\D/g, ''))}
              placeholder="000000"
              className="w-full px-4 py-3 rounded-xl border border-border bg-bg text-ink text-center text-[20px] tracking-widest font-mono focus:outline-none focus:ring-2 focus:ring-cyan-500 mb-4"
            />

            {error && (
              <p className="text-red-500 text-[13px] mb-4 text-center">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading || code.length !== 6}
              className="w-full py-3 rounded-xl bg-cyan-500 text-white font-medium text-[14px] hover:bg-cyan-600 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              {loading ? 'Verificando...' : 'Ativar autenticação'}
            </button>
          </form>
        </div>

        <p className="text-center text-ink-3 text-[12px] mt-6">
          Apps compatíveis: Google Authenticator, Authy, 1Password, Microsoft Authenticator
        </p>
      </div>
    </div>
  )
}
