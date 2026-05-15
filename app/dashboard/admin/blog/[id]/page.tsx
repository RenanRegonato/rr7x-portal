'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'

const CATEGORIES = [
  'M&A', 'Crédito Estruturado', 'Valuation', 'Deal Intelligence',
  'Governança', 'Private Equity', 'Mercado de Capitais', 'Análise Financeira'
]

type Post = {
  id: string
  slug: string
  title: string
  excerpt: string | null
  content: string
  cover_image_url: string | null
  category: string | null
  tags: string[]
  author_name: string
  author_avatar_url: string | null
  published: boolean
  published_at: string | null
  seo_title: string | null
  seo_description: string | null
  seo_keywords: string | null
}

export default function EditarArtigoPage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string

  const [post, setPost] = useState<Post | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [preview, setPreview] = useState(false)

  const [form, setForm] = useState({
    title: '',
    excerpt: '',
    content: '',
    cover_image_url: '',
    category: '',
    tags: '',
    author_name: '',
    slug: '',
    published: false,
    seo_title: '',
    seo_description: '',
    seo_keywords: '',
  })

  useEffect(() => {
    async function load() {
      const res = await fetch(`/api/admin/blog/${id}`)
      if (!res.ok) { router.push('/dashboard/admin/blog'); return }
      const data = await res.json()
      const p: Post = data.post
      setPost(p)
      setForm({
        title: p.title,
        excerpt: p.excerpt ?? '',
        content: p.content,
        cover_image_url: p.cover_image_url ?? '',
        category: p.category ?? '',
        tags: p.tags.join(', '),
        author_name: p.author_name,
        slug: p.slug,
        published: p.published,
        seo_title: p.seo_title ?? '',
        seo_description: p.seo_description ?? '',
        seo_keywords: p.seo_keywords ?? '',
      })
      setLoading(false)
    }
    load()
  }, [id, router])

  function set(field: keyof typeof form, value: string | boolean) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  async function save(publishOverride?: boolean) {
    setError('')
    setSuccess('')
    if (!form.title.trim()) { setError('Título é obrigatório.'); return }
    if (!form.content.trim()) { setError('Conteúdo é obrigatório.'); return }

    setSaving(true)
    const tags = form.tags.split(',').map(t => t.trim()).filter(Boolean)
    const published = publishOverride !== undefined ? publishOverride : form.published

    const res = await fetch(`/api/admin/blog/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, tags, published }),
    })

    setSaving(false)
    if (!res.ok) {
      const data = await res.json()
      setError(data.error ?? 'Erro ao salvar.')
      return
    }

    const data = await res.json()
    setPost(data.post)
    setForm(prev => ({ ...prev, published: data.post.published, slug: data.post.slug }))
    setSuccess('Salvo com sucesso!')
    setTimeout(() => setSuccess(''), 3000)
  }

  async function del() {
    if (!confirm('Excluir este artigo? Esta ação não pode ser desfeita.')) return
    await fetch(`/api/admin/blog/${id}`, { method: 'DELETE' })
    router.push('/dashboard/admin/blog')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center text-ink-3 text-[14px]">
        Carregando...
      </div>
    )
  }

  const wordCount = form.content.trim().split(/\s+/).filter(Boolean).length
  const readTime = Math.max(1, Math.ceil(wordCount / 200))

  return (
    <div className="min-h-screen bg-bg text-ink">
      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="flex items-center gap-2 text-[12px] text-ink-3 mb-1">
              <Link href="/dashboard/admin" className="hover:text-ink">Admin</Link>
              <span>/</span>
              <Link href="/dashboard/admin/blog" className="hover:text-ink">Blog</Link>
              <span>/</span>
              <span>Editar</span>
            </div>
            <h1 className="font-display text-[22px] font-medium text-ink line-clamp-1">
              {post?.title || 'Editar artigo'}
            </h1>
            <div className="flex items-center gap-2 mt-0.5">
              <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${
                form.published ? 'bg-ok-soft text-ok' : 'bg-warn-soft text-warn'
              }`}>
                {form.published ? 'Publicado' : 'Rascunho'}
              </span>
              <span className="text-[11.5px] text-ink-3">/{form.slug}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPreview(!preview)}
              className="text-[12.5px] font-medium text-ink-2 px-3.5 py-2 rounded-[9px] border border-border hover:bg-surface-2 transition-colors"
            >
              {preview ? '← Editor' : 'Preview →'}
            </button>
            {form.published && post && (
              <Link
                href={`/blog/${post.slug}`}
                target="_blank"
                className="text-[12.5px] font-medium text-ink-2 px-3.5 py-2 rounded-[9px] border border-border hover:bg-surface-2 transition-colors"
              >
                Ver ↗
              </Link>
            )}
            <button
              onClick={() => save()}
              disabled={saving}
              className="text-[12.5px] font-medium px-3.5 py-2 rounded-[9px] border border-border-strong hover:bg-surface-2 transition-colors disabled:opacity-40"
            >
              {saving ? 'Salvando...' : 'Salvar'}
            </button>
            {!form.published ? (
              <button
                onClick={() => save(true)}
                disabled={saving}
                className="text-[12.5px] font-semibold text-white px-4 py-2 rounded-[9px] bg-accent-strong hover:opacity-90 disabled:opacity-40"
              >
                Publicar
              </button>
            ) : (
              <button
                onClick={() => save(false)}
                disabled={saving}
                className="text-[12.5px] font-medium text-warn px-3.5 py-2 rounded-[9px] hover:bg-warn-soft transition-colors disabled:opacity-40"
              >
                Despublicar
              </button>
            )}
          </div>
        </div>

        {error && (
          <div className="mb-4 text-[13px] text-error bg-error/5 border border-error/20 px-4 py-3 rounded-[10px]">
            {error}
          </div>
        )}
        {success && (
          <div className="mb-4 text-[13px] text-ok bg-ok-soft border border-ok/20 px-4 py-3 rounded-[10px]">
            {success}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-6">
          {/* Main editor */}
          <div className="space-y-5">
            <div>
              <label className="block text-[12px] font-semibold text-ink-2 uppercase tracking-wider mb-1.5">Título *</label>
              <input
                type="text"
                value={form.title}
                onChange={e => set('title', e.target.value)}
                className="w-full bg-surface border border-border rounded-[10px] px-4 py-3 text-[16px] font-display text-ink focus:outline-none focus:border-accent transition-colors"
              />
            </div>

            <div>
              <label className="block text-[12px] font-semibold text-ink-2 uppercase tracking-wider mb-1.5">Resumo</label>
              <textarea
                value={form.excerpt}
                onChange={e => set('excerpt', e.target.value)}
                rows={2}
                maxLength={200}
                className="w-full bg-surface border border-border rounded-[10px] px-4 py-3 text-[14px] text-ink focus:outline-none focus:border-accent resize-none transition-colors"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[12px] font-semibold text-ink-2 uppercase tracking-wider">Conteúdo *</label>
                <span className="text-[11px] text-ink-3">{wordCount} palavras · ~{readTime} min</span>
              </div>
              {preview ? (
                <div className="bg-surface border border-border rounded-[10px] p-6 min-h-[400px] lp-prose">
                  <pre className="whitespace-pre-wrap font-sans text-[14px]">{form.content || <span className="text-ink-3 italic">Sem conteúdo.</span>}</pre>
                </div>
              ) : (
                <textarea
                  value={form.content}
                  onChange={e => set('content', e.target.value)}
                  rows={22}
                  className="w-full bg-surface border border-border rounded-[10px] px-4 py-3.5 text-[13.5px] font-mono text-ink focus:outline-none focus:border-accent resize-y transition-colors leading-relaxed"
                />
              )}
            </div>
          </div>

          {/* Sidebar */}
          <aside className="space-y-5">
            <div className="bg-surface border border-border rounded-[12px] p-4">
              <label className="block text-[11.5px] font-semibold text-ink-2 uppercase tracking-wider mb-2">Imagem de capa</label>
              <input
                type="url"
                value={form.cover_image_url}
                onChange={e => set('cover_image_url', e.target.value)}
                placeholder="https://..."
                className="w-full bg-bg border border-border rounded-[8px] px-3 py-2 text-[12.5px] text-ink placeholder:text-ink-3 focus:outline-none focus:border-accent transition-colors"
              />
              {form.cover_image_url && (
                <img src={form.cover_image_url} alt="" className="mt-2 rounded-[8px] w-full aspect-video object-cover"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
              )}
            </div>

            <div className="bg-surface border border-border rounded-[12px] p-4 space-y-2">
              <label className="block text-[11.5px] font-semibold text-ink-2 uppercase tracking-wider">Categoria</label>
              <select value={form.category} onChange={e => set('category', e.target.value)}
                className="w-full bg-bg border border-border rounded-[8px] px-3 py-2 text-[12.5px] text-ink focus:outline-none focus:border-accent">
                <option value="">— Sem categoria —</option>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <input type="text" value={form.category} onChange={e => set('category', e.target.value)}
                placeholder="Ou digite uma nova..."
                className="w-full bg-bg border border-border rounded-[8px] px-3 py-2 text-[12.5px] text-ink placeholder:text-ink-3 focus:outline-none focus:border-accent transition-colors" />
            </div>

            <div className="bg-surface border border-border rounded-[12px] p-4">
              <label className="block text-[11.5px] font-semibold text-ink-2 uppercase tracking-wider mb-2">Tags</label>
              <input type="text" value={form.tags} onChange={e => set('tags', e.target.value)}
                placeholder="ma, credito, valuation"
                className="w-full bg-bg border border-border rounded-[8px] px-3 py-2 text-[12.5px] text-ink placeholder:text-ink-3 focus:outline-none focus:border-accent transition-colors" />
              <p className="text-[11px] text-ink-3 mt-1">Separadas por vírgula</p>
            </div>

            <div className="bg-surface border border-border rounded-[12px] p-4">
              <label className="block text-[11.5px] font-semibold text-ink-2 uppercase tracking-wider mb-2">URL (slug)</label>
              <input type="text" value={form.slug} onChange={e => set('slug', e.target.value)}
                className="w-full bg-bg border border-border rounded-[8px] px-3 py-2 text-[12.5px] font-mono text-ink focus:outline-none focus:border-accent transition-colors" />
            </div>

            <div className="bg-surface border border-border rounded-[12px] p-4">
              <label className="block text-[11.5px] font-semibold text-ink-2 uppercase tracking-wider mb-2">Autor</label>
              <input type="text" value={form.author_name} onChange={e => set('author_name', e.target.value)}
                className="w-full bg-bg border border-border rounded-[8px] px-3 py-2 text-[12.5px] text-ink focus:outline-none focus:border-accent transition-colors" />
            </div>

            <div className="bg-surface border border-border rounded-[12px] p-4 space-y-3">
              <p className="text-[11.5px] font-semibold text-ink-2 uppercase tracking-wider">SEO</p>
              <div>
                <label className="block text-[11px] text-ink-3 mb-1">Title tag</label>
                <input type="text" value={form.seo_title} onChange={e => set('seo_title', e.target.value)}
                  maxLength={70} placeholder="Vazio = título do artigo"
                  className="w-full bg-bg border border-border rounded-[8px] px-3 py-2 text-[12px] text-ink placeholder:text-ink-3 focus:outline-none focus:border-accent transition-colors" />
                <p className="text-[10.5px] text-ink-3 mt-0.5">{form.seo_title.length}/70</p>
              </div>
              <div>
                <label className="block text-[11px] text-ink-3 mb-1">Meta description</label>
                <textarea value={form.seo_description} onChange={e => set('seo_description', e.target.value)}
                  maxLength={160} rows={3} placeholder="Vazio = excerpt"
                  className="w-full bg-bg border border-border rounded-[8px] px-3 py-2 text-[12px] text-ink placeholder:text-ink-3 focus:outline-none focus:border-accent resize-none transition-colors" />
                <p className="text-[10.5px] text-ink-3 mt-0.5">{form.seo_description.length}/160</p>
              </div>
              <div>
                <label className="block text-[11px] text-ink-3 mb-1">Keywords</label>
                <input type="text" value={form.seo_keywords} onChange={e => set('seo_keywords', e.target.value)}
                  placeholder="M&A, valuation, deal intelligence"
                  className="w-full bg-bg border border-border rounded-[8px] px-3 py-2 text-[12px] text-ink placeholder:text-ink-3 focus:outline-none focus:border-accent transition-colors" />
              </div>
            </div>

            {/* Danger zone */}
            <div className="bg-surface border border-error/20 rounded-[12px] p-4">
              <p className="text-[11.5px] font-semibold text-ink-2 uppercase tracking-wider mb-2">Zona de perigo</p>
              <button onClick={del} className="text-[12.5px] font-medium text-error hover:underline">
                Excluir artigo permanentemente
              </button>
            </div>
          </aside>
        </div>
      </div>
    </div>
  )
}
