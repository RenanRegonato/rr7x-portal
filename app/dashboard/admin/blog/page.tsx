'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'

type Post = {
  id: string
  slug: string
  title: string
  excerpt: string | null
  category: string | null
  published: boolean
  published_at: string | null
  reading_time_minutes: number
  created_at: string
  updated_at: string
}

function formatDate(iso: string) {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric'
  }).format(new Date(iso))
}

export default function AdminBlogPage() {
  const [posts, setPosts] = useState<Post[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'published' | 'draft'>('all')
  const [deleting, setDeleting] = useState<string | null>(null)
  const [msg, setMsg] = useState('')

  const fetchPosts = useCallback(async () => {
    setLoading(true)
    const qs = filter !== 'all' ? `?published=${filter === 'published'}` : ''
    const res = await fetch(`/api/dashboard/admin/blog${qs}`)
    if (res.ok) {
      const data = await res.json()
      setPosts(data.posts ?? [])
      setTotal(data.total ?? 0)
    }
    setLoading(false)
  }, [filter])

  useEffect(() => { fetchPosts() }, [fetchPosts])

  async function togglePublish(post: Post) {
    const res = await fetch(`/api/dashboard/admin/blog/${post.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ published: !post.published }),
    })
    if (res.ok) {
      setMsg(post.published ? 'Despublicado.' : 'Publicado!')
      fetchPosts()
      setTimeout(() => setMsg(''), 3000)
    }
  }

  async function deletePost(id: string, title: string) {
    if (!confirm(`Excluir "${title}"? Esta ação não pode ser desfeita.`)) return
    setDeleting(id)
    const res = await fetch(`/api/dashboard/admin/blog/${id}`, { method: 'DELETE' })
    setDeleting(null)
    if (res.ok) {
      setMsg('Artigo excluído.')
      fetchPosts()
      setTimeout(() => setMsg(''), 3000)
    }
  }

  return (
    <div className="min-h-screen bg-bg text-ink">
      <div className="max-w-5xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="flex items-center gap-2 text-[12px] text-ink-3 mb-1">
              <Link href="/dashboard/admin" className="hover:text-ink transition-colors">Admin</Link>
              <span>/</span>
              <span>Blog</span>
            </div>
            <h1 className="font-display text-[24px] font-medium text-ink">
              Gerenciar Blog
            </h1>
            <p className="text-[13px] text-ink-3 mt-0.5">
              {total} {total === 1 ? 'artigo' : 'artigos'} no total
            </p>
          </div>
          <Link
            href="/dashboard/admin/blog/novo"
            className="inline-flex items-center gap-2 text-[13px] font-semibold text-white px-4 py-2.5 rounded-[10px] bg-accent-strong hover:opacity-90 transition-opacity"
          >
            + Novo artigo
          </Link>
        </div>

        {/* Feedback */}
        {msg && (
          <div className="mb-4 text-[13px] text-ok bg-ok-soft border border-ok/20 px-4 py-2.5 rounded-[10px]">
            {msg}
          </div>
        )}

        {/* Filters */}
        <div className="flex gap-2 mb-6">
          {(['all', 'published', 'draft'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`text-[12.5px] font-medium px-3.5 py-1.5 rounded-full border transition-colors ${
                filter === f
                  ? 'bg-accent text-white border-transparent'
                  : 'border-border text-ink-2 hover:border-border-strong'
              }`}
            >
              {f === 'all' ? 'Todos' : f === 'published' ? 'Publicados' : 'Rascunhos'}
            </button>
          ))}
        </div>

        {/* Table */}
        {loading ? (
          <div className="text-center py-16 text-ink-3 text-[14px]">Carregando...</div>
        ) : posts.length === 0 ? (
          <div className="text-center py-16 border border-border rounded-[14px] bg-surface">
            <p className="text-[15px] text-ink-3 mb-4">Nenhum artigo encontrado.</p>
            <Link
              href="/dashboard/admin/blog/novo"
              className="text-[13px] font-semibold text-accent-strong hover:underline"
            >
              Criar primeiro artigo →
            </Link>
          </div>
        ) : (
          <div className="rounded-[14px] border border-border overflow-hidden bg-surface">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b border-border bg-bg">
                  <th className="text-left px-4 py-3 font-semibold text-ink-3 text-[11px] uppercase tracking-wider">
                    Título
                  </th>
                  <th className="text-left px-3 py-3 font-semibold text-ink-3 text-[11px] uppercase tracking-wider hidden sm:table-cell">
                    Categoria
                  </th>
                  <th className="text-left px-3 py-3 font-semibold text-ink-3 text-[11px] uppercase tracking-wider hidden md:table-cell">
                    Status
                  </th>
                  <th className="text-left px-3 py-3 font-semibold text-ink-3 text-[11px] uppercase tracking-wider hidden lg:table-cell">
                    Data
                  </th>
                  <th className="px-3 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {posts.map((post) => (
                  <tr key={post.id} className="hover:bg-surface-hover transition-colors">
                    <td className="px-4 py-3.5">
                      <div>
                        <p className="font-medium text-ink leading-snug">{post.title}</p>
                        <p className="text-[11.5px] text-ink-3 mt-0.5">/{post.slug}</p>
                      </div>
                    </td>
                    <td className="px-3 py-3.5 hidden sm:table-cell">
                      {post.category ? (
                        <span className="text-[11px] bg-info-soft text-info px-2 py-0.5 rounded-full">
                          {post.category}
                        </span>
                      ) : (
                        <span className="text-ink-3">—</span>
                      )}
                    </td>
                    <td className="px-3 py-3.5 hidden md:table-cell">
                      <span
                        className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${
                          post.published
                            ? 'bg-ok-soft text-ok'
                            : 'bg-warn-soft text-warn'
                        }`}
                      >
                        {post.published ? 'Publicado' : 'Rascunho'}
                      </span>
                    </td>
                    <td className="px-3 py-3.5 text-ink-3 hidden lg:table-cell">
                      {post.published_at
                        ? formatDate(post.published_at)
                        : formatDate(post.created_at)}
                    </td>
                    <td className="px-3 py-3.5">
                      <div className="flex items-center gap-1 justify-end">
                        <Link
                          href={`/dashboard/admin/blog/${post.id}`}
                          className="text-[12px] font-medium text-ink-2 hover:text-ink px-2.5 py-1.5 rounded-[7px] hover:bg-surface-2 transition-colors"
                        >
                          Editar
                        </Link>
                        <button
                          onClick={() => togglePublish(post)}
                          className={`text-[12px] font-medium px-2.5 py-1.5 rounded-[7px] transition-colors ${
                            post.published
                              ? 'text-warn hover:bg-warn-soft'
                              : 'text-ok hover:bg-ok-soft'
                          }`}
                        >
                          {post.published ? 'Despublicar' : 'Publicar'}
                        </button>
                        <Link
                          href={`/blog/${post.slug}`}
                          target="_blank"
                          className="text-[12px] font-medium text-ink-3 hover:text-ink px-2.5 py-1.5 rounded-[7px] hover:bg-surface-2 transition-colors hidden sm:block"
                        >
                          Ver ↗
                        </Link>
                        <button
                          onClick={() => deletePost(post.id, post.title)}
                          disabled={deleting === post.id}
                          className="text-[12px] font-medium text-ink-3 hover:text-error px-2.5 py-1.5 rounded-[7px] hover:bg-surface-2 transition-colors disabled:opacity-40"
                        >
                          {deleting === post.id ? '...' : '✕'}
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
