'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'

type Release = {
  id: string
  version: string
  title: string
  release_date: string
  improvements: string[]
  new_features: string[]
  fixes: string[]
  published: boolean
  published_at: string | null
  created_at: string
}

function formatDate(iso: string) {
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
    .format(new Date(iso))
}

export default function AdminReleasesPage() {
  const [releases, setReleases] = useState<Release[]>([])
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [msg, setMsg] = useState('')

  const fetchReleases = useCallback(async () => {
    setLoading(true)
    const res = await fetch('/api/admin/releases')
    if (res.ok) {
      const data = await res.json()
      setReleases(data.releases ?? [])
    }
    setLoading(false)
  }, [])

  useEffect(() => { fetchReleases() }, [fetchReleases])

  async function togglePublish(r: Release) {
    const res = await fetch(`/api/admin/releases/${r.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ published: !r.published }),
    })
    if (res.ok) {
      setMsg(r.published ? 'Despublicada.' : 'Publicada! Os usuários verão o aviso no próximo acesso.')
      fetchReleases()
      setTimeout(() => setMsg(''), 4000)
    }
  }

  async function remove(id: string, version: string) {
    if (!confirm(`Excluir a versão ${version}? Esta ação não pode ser desfeita.`)) return
    setDeleting(id)
    const res = await fetch(`/api/admin/releases/${id}`, { method: 'DELETE' })
    setDeleting(null)
    if (res.ok) {
      setMsg('Versão excluída.')
      fetchReleases()
      setTimeout(() => setMsg(''), 3000)
    }
  }

  function count(r: Release) {
    return r.new_features.length + r.improvements.length + r.fixes.length
  }

  return (
    <div className="min-h-screen bg-bg text-ink">
      <div className="max-w-5xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="flex items-center gap-2 text-[12px] text-ink-3 mb-1">
              <Link href="/dashboard/admin" className="hover:text-ink transition-colors">Admin</Link>
              <span>/</span>
              <span>Versões</span>
            </div>
            <h1 className="font-display text-[24px] font-medium text-ink">Notas de versão</h1>
            <p className="text-[13px] text-ink-3 mt-0.5">
              O aviso "Plataforma Atualizada" mostrado aos clientes. A última versão publicada
              aparece uma vez por usuário.
            </p>
          </div>
          <Link
            href="/dashboard/admin/releases/nova"
            className="inline-flex items-center gap-2 text-[13px] font-semibold text-white px-4 py-2.5 rounded-[10px] bg-accent-strong hover:opacity-90 transition-opacity"
          >
            + Nova versão
          </Link>
        </div>

        {msg && (
          <div className="mb-4 text-[13px] text-ok bg-ok-soft border border-ok/20 px-4 py-2.5 rounded-[10px]">
            {msg}
          </div>
        )}

        {loading ? (
          <div className="text-center py-16 text-ink-3 text-[14px]">Carregando...</div>
        ) : releases.length === 0 ? (
          <div className="text-center py-16 border border-border rounded-[14px] bg-surface">
            <p className="text-[15px] text-ink-3 mb-4">Nenhuma versão cadastrada.</p>
            <Link href="/dashboard/admin/releases/nova" className="text-[13px] font-semibold text-accent-strong hover:underline">
              Criar primeira versão →
            </Link>
          </div>
        ) : (
          <div className="rounded-[14px] border border-border overflow-hidden bg-surface">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b border-border bg-bg">
                  <th className="text-left px-4 py-3 font-semibold text-ink-3 text-[11px] uppercase tracking-wider">Versão</th>
                  <th className="text-left px-3 py-3 font-semibold text-ink-3 text-[11px] uppercase tracking-wider hidden sm:table-cell">Itens</th>
                  <th className="text-left px-3 py-3 font-semibold text-ink-3 text-[11px] uppercase tracking-wider hidden md:table-cell">Status</th>
                  <th className="text-left px-3 py-3 font-semibold text-ink-3 text-[11px] uppercase tracking-wider hidden lg:table-cell">Data</th>
                  <th className="px-3 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {releases.map((r) => (
                  <tr key={r.id} className="hover:bg-surface-hover transition-colors">
                    <td className="px-4 py-3.5">
                      <p className="font-medium text-ink leading-snug">v{r.version}</p>
                      <p className="text-[11.5px] text-ink-3 mt-0.5">{r.title}</p>
                    </td>
                    <td className="px-3 py-3.5 hidden sm:table-cell text-ink-2">{count(r)} item(ns)</td>
                    <td className="px-3 py-3.5 hidden md:table-cell">
                      <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${r.published ? 'bg-ok-soft text-ok' : 'bg-warn-soft text-warn'}`}>
                        {r.published ? 'Publicada' : 'Rascunho'}
                      </span>
                    </td>
                    <td className="px-3 py-3.5 text-ink-3 hidden lg:table-cell">
                      {formatDate(r.published_at ?? r.created_at)}
                    </td>
                    <td className="px-3 py-3.5">
                      <div className="flex items-center gap-1 justify-end">
                        <button
                          onClick={() => togglePublish(r)}
                          className={`text-[12px] font-medium px-2.5 py-1.5 rounded-[7px] transition-colors ${r.published ? 'text-warn hover:bg-warn-soft' : 'text-ok hover:bg-ok-soft'}`}
                        >
                          {r.published ? 'Despublicar' : 'Publicar'}
                        </button>
                        <button
                          onClick={() => remove(r.id, r.version)}
                          disabled={deleting === r.id}
                          className="text-[12px] font-medium text-ink-3 hover:text-error px-2.5 py-1.5 rounded-[7px] hover:bg-surface-2 transition-colors disabled:opacity-40"
                        >
                          {deleting === r.id ? '...' : '✕'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
