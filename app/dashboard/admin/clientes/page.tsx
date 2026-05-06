'use client'

import { useEffect, useState } from 'react'
import Pill from '@/components/Pill'

type Assinatura = { plano: string; status: string; analises_restantes: number | null } | null
type Cliente = {
  id: string
  email: string
  criado_em: string
  ultimo_login: string | null
  assinatura: Assinatura
  total_analises: number
  ultima_analise: string | null
}
type AnaliseItem = { id: string; nome_ativo: string; status: string; criado_em: string }

const PLANOS    = ['avulso', 'recorrente', 'enterprise']
const PAGE_SIZE = 10

const STATUS_COR: Record<string, string> = {
  ativo:     'text-ok bg-ok/10 border-ok/30',
  cancelado: 'text-warn bg-warn/10 border-warn/30',
  pendente:  'text-ink-2 bg-surface-2 border-border',
}

const ANALISE_STATUS: Record<string, { label: string; kind: 'live' | 'warn' | 'draft' }> = {
  concluido:   { label: 'Pronto',      kind: 'live'  },
  processando: { label: 'Processando', kind: 'live'  },
  erro:        { label: 'Erro',        kind: 'warn'  },
}

export default function ClientesPage() {
  const [clientes,    setClientes]    = useState<Cliente[]>([])
  const [loading,     setLoading]     = useState(true)
  const [busca,       setBusca]       = useState('')
  const [page,        setPage]        = useState(0)
  const [selecionado, setSelecionado] = useState<Cliente | null>(null)
  const [analises,    setAnalises]    = useState<AnaliseItem[]>([])
  const [loadingAn,   setLoadingAn]   = useState(false)
  const [msg,         setMsg]         = useState('')
  const [salvando,    setSalvando]    = useState(false)

  useEffect(() => {
    fetch('/api/admin/clientes').then(r => r.json()).then(d => {
      setClientes(d.clientes ?? [])
      setLoading(false)
    })
  }, [])

  async function selecionar(c: Cliente) {
    setSelecionado(c)
    setMsg('')
    setAnalises([])
    setLoadingAn(true)
    const res  = await fetch(`/api/admin/clientes?user_id=${c.id}`)
    const data = await res.json()
    setAnalises(data.analises ?? [])
    setLoadingAn(false)
  }

  async function ativar(user_id: string, plano: string) {
    setSalvando(true); setMsg('')
    const res = await fetch('/api/admin/clientes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id, plano }),
    })
    setSalvando(false)
    if (res.ok) {
      setMsg(`Plano "${plano}" ativado!`)
      const nova: Assinatura = { plano, status: 'ativo', analises_restantes: plano === 'avulso' ? 1 : null }
      setClientes(prev => prev.map(c => c.id === user_id ? { ...c, assinatura: nova } : c))
      setSelecionado(prev => prev?.id === user_id ? { ...prev, assinatura: nova } : prev)
    }
  }

  async function cancelar(user_id: string) {
    setSalvando(true); setMsg('')
    await fetch('/api/admin/clientes', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id }),
    })
    setSalvando(false)
    setMsg('Plano cancelado.')
    setClientes(prev => prev.map(c => c.id === user_id && c.assinatura ? { ...c, assinatura: { ...c.assinatura, status: 'cancelado' } } : c))
    setSelecionado(prev => prev?.id === user_id && prev.assinatura ? { ...prev, assinatura: { ...prev.assinatura, status: 'cancelado' } } : prev)
  }

  const filtrados  = clientes.filter(c => c.email?.toLowerCase().includes(busca.toLowerCase()))
  const totalPages = Math.ceil(filtrados.length / PAGE_SIZE)
  const paginated  = filtrados.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)
  const fmt        = (d: string | null) => d ? new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' }) : '—'

  // Reset page when search changes
  useEffect(() => { setPage(0) }, [busca])

  return (
    <div className="flex h-full">
      {/* Lista */}
      <div className="flex-1 p-6 overflow-y-auto border-r border-border flex flex-col">
        <div className="mb-4">
          <h1 className="font-display text-[22px] font-medium tracking-tight">Clientes</h1>
          <p className="text-[13px] text-ink-3">{clientes.length} cadastrados</p>
        </div>

        <input
          type="text"
          value={busca}
          onChange={e => setBusca(e.target.value)}
          placeholder="Buscar por email..."
          className="w-full border border-border rounded-[10px] px-3 py-2.5 text-[13px] bg-surface outline-none focus:border-accent-strong focus:shadow-[0_0_0_3px_oklch(0.93_0.04_40)] placeholder:text-ink-3 mb-4 transition-shadow"
        />

        {loading ? (
          <p className="text-ink-3 text-[13px]">Carregando...</p>
        ) : (
          <>
            <div className="space-y-1.5 flex-1">
              {paginated.map(c => (
                <button
                  key={c.id}
                  onClick={() => selecionar(c)}
                  className={`w-full text-left px-4 py-3 rounded-[10px] border transition-colors ${
                    selecionado?.id === c.id
                      ? 'bg-accent-soft border-accent'
                      : 'bg-surface border-border hover:border-border-strong'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[13px] font-medium text-ink">{c.email}</p>
                      <p className="text-[11px] text-ink-3 mt-0.5">
                        Cadastro: {fmt(c.criado_em)} · {c.total_analises} análise(s)
                      </p>
                    </div>
                    <div className="text-right">
                      {c.assinatura ? (
                        <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full border capitalize ${STATUS_COR[c.assinatura.status] ?? 'text-ink-3 bg-surface-2 border-border'}`}>
                          {c.assinatura.plano} · {c.assinatura.status}
                        </span>
                      ) : (
                        <span className="text-[11px] text-ink-3 border border-border px-2 py-0.5 rounded-full">sem plano</span>
                      )}
                    </div>
                  </div>
                </button>
              ))}
              {paginated.length === 0 && <p className="text-ink-3 text-[13px] text-center py-8">Nenhum cliente encontrado</p>}
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-between pt-4 mt-2 border-t border-border">
                <span className="text-[12px] text-ink-3">
                  {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, filtrados.length)} de {filtrados.length}
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPage(p => p - 1)}
                    disabled={page === 0}
                    className="text-[12px] px-3 py-1.5 rounded-md border border-border hover:border-border-strong disabled:opacity-40 transition-colors"
                  >
                    ← Anterior
                  </button>
                  <button
                    onClick={() => setPage(p => p + 1)}
                    disabled={page >= totalPages - 1}
                    className="text-[12px] px-3 py-1.5 rounded-md border border-border hover:border-border-strong disabled:opacity-40 transition-colors"
                  >
                    Próxima →
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Painel de detalhes */}
      <div className="w-80 p-6 shrink-0 overflow-y-auto">
        {selecionado ? (
          <div className="space-y-5">
            <div>
              <h2 className="font-semibold text-ink break-all">{selecionado.email}</h2>
              <p className="text-[11px] text-ink-3 mt-1">ID: {selecionado.id.slice(0, 8)}...</p>
            </div>

            <div className="bg-surface border border-border rounded-[10px] p-4 space-y-2 text-[13px]">
              <div className="flex justify-between"><span className="text-ink-3">Cadastro</span><span className="text-ink">{fmt(selecionado.criado_em)}</span></div>
              <div className="flex justify-between"><span className="text-ink-3">Último login</span><span className="text-ink">{fmt(selecionado.ultimo_login)}</span></div>
              <div className="flex justify-between"><span className="text-ink-3">Análises</span><span className="text-ink">{selecionado.total_analises}</span></div>
              <div className="flex justify-between"><span className="text-ink-3">Última análise</span><span className="text-ink">{fmt(selecionado.ultima_analise)}</span></div>
            </div>

            {selecionado.assinatura && (
              <div className="bg-surface border border-border rounded-[10px] p-4 text-[13px] space-y-2">
                <p className="text-[10px] text-ink-3 font-semibold uppercase tracking-wide mb-2">Plano atual</p>
                <div className="flex justify-between"><span className="text-ink-3">Plano</span><span className="capitalize font-semibold text-ink">{selecionado.assinatura.plano}</span></div>
                <div className="flex justify-between">
                  <span className="text-ink-3">Status</span>
                  <span className={`capitalize font-semibold ${selecionado.assinatura.status === 'ativo' ? 'text-ok' : selecionado.assinatura.status === 'cancelado' ? 'text-warn' : 'text-ink-2'}`}>
                    {selecionado.assinatura.status}
                  </span>
                </div>
                {selecionado.assinatura.analises_restantes !== null && (
                  <div className="flex justify-between"><span className="text-ink-3">Restantes</span><span className="text-ink">{selecionado.assinatura.analises_restantes}</span></div>
                )}
              </div>
            )}

            {msg && <p className="text-ok text-[13px]">{msg}</p>}

            <div>
              <p className="text-[10px] text-ink-3 uppercase tracking-wide mb-2 font-semibold">Ativar plano</p>
              <div className="space-y-2">
                {PLANOS.map(p => (
                  <button
                    key={p}
                    onClick={() => ativar(selecionado.id, p)}
                    disabled={salvando}
                    className={`w-full py-2 px-3 rounded-[10px] text-[13px] border transition-colors text-left capitalize disabled:opacity-40 ${
                      selecionado.assinatura?.plano === p && selecionado.assinatura?.status === 'ativo'
                        ? 'border-accent bg-accent-soft text-accent-strong'
                        : 'border-border hover:border-border-strong text-ink-2 hover:text-ink bg-surface hover:bg-surface-hover'
                    }`}
                  >
                    {p === 'avulso' ? 'Avulso — 1 análise' : p === 'recorrente' ? 'Recorrente — ilimitado' : 'Enterprise'}
                    {selecionado.assinatura?.plano === p && selecionado.assinatura?.status === 'ativo' && (
                      <span className="text-[11px] ml-2 text-accent-strong">✓ ativo</span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {selecionado.assinatura?.status === 'ativo' && (
              <button
                onClick={() => cancelar(selecionado.id)}
                disabled={salvando}
                className="w-full py-2 rounded-[10px] text-[13px] text-warn border border-warn/30 hover:border-warn/60 hover:bg-warn-soft transition disabled:opacity-40"
              >
                Cancelar plano
              </button>
            )}

            {/* Análises do cliente */}
            <div>
              <p className="text-[10px] text-ink-3 uppercase tracking-wide mb-2 font-semibold">Análises recentes</p>
              {loadingAn ? (
                <p className="text-[12px] text-ink-3">Carregando...</p>
              ) : analises.length === 0 ? (
                <p className="text-[12px] text-ink-3">Nenhuma análise ainda.</p>
              ) : (
                <div className="space-y-1.5">
                  {analises.slice(0, 8).map(a => {
                    const st = ANALISE_STATUS[a.status] ?? { label: a.status, kind: 'draft' as const }
                    return (
                      <a
                        key={a.id}
                        href={`/dashboard/analise/${a.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-between px-3 py-2 rounded-[8px] bg-surface border border-border hover:border-border-strong transition-colors group"
                      >
                        <span className="text-[12px] text-ink truncate flex-1 group-hover:text-accent-strong transition-colors">{a.nome_ativo}</span>
                        <Pill kind={st.kind}>{st.label}</Pill>
                      </a>
                    )
                  })}
                  {analises.length > 8 && (
                    <p className="text-[11px] text-ink-3 text-center pt-1">+{analises.length - 8} mais</p>
                  )}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center h-full text-ink-3 text-[13px]">
            Selecione um cliente
          </div>
        )}
      </div>
    </div>
  )
}
