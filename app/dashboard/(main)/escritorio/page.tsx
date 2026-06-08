'use client'

import { useState, useEffect, useRef } from 'react'
import Topbar from '@/components/Topbar'
import { IconBuilding } from '@/components/Icons'

interface Escritorio {
  nome:          string
  cnpj:          string
  endereco:      string
  cidade_uf:     string
  telefone:      string
  email_contato: string
  site:          string
  tagline:       string
  logo_url:      string
}

const EMPTY: Escritorio = {
  nome: '', cnpj: '', endereco: '', cidade_uf: '',
  telefone: '', email_contato: '', site: '', tagline: '', logo_url: '',
}

function maskCNPJ(v: string) {
  const d = v.replace(/\D/g, '').slice(0, 14)
  if (d.length <= 2)  return d
  if (d.length <= 5)  return `${d.slice(0,2)}.${d.slice(2)}`
  if (d.length <= 8)  return `${d.slice(0,2)}.${d.slice(2,5)}.${d.slice(5)}`
  if (d.length <= 12) return `${d.slice(0,2)}.${d.slice(2,5)}.${d.slice(5,8)}/${d.slice(8)}`
  return `${d.slice(0,2)}.${d.slice(2,5)}.${d.slice(5,8)}/${d.slice(8,12)}-${d.slice(12)}`
}

function isCNPJValid(cnpj: string | null | undefined) {
  if (!cnpj) return true
  const d = cnpj.replace(/\D/g, '')
  return d.length === 0 || d.length === 14
}

function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <div>
      <label className="block text-[12px] font-medium text-ink-2 mb-1.5">{label}</label>
      {children}
      {hint && <p className="text-[11px] text-ink-3 mt-1">{hint}</p>}
    </div>
  )
}

function Input({ value, onChange, placeholder, type = 'text' }: {
  value: string; onChange: (v: string) => void; placeholder?: string; type?: string
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full border border-border rounded-[10px] px-3 py-2.5 text-[13px] bg-surface outline-none transition-shadow focus:border-accent-strong focus:shadow-[0_0_0_3px_oklch(0.93_0.04_40)] placeholder:text-ink-3"
    />
  )
}

