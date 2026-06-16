'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'

export default function AdminManutencaoPage() {
  const [enabled, setEnabled] = useState(false)
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')

  const fetchState = useCallback(async () => {
    setLoading(true)
    const res = await fetch('/api/admin/settings')
    if (res.ok) {
      const data = await res.json()
      setEnabled(data.maintenance?.enabled === true)
      setMessage(data.maintenance?.message ?? '')
    }
    setLoading(false)
  }, [])

  useEffect(() => { fetchState() }, [fetchState])

  async function save(next: { enabled?: boolean; message?: string }) {
    setSaving(true)
    const payload = { enabled, message, ...next }
    const res = await fetch('/api/admin/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    setSaving(false)
    if (res.ok) {
      const data = await res.json()
      setEnabled(data.maintenance?.enabled === true)
      setMessage(data.maintenance?.message ?? '')
      setMsg('Salvo. A mudança propaga em até ~30s (cache do middleware).')
      setTimeout(() => setMsg(''), 4000)
    } else {
      setMsg('Erro ao salvar.')
      setTimeout(() => setMsg(''), 4000)
    }
  }

  return (
    <div className="min-h-screen bg-bg text-ink">
      <div className="max-w-3xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 text-[12px] text-ink-3 mb-1">
            <Link href="/dashboard/admin" className="hover:text-ink transition-colors">Admin</Link>
            <span>/</span>
            <span>Manutenção</span>
          </div>
          <h1 className="font-display text-[24px] font-medium text-ink">Modo manutenção</h1>
          <p className="text-[13px] text-ink-3 mt-0.5">
            Quando ligado, os clientes veem a página de manutenção. A equipe (admin) continua
            acessando o dashboard normalmente.
          </p>
        </div>

        {msg && (
          <div className="mb-4 text-[13px] text-ok bg-ok-soft border border-ok/20 px-4 py-2.5 rounded-[10px]">
            {msg}
          </div>
        )}

        {loading ? (
          <div className="text-center py-16 text-ink-3 text-[14px]">Carregando...</div>
        ) : (
          <div className="rounded-[14px] border border-border bg-surface p-6 space-y-6">
            {/* Toggle */}
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-ink text-[15px]">Status</p>
                <p className="text-[12.5px] text-ink-3 mt-0.5">
                  {enabled ? 'Manutenção ATIVA — clientes bloqueados.' : 'Plataforma no ar normalmente.'}
                </p>
              </div>
              <button
                onClick={() => save({ enabled: !enabled })}
                disabled={saving}
                className={`text-[13px] font-semibold px-4 py-2.5 rounded-[10px] transition-opacity disabled:opacity-40 ${
                  enabled
                    ? 'bg-warn-soft text-warn border border-warn/30'
                    : 'bg-accent-strong text-white hover:opacity-90'
                }`}
              >
                {enabled ? 'Desligar manutenção' : 'Ligar manutenção'}
              </button>
            </div>

            {/* Mensagem */}
            <div>
              <label className="block text-[13px] font-medium text-ink mb-1.5">
                Mensagem exibida ao cliente (opcional)
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={3}
                maxLength={500}
                placeholder="Ex.: Estamos aplicando uma atualização. Voltamos às 23h."
                className="w-full rounded-[10px] border border-border bg-bg px-3.5 py-2.5 text-[14px] text-ink resize-y focus:outline-none focus:border-border-strong"
              />
              <div className="flex justify-end mt-2">
                <button
                  onClick={() => save({})}
                  disabled={saving}
                  className="text-[13px] font-semibold text-white px-4 py-2 rounded-[10px] bg-accent hover:opacity-90 transition-opacity disabled:opacity-40"
                >
                  Salvar mensagem
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
