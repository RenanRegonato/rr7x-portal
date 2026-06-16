'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function NovaReleasePage() {
  const router = useRouter()
  const [version, setVersion] = useState('')
  const [title, setTitle] = useState('Plataforma atualizada')
  const [releaseDate, setReleaseDate] = useState(new Date().toISOString().slice(0, 10))
  const [newFeatures, setNewFeatures] = useState('')
  const [improvements, setImprovements] = useState('')
  const [fixes, setFixes] = useState('')
  const [published, setPublished] = useState(false)
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  async function save() {
    if (!version.trim()) { setErr('Informe a versão (ex.: 2026.06).'); return }
    setSaving(true)
    setErr('')
    const res = await fetch('/api/admin/releases', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        version, title, release_date: releaseDate,
        new_features: newFeatures, improvements, fixes, published,
      }),
    })
    setSaving(false)
    if (res.ok) {
      router.push('/dashboard/admin/releases')
    } else {
      const data = await res.json().catch(() => ({}))
      setErr(data.error || 'Erro ao salvar.')
    }
  }

  const field = 'w-full rounded-[10px] border border-border bg-bg px-3.5 py-2.5 text-[14px] text-ink focus:outline-none focus:border-border-strong'
  const ta = field + ' resize-y'

  return (
    <div className="min-h-screen bg-bg text-ink">
      <div className="max-w-2xl mx-auto px-6 py-8">
        <div className="flex items-center gap-2 text-[12px] text-ink-3 mb-1">
          <Link href="/dashboard/admin" className="hover:text-ink transition-colors">Admin</Link>
          <span>/</span>
          <Link href="/dashboard/admin/releases" className="hover:text-ink transition-colors">Versões</Link>
          <span>/</span>
          <span>Nova</span>
        </div>
        <h1 className="font-display text-[24px] font-medium text-ink mb-6">Nova versão</h1>

        {err && (
          <div className="mb-4 text-[13px] text-error bg-error-soft border border-error/20 px-4 py-2.5 rounded-[10px]">
            {err}
          </div>
        )}

        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[13px] font-medium text-ink mb-1.5">Versão *</label>
              <input value={version} onChange={(e) => setVersion(e.target.value)} placeholder="2026.06" className={field} />
            </div>
            <div>
              <label className="block text-[13px] font-medium text-ink mb-1.5">Data</label>
              <input type="date" value={releaseDate} onChange={(e) => setReleaseDate(e.target.value)} className={field} />
            </div>
          </div>

          <div>
            <label className="block text-[13px] font-medium text-ink mb-1.5">Título</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} className={field} />
          </div>

          <p className="text-[12px] text-ink-3 -mb-2">Uma linha por item nas listas abaixo.</p>

          <div>
            <label className="block text-[13px] font-medium text-ink mb-1.5">Novos recursos</label>
            <textarea rows={3} value={newFeatures} onChange={(e) => setNewFeatures(e.target.value)} className={ta} placeholder={'Kanban interativo no Invest Match\nMapa do Mercado na vitrine'} />
          </div>
          <div>
            <label className="block text-[13px] font-medium text-ink mb-1.5">Melhorias</label>
            <textarea rows={3} value={improvements} onChange={(e) => setImprovements(e.target.value)} className={ta} />
          </div>
          <div>
            <label className="block text-[13px] font-medium text-ink mb-1.5">Correções</label>
            <textarea rows={3} value={fixes} onChange={(e) => setFixes(e.target.value)} className={ta} />
          </div>

          <label className="flex items-center gap-2.5 text-[14px] text-ink cursor-pointer">
            <input type="checkbox" checked={published} onChange={(e) => setPublished(e.target.checked)} className="w-4 h-4 accent-[var(--accent-strong,#c04a2a)]" />
            Publicar agora (os clientes verão o aviso no próximo acesso)
          </label>

          <div className="flex items-center gap-3 pt-2">
            <button
              onClick={save}
              disabled={saving}
              className="text-[13px] font-semibold text-white px-5 py-2.5 rounded-[10px] bg-accent-strong hover:opacity-90 transition-opacity disabled:opacity-40"
            >
              {saving ? 'Salvando...' : 'Salvar versão'}
            </button>
            <Link href="/dashboard/admin/releases" className="text-[13px] text-ink-2 hover:text-ink">Cancelar</Link>
          </div>
        </div>
      </div>
    </div>
  )
}