export default function EscritorioPage() {
  const [form, setForm]           = useState<Escritorio>(EMPTY)
  const [loading, setLoading]     = useState(true)
  const [saving, setSaving]       = useState(false)
  const [msg, setMsg]             = useState('')
  const [msgIsError, setMsgIsError] = useState(false)
  const [uploading,     setUploading]     = useState(false)
  const [logoSuccess,   setLogoSuccess]   = useState(false)
  const [cnpjError,     setCnpjError]     = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetch('/api/escritorio')
      .then(r => r.json())
      .then(d => {
        if (d.escritorio) {
          const e = d.escritorio
          setForm({
            nome:          e.nome          ?? '',
            cnpj:          e.cnpj          ?? '',
            endereco:      e.endereco      ?? '',
            cidade_uf:     e.cidade_uf     ?? '',
            telefone:      e.telefone      ?? '',
            email_contato: e.email_contato ?? '',
            site:          e.site          ?? '',
            tagline:       e.tagline       ?? '',
            logo_url:      e.logo_url      ?? '',
          })
        }
      })
      .finally(() => setLoading(false))
  }, [])

  function set(key: keyof Escritorio) {
    return (v: string) => setForm(prev => ({ ...prev, [key]: v }))
  }

  async function uploadLogo(file: File) {
    setUploading(true)
    const ext = file.name.split('.').pop() ?? 'png'
    const res = await fetch('/api/upload-logo', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ext }),
    })
    const { signedUrl, publicUrl, error } = await res.json()
    if (error || !signedUrl) {
      setUploading(false)
      setMsgIsError(true)
      setMsg(`Erro no upload: ${error ?? 'Não foi possível gerar URL de envio'}`)
      return
    }

    await fetch(signedUrl, { method: 'PUT', body: file, headers: { 'Content-Type': file.type } })

    const logoUrl = `${publicUrl}?v=${Date.now()}`
    setForm(prev => ({ ...prev, logo_url: logoUrl }))

    // Persist logo_url immediately — don't require clicking "Salvar dados"
    await fetch('/api/escritorio', {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ logo_url: logoUrl }),
    })

    setLogoSuccess(true)
    setTimeout(() => setLogoSuccess(false), 3000)
    setUploading(false)
  }

  async function save(e: React.FormEvent) {
    e.preventDefault()
    if (!isCNPJValid(form.cnpj)) { setCnpjError('CNPJ inválido: deve ter 14 dígitos.'); return }
    setCnpjError('')
    setSaving(true)
    setMsg('')
    const res = await fetch('/api/escritorio', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    setSaving(false)
    if (res.ok) {
      setMsgIsError(false)
      setMsg('Dados salvos! Os próximos relatórios já usarão estas informações.')
      setTimeout(() => setMsg(''), 4000)
    } else {
      const err = await res.json().catch(() => ({}))
      setMsgIsError(true)
      setMsg(`Erro ao salvar: ${err.error ?? res.statusText}`)
    }
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <span className="text-ink-3 text-[13px]">Carregando...</span>
      </div>
    )
  }

  const logoSrc = form.logo_url || null

  return (
    <>
      <Topbar
        variant="context"
        title="Dados do Escritório"
        subtitle="Identidade usada nos relatórios, Blind Teaser e Pitchbook"
      />

      <div className="p-8 max-w-2xl">
        {/* Logo upload */}
        <div className="bg-surface border border-border rounded-[14px] p-6 mb-6 shadow-soft-sm flex items-center gap-6">
          <div
            onClick={() => fileRef.current?.click()}
            className="w-20 h-20 rounded-[14px] border-2 border-dashed border-border flex items-center justify-center cursor-pointer hover:border-accent-strong hover:bg-accent-soft transition-colors shrink-0 overflow-hidden"
          >
            {logoSrc ? (
              <img src={logoSrc} alt="Logo" className="w-full h-full object-contain p-1"/>
            ) : (
              <IconBuilding size={28} sw={1}/>
            )}
          </div>
          <div>
            <p className="text-[13px] font-medium text-ink mb-0.5">Logo do escritório</p>
            <p className="text-[12px] text-ink-3 mb-3">PNG ou SVG, fundo transparente, mínimo 200×200px</p>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="text-[12px] font-medium px-3 py-1.5 rounded-[8px] border border-border hover:border-accent-strong hover:bg-accent-soft transition-colors disabled:opacity-50"
            >
              {uploading ? 'Enviando...' : logoSrc ? 'Trocar logo' : 'Enviar logo'}
            </button>
            {logoSuccess && <span className="ml-2 text-[12px] text-ok font-medium">✓ Logo salvo</span>}
            {form.logo_url && (
              <button
                type="button"
                onClick={() => setForm(prev => ({ ...prev, logo_url: '' }))}
                className="ml-2 text-[12px] text-ink-3 hover:text-warn transition-colors"
              >
                Remover
              </button>
            )}
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/png,image/svg+xml,image/jpeg,image/webp"
            className="hidden"
            onChange={e => { const f = e.target.files?.[0]; if (f) uploadLogo(f) }}
          />
        </div>

        {/* Form */}
        <form onSubmit={save} className="bg-surface border border-border rounded-[14px] p-6 shadow-soft-sm space-y-4">
          <h2 className="font-display text-[18px] font-medium tracking-tight mb-2">Identificação</h2>

          <Field label="Nome do escritório / assessoria">
            <Input value={form.nome} onChange={set('nome')} placeholder="Ex.: Capital Assessoria Financeira"/>
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="CNPJ">
              <Input
                value={form.cnpj}
                onChange={v => { setCnpjError(''); set('cnpj')(maskCNPJ(v)) }}
                placeholder="00.000.000/0001-00"
              />
              {cnpjError && <p className="text-[11px] text-warn mt-1">{cnpjError}</p>}
            </Field>
            <Field label="Telefone / WhatsApp">
              <Input value={form.telefone} onChange={set('telefone')} placeholder="(11) 99999-9999"/>
            </Field>
          </div>

          <Field label="Endereço">
            <Input value={form.endereco} onChange={set('endereco')} placeholder="Rua, número, complemento"/>
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Cidade / Estado">
              <Input value={form.cidade_uf} onChange={set('cidade_uf')} placeholder="São Paulo, SP"/>
            </Field>
            <Field label="Email de contato">
              <Input value={form.email_contato} onChange={set('email_contato')} type="email" placeholder="contato@escritorio.com.br"/>
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Site">
              <Input value={form.site} onChange={set('site')} placeholder="https://escritorio.com.br"/>
            </Field>
            <Field
              label="Tagline / Slogan"
              hint="Aparece no rodapé dos documentos"
            >
              <Input value={form.tagline} onChange={set('tagline')} placeholder="Assessoria de M&A e Crédito Estruturado"/>
            </Field>
          </div>

          <div className="pt-2 flex items-center justify-between">
            {msg
              ? <p className={`text-[13px] ${msgIsError ? 'text-warn' : 'text-ok'}`}>{msg}</p>
              : <p className="text-[12px] text-ink-3">Blind Teaser, Pitchbook e Relatório Consolidado usarão estes dados.</p>
            }
            <button
              type="submit"
              disabled={saving}
              className="bg-accent-strong hover:opacity-90 text-white font-semibold px-5 py-2.5 rounded-[10px] text-[13px] transition disabled:opacity-50"
            >
              {saving ? 'Salvando...' : 'Salvar dados'}
            </button>
          </div>
        </form>
      </div>
    </>
  )
}
