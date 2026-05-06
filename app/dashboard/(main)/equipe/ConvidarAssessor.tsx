'use client'

import { useState } from 'react'

export default function ConvidarAssessor() {
  const [open,     setOpen]     = useState(false)
  const [email,    setEmail]    = useState('')
  const [loading,  setLoading]  = useState(false)
  const [msg,      setMsg]      = useState('')
  const [isError,  setIsError]  = useState(false)

  async function convidar() {
    if (!email.trim()) return
    setLoading(true)
    setMsg('')
    const res = await fetch('/api/gerente/convidar', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ email: email.trim() }),
    })
    setLoading(false)
    if (res.ok) {
      setMsg(`Convite enviado para ${email}.`)
      setIsError(false)
      setEmail('')
    } else {
      const d = await res.json()
      setMsg(d.error ?? 'Erro ao enviar convite.')
      setIsError(true)
    }
  }

  return (
    <div>
      {!open ? (
        <button
          onClick={() => setOpen(true)}
          className="px-4 py-2.5 bg-accent-strong text-white rounded-[10px] text-[13px] font-semibold hover:opacity-90 transition"
        >
          + Convidar assessor
        </button>
      ) : (
        <div className="bg-surface border border-border rounded-[14px] p-5 shadow-soft-sm space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-[13px] font-semibold text-ink">Convidar assessor</p>
            <button
              onClick={() => { setOpen(false); setMsg(''); setEmail('') }}
              className="text-ink-3 hover:text-ink text-[13px] transition"
            >
              ✕
            </button>
          </div>
          <p className="text-[12px] text-ink-3">
            O assessor receberá um email com um link para acessar a plataforma e será vinculado ao seu escritório.
          </p>
          <div className="flex gap-2">
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && convidar()}
              placeholder="email@assessor.com.br"
              className="flex-1 border border-border rounded-[10px] px-3 py-2.5 text-[13px] bg-bg outline-none focus:border-accent-strong focus:shadow-[0_0_0_3px_oklch(0.93_0.04_40)] placeholder:text-ink-3 transition-shadow"
            />
            <button
              onClick={convidar}
              disabled={loading || !email.trim()}
              className="px-4 py-2.5 bg-accent-strong text-white rounded-[10px] text-[13px] font-semibold hover:opacity-90 disabled:opacity-50 transition shrink-0"
            >
              {loading ? '...' : 'Enviar'}
            </button>
          </div>
          {msg && (
            <p className={`text-[12px] ${isError ? 'text-warn' : 'text-ok'}`}>{msg}</p>
          )}
        </div>
      )}
    </div>
  )
}
