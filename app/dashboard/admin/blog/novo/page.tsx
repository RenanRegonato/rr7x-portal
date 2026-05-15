'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

const CATEGORIES = [
  'M&A', 'Crédito Estruturado', 'Valuation', 'Deal Intelligence',
  'Governança', 'Private Equity', 'Mercado de Capitais', 'Análise Financeira'
]

export default function NovoArtigoPage() {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [preview, setPreview] = useState(false)

  const [form, setForm] = useState({
    title: '',
    excerpt: '',
    content: '',
    cover_image_url: '',
    category: '',
    tags: '',
    author_name: 'Equipe Mandor',
    custom_slug: '',
    published: false,
    seo_title: '',
    seo_description: '',
    seo_keywords: '',
  })

  function set(field: keyof typeof form, value: string | boolean) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  async function save(publish: boolean) {
    setError('')
    if (!form.title.trim()) { setError('Título é obrigatório.'); return }
    if (!form.content.trim()) { setError('Conteúdo é obrigatório.'); return }

    setSaving(true)
    const tags = form.tags.split(',').map(t => t.trim()).filter(Boolean)

    const res = await fetch('/api/admin/blog', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, tags, published: publish }),
    })

    setSaving(false)
    if (!res.ok) {
      const data = await res.json()
      setError(data.error ?? 'Erro ao salvar.')
      return
    }

    const data = await res.json()
    router.push(`/dashboard/admin/blog/${data.post.id}`)
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
              <span>Novo artigo</span>
            </div>
            <h1 className="font-display text-[22px] font-medium text-ink">Novo artigo</h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPreview(!preview)}
              className="text-[12.5px] font-medium text-ink-2 px-3.5 py-2 rounded-[9px] border border-border hover:bg-surface-2 transition-colors"
            >
              {preview ? '← Editor' : 'Preview →'}
            </button>
            <button
              onClick={() => save(false)}
              disabled={saving}
              className="text-[12.5px] font-medium text-ink px-3.5 py-2 rounded-[9px] border border-border-strong hover:bg-surface-2 transition-colors disabled:opacity-40"
            >
              Salvar rascunho
            </button>
            <button
              onClick={() => save(true)}
              disabled={saving}
              className="text-[12.5px] font-semibold text-white px-4 py-2 rounded-[9px] bg-accent-strong hover:opacity-90 transition-opacity disabled:opacity-40"
            >
              {saving ? 'Salvando...' : 'Publicar'}
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-5 text-[13px] text-error bg-error/5 border border-error/20 px-4 py-3 rounded-[10px]">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-6">
          {/* Main editor */}
          <div className="space-y-5">
            {/* Title */}
            <div>
              <label className="block text-[12px] font-semibold text-ink-2 uppercase tracking-wider mb-1.5">
                Título *
              </label>
              <input
                type="text"
                value={form.title}
                onChange={e => set('title', e.target.value)}
                placeholder="Título do artigo"
                className="w-full bg-surface border border-border rounded-[10px] px-4 py-3 text-[16px] font-display text-ink placeholder:text-ink-3 focus:outline-none focus:border-accent transition-colors"
              />
            </div>

            {/* Excerpt */}
            <div>
              <label className="block text-[12px] font-semibold text-ink-2 uppercase tracking-wider mb-1.5">
                Resumo / Excerpt
              </label>
              <textarea
                value={form.excerpt}
                onChange={e => set('excerpt', e.target.value)}
                placeholder="Breve descrição que aparece nas listagens e no SEO (máx. 160 chars)"
                rows={2}
                maxLength={200}
                className="w-full bg-surface border border-border rounded-[10px] px-4 py-3 text-[14px] text-ink placeholder:text-ink-3 focus:outline-none focus:border-accent resize-none transition-colors"
              />
              <p className="text-[11px] text-ink-3 mt-1">{form.excerpt.length}/200 caracteres</p>
            </div>

            {/* Content */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[12px] font-semibold text-ink-2 uppercase tracking-wider">
                  Conteúdo (Markdown) *
                </label>
                <span className="text-[11px] text-ink-3">
                  {wordCount} palavras · ~{readTime} min de leitura
                </span>
              </div>
              {preview ? (
                <div className="bg-surface border border-border rounded-[10px] p-6 min-h-[400px] prose prose-sm max-w-none lp-prose">
                  {form.content || <span className="text-ink-3 italic">Sem conteúdo ainda.</span>}
                </div>
              ) : (
                <textarea
                  value={form.content}
                  onChange={e => set('content', e.target.value)}
                  placeholder={`## Título da seção\n\nEscreva o conteúdo em Markdown...\n\n**Negrito**, *itálico*, [links](url), listas, tabelas, etc.`}
                  rows={20}
                  className="w-full bg-surface border border-border rounded-[10px] px-4 py-3.5 text-[13.5px] font-mono text-ink placeholder:text-ink-3 focus:outline-none focus:border-accent resize-y transition-colors leading-relaxed"
                />
              )}
            </div>
          </div>

          {/* Sidebar */}
          <aside className="space-y-5">
            {/* Cover image */}
            <div className="bg-surface border border-border rounded-[12px] p-4">
              <label className="block text-[11.5px] font-semibold text-ink-2 uppercase tracking-wider mb-2">
                Imagem de capa
              </label>
              <input
                type="url"
                value={form.cover_image_url}
                onChange={e => set('cover_image_url', e.target.value)}
                placeholder="https://..."
                className="w-full bg-bg border border-border rounded-[8px] px-3 py-2 text-[12.5px] text-ink placeholder:text-ink-3 focus:outline-none focus:border-accent transition-colors"
              />
              {form.cover_image_url && (
                <img
                  src={form.cover_image_url}
                  alt=""
                  className="mt-2 rounded-[8px] w-full aspect-video object-cover"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                />
              )}
            </div>

            {/* Category */}
            <div className="bg-surface border border-border rounded-[12px] p-4">
              <label className="block text-[11.5px] font-semibold text-ink-2 uppercase tracking-wider mb-2">
                Categoria
              </label>
              <select
                value={form.category}
                onChange={e => set('category', e.target.value)}
                className="w-full bg-bg border border-border rounded-[8px] px-3 py-2 text-[12.5px] text-ink focus:outline-none focus:border-accent transition-colors"
              >
                <option value="">— Sem categoria —</option>
                {CATEGORIES.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              <input
                type="text"
                value={form.category}
                onChange={e => set('category', e.target.value)}
                placeholder="Ou digite uma nova..."
                className="mt-2 w-full bg-bg border border-border rounded-[8px] px-3 py-2 text-[12.5px] text-ink placeholder:text-ink-3 focus:outline-none focus:border-accent transition-colors"
              />
            </div>

            {/* Tags */}
            <div className="bg-surface border border-border rounded-[12px] p-4">
              <label className="block text-[11.5px] font-semibold text-ink-2 uppercase tracking-wider mb-2">
                Tags
              </label>
              <input
                type="text"
                value={form.tags}
                onChange={e => set('tags', e.target.value)}
                placeholder="ma, credito, valuation"
                className="w-full bg-bg border border-border rounded-[8px] px-3 py-2 text-[12.5px] text-ink placeholder:text-ink-3 focus:outline-none focus:border-accent transition-colors"
              />
              <p className="text-[11px] text-ink-3 mt-1">Separadas por vírgula</p>
            </div>

            {/* Author */}
            <div className="bg-surface border border-border rounded-[12px] p-4">
              <label className="block text-[11.5px] font-semibold text-ink-2 uppercase tracking-wider mb-2">
                Autor
              </label>
              <input
                type="text"
                value={form.author_name}
                onChange={e => set('author_name', e.target.value)}
                className="w-full bg-bg border border-border rounded-[8px] px-3 py-2 text-[12.5px] text-ink focus:outline-none focus:border-accent transition-colors"
              />
            </div>

            {/* Slug */}
            <div className="bg-surface border border-border rounded-[12px] p-4">
              <label className="block text-[11.5px] font-semibold text-ink-2 uppercase tracking-wider mb-2">
                URL personalizada
              </label>
              <input
                type="text"
                value={form.custom_slug}
                onChange={e => set('custom_slug', e.target.value)}
                placeholder="meu-artigo-incrivel"
                className="w-full bg-bg border border-border rounded-[8px] px-3 py-2 text-[12.5px] font-mono text-ink placeholder:text-ink-3 focus:outline-none focus:border-accent transition-colors"
              />
              <p className="text-[11px] text-ink-3 mt-1">Vazio = gerado do título</p>
            </div>

            {/* SEO */}
            <div className="bg-surface border border-border rounded-[12px] p-4 space-y-3">
              <p className="text-[11.5px] font-semibold text-ink-2 uppercase tracking-wider">SEO</p>
              <div>
                <label className="block text-[11px] text-ink-3 mb-1">Title tag</label>
                <input
                  type="text"
                  value={form.seo_title}
                  onChange={e => set('seo_title', e.target.value)}
                  placeholder="Deixe vazio para usar o título"
                  maxLength={70}
                  className="w-full bg-bg border border-border rounded-[8px] px-3 py-2 text-[12px] text-ink placeholder:text-ink-3 focus:outline-none focus:border-accent transition-colors"
                />
                <p className="text-[10.5px] text-ink-3 mt-0.5">{form.seo_title.length}/70</p>
              </div>
              <div>
                <label className="block text-[11px] text-ink-3 mb-1">Meta description</label>
                <textarea
                  value={form.seo_description}
                  onChange={e => set('seo_description', e.target.value)}
                  placeholder="Deixe vazio para usar o excerpt"
                  maxLength={160}
                  rows={3}
                  className="w-full bg-bg border border-border rounded-[8px] px-3 py-2 text-[12px] text-ink placeholder:text-ink-3 focus:outline-none focus:border-accent resize-none transition-colors"
                />
                <p className="text-[10.5px] text-ink-3 mt-0.5">{form.seo_description.length}/160</p>
              </div>
              <div>
                <label className="block text-[11px] text-ink-3 mb-1">Keywords</label>
                <input
                  type="text"
                  value={form.seo_keywords}
                  onChange={e => set('seo_keywords', e.target.value)}
                  placeholder="M&A, valuation, deal intelligence"
                  className="w-full bg-bg border border-border rounded-[8px] px-3 py-2 text-[12px] text-ink placeholder:text-ink-3 focus:outline-none focus:border-accent transition-colors"
                />
              </div>
            </div>

            {/* Actions mobile */}
            <div className="lg:hidden flex gap-2">
              <button
                onClick={() => save(false)}
                disabled={saving}
                className="flex-1 text-[13px] font-medium py-2.5 rounded-[9px] border border-border-strong hover:bg-surface-2 transition-colors disabled:opacity-40"
              >
                Salvar rascunho
              </button>
              <button
                onClick={() => save(true)}
                disabled={saving}
                className="flex-1 text-[13px] font-semibold text-white py-2.5 rounded-[9px] bg-accent-strong hover:opacity-90 disabled:opacity-40"
              >
                Publicar
              </button>
            </div>
          </aside>
        </div>
      </div>
    </div>
  )
}
