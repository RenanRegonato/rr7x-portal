'use client'

import { useEffect, useState, useCallback } from 'react'
import { formatDateBR } from '@/lib/format-date'

// ── Types ────────────────────────────────────────────────────────────────────

type PlanoTipo   = 'trial' | 'basico' | 'profissional' | 'enterprise' | ''
type PlanoStatus = 'trial' | 'ativo' | 'suspenso' | 'cancelado' | ''
type UserRole    = 'gerente' | 'assessor'

type EscritorioSummary = {
  id:             string
  nome:           string
  criado_em:      string
  gerente_email:  string | null
  total_usuarios: number
  plano:          PlanoTipo | null
  plano_status:   PlanoStatus | null
  invest_match_enabled: boolean
  reforma_tributaria_enabled: boolean
}

type UsuarioDetalhe = {
  id:           string
  email:        string
  nome:         string | null
  role:         string
  criado_em:    string
  ultimo_login: string | null
  banido:       boolean
}

type EscritorioDetalhe = {
  id:                    string
  nome:                  string
  criado_em:             string
  plano?:                PlanoTipo | null
  plano_status?:         PlanoStatus | null
  invest_match_enabled?: boolean
  reforma_tributaria_enabled?: boolean
}

// ── Constants ────────────────────────────────────────────────────────────────

const PLANO_OPTIONS: { value: PlanoTipo; label: string }[] = [
  { value: '',            label: 'Sem plano'      },
  { value: 'trial',       label: 'Trial'          },
  { value: 'basico',      label: 'Básico'         },
  { value: 'profissional', label: 'Profissional'  },
  { value: 'enterprise',  label: 'Enterprise'     },
]

const STATUS_OPTIONS: { value: PlanoStatus; label: string; cls: string }[] = [
  { value: '',          label: '—',          cls: 'text-ink-3'  },
  { value: 'trial',     label: 'Trial',      cls: 'text-sky-600' },
  { value: 'ativo',     label: 'Ativo',      cls: 'text-ok'     },
  { value: 'suspenso',  label: 'Suspenso',   cls: 'text-warn'   },
  { value: 'cancelado', label: 'Cancelado',  cls: 'text-ink-3'  },
]

const ROLE_CONFIG: Record<string, { label: string; cls: string }> = {
  admin:    { label: 'Admin',    cls: 'text-warn   bg-warn/10   border-warn/30'    },
  gerente:  { label: 'Gerente',  cls: 'text-sky-700 bg-sky/10  border-sky/30'     },
  assessor: { label: 'Assessor', cls: 'text-ink-2  bg-surface-2 border-border'    },
}

// ── Helpers ──────────────────────────────────────────────────────────────────

const fmt = (d: string | null) =>
  d ? formatDateBR(d, { day: '2-digit', month: '2-digit', year: '2-digit' }) : '—'

function PlanoStatusBadge({ status }: { status: PlanoStatus | null | undefined }) {
  const cfg = STATUS_OPTIONS.find(s => s.value === (status ?? '')) ?? STATUS_OPTIONS[0]
  return <span className={`text-[12px] font-medium ${cfg.cls}`}>{cfg.label}</span>
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function EscritoriosPage() {
  const [escritorios,  setEscritorios]  = useState<EscritorioSummary[]>([])
  const [busca,        setBusca]        = useState('')
  const [loading,      setLoading]      = useState(true)
  const [selecionado,  setSelecionado]  = useState<string | null>(null)

  // Detalhe
  const [detalhe,    setDetalhe]    = useState<EscritorioDetalhe | null>(null)
  const [usuarios,   setUsuarios]   = useState<UsuarioDetalhe[]>([])
  const [detLoading, setDetLoading] = useState(false)

  // Info edição
  const [editNome,  setEditNome]  = useState('')
  const [salvandoInfo, setSalvandoInfo] = useState(false)
  const [msgInfo,   setMsgInfo]   = useState('')

  // Plano edição
  const [editPlano,         setEditPlano]         = useState<PlanoTipo>('')
  const [editPlanoStatus,   setEditPlanoStatus]   = useState<PlanoStatus>('')
  const [salvandoPlano,     setSalvandoPlano]     = useState(false)
  const [msgPlano,          setMsgPlano]          = useState('')

  // Invest Match (Plus)
  const [imEnabled,  setImEnabled]  = useState(false)
  const [salvandoIM, setSalvandoIM] = useState(false)
  const [msgIM,      setMsgIM]      = useState('')

  // Adequação à Reforma Tributária (Ferrante)
  const [rtEnabled,  setRtEnabled]  = useState(false)
  const [salvandoRT, setSalvandoRT] = useState(false)
  const [msgRT,      setMsgRT]      = useState('')

  // Convidar
  const [showConvite,    setShowConvite]    = useState(false)
  const [inviteEmail,    setInviteEmail]    = useState('')
  const [inviteRole,     setInviteRole]     = useState<UserRole>('assessor')
  const [invitando,      setInvitando]      = useState(false)
  const [msgConvite,     setMsgConvite]     = useState('')

  // Ações de usuário
  const [editandoUser,   setEditandoUser]   = useState<string | null>(null)
  const [editUserRole,   setEditUserRole]   = useState<UserRole>('assessor')
  const [salvandoUser,   setSalvandoUser]   = useState(false)
  const [confirmarUser,  setConfirmarUser]  = useState<{ id: string; tipo: 'ban' | 'remove' | 'delete' } | null>(null)

  // Novo escritório
  const [showNovo,  setShowNovo]  = useState(false)
  const [novoNome,  setNovoNome]  = useState('')
  const [criando,   setCriando]   = useState(false)

  // Excluir escritório
  const [confirmarDel, setConfirmarDel] = useState(false)

  // ── Loads ────────────────────────────────────────────────────────────────

  const carregarLista = useCallback(async () => {
    setLoading(true)
    const r = await fetch('/api/admin/escritorios')
    const d = await r.json()
    setEscritorios(d.escritorios ?? [])
    setLoading(false)
  }, [])

  const carregarDetalhe = useCallback(async (id: string) => {
    setDetLoading(true)
    const r = await fetch(`/api/admin/escritorios?id=${id}`)
    const d = await r.json()
    const e: EscritorioDetalhe = d.escritorio
    setDetalhe(e)
    setUsuarios(d.usuarios ?? [])
    setEditNome(e.nome ?? '')
    setEditPlano((e.plano ?? '') as PlanoTipo)
    setEditPlanoStatus((e.plano_status ?? '') as PlanoStatus)
    setImEnabled(e.invest_match_enabled === true)
    setRtEnabled(e.reforma_tributaria_enabled === true)
    setDetLoading(false)
  }, [])

  useEffect(() => { carregarLista() }, [carregarLista])

  function selecionar(id: string) {
    setSelecionado(id)
    setMsgInfo('')
    setMsgPlano('')
    setMsgIM('')
    setMsgConvite('')
    setShowConvite(false)
    setEditandoUser(null)
    setConfirmarUser(null)
    setConfirmarDel(false)
    carregarDetalhe(id)
  }

  // ── Salvar info ───────────────────────────────────────────────────────────

  async function salvarInfo() {
    if (!selecionado || !editNome.trim()) return
    setSalvandoInfo(true)
    setMsgInfo('')
    const res = await fetch('/api/admin/escritorios', {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ id: selecionado, nome: editNome }),
    })
    setSalvandoInfo(false)
    if (res.ok) {
      setMsgInfo('Salvo.')
      setEscritorios(prev => prev.map(e => e.id === selecionado ? { ...e, nome: editNome } : e))
      setDetalhe(prev => prev ? { ...prev, nome: editNome } : null)
    } else {
      const d = await res.json()
      setMsgInfo(d.error ?? 'Erro ao salvar.')
    }
  }

  // ── Salvar plano ──────────────────────────────────────────────────────────

  async function salvarPlano() {
    if (!selecionado) return
    setSalvandoPlano(true)
    setMsgPlano('')
    const res = await fetch('/api/admin/escritorios', {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({
        id:                    selecionado,
        plano:                 editPlano || null,
        plano_status:          editPlanoStatus || null,
      }),
    })
    setSalvandoPlano(false)
    if (res.ok) {
      setMsgPlano('Plano atualizado.')
      setEscritorios(prev => prev.map(e => e.id === selecionado
        ? { ...e, plano: editPlano || null, plano_status: editPlanoStatus || null }
        : e
      ))
    } else {
      const d = await res.json()
      setMsgPlano(d.error ?? 'Erro ao salvar plano.')
    }
  }

  // ── Invest Match (Plus) ───────────────────────────────────────────────────

  async function toggleInvestMatch() {
    if (!selecionado || salvandoIM) return
    const novo = !imEnabled
    setSalvandoIM(true)
    setMsgIM('')
    const res = await fetch('/api/admin/escritorios', {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ id: selecionado, invest_match_enabled: novo }),
    })
    setSalvandoIM(false)
    if (res.ok) {
      setImEnabled(novo)
      setMsgIM(novo ? 'Invest Match habilitado para este escritório.' : 'Invest Match desabilitado.')
      setEscritorios(prev => prev.map(e => e.id === selecionado ? { ...e, invest_match_enabled: novo } : e))
      setDetalhe(prev => prev ? { ...prev, invest_match_enabled: novo } : null)
    } else {
      const d = await res.json()
      setMsgIM(d.error ?? 'Erro ao salvar.')
    }
  }

  // ── Adequação à Reforma Tributária (Ferrante) ─────────────────────────────

  async function toggleReformaTributaria() {
    if (!selecionado || salvandoRT) return
    const novo = !rtEnabled
    setSalvandoRT(true)
    setMsgRT('')
    const res = await fetch('/api/admin/escritorios', {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ id: selecionado, reforma_tributaria_enabled: novo }),
    })
    setSalvandoRT(false)
    if (res.ok) {
      setRtEnabled(novo)
      setMsgRT(novo ? 'Adequação à Reforma Tributária habilitada para este escritório.' : 'Adequação à Reforma Tributária desabilitada.')
      setEscritorios(prev => prev.map(e => e.id === selecionado ? { ...e, reforma_tributaria_enabled: novo } : e))
      setDetalhe(prev => prev ? { ...prev, reforma_tributaria_enabled: novo } : null)
    } else {
      const d = await res.json()
      setMsgRT(d.error ?? 'Erro ao salvar.')
    }
  }

  // ── Convidar usuário ──────────────────────────────────────────────────────

  async function convidar() {
    if (!selecionado || !inviteEmail.trim()) return
    setInvitando(true)
    setMsgConvite('')
    const res = await fetch('/api/admin/escritorios', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({
        action:        'invite_user',
        escritorio_id: selecionado,
        email:         inviteEmail.trim().toLowerCase(),
        role:          inviteRole,
      }),
    })
    setInvitando(false)
    if (res.ok) {
      setMsgConvite(`Convite enviado para ${inviteEmail}.`)
      setInviteEmail('')
      carregarDetalhe(selecionado)
    } else {
      const d = await res.json()
      setMsgConvite(d.error ?? 'Erro ao convidar.')
    }
  }

  // ── Salvar role de usuário ────────────────────────────────────────────────

  async function salvarRole(userId: string) {
    setSalvandoUser(true)
    const res = await fetch('/api/admin/escritorios', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({
        action:        'update_user_role',
        user_id:       userId,
        role:          editUserRole,
        escritorio_id: selecionado,
      }),
    })
    setSalvandoUser(false)
    if (res.ok) {
      setUsuarios(prev => prev.map(u => u.id === userId ? { ...u, role: editUserRole } : u))
      setEditandoUser(null)
    }
  }

  // ── Ação de usuário (ban/unban/remove/delete) ─────────────────────────────

  async function executarAcaoUser(userId: string, tipo: 'ban' | 'unban' | 'remove' | 'delete') {
    const actionMap = {
      ban:    'ban_user',
      unban:  'unban_user',
      remove: 'remove_user',
      delete: 'delete_user',
    }
    const res = await fetch('/api/admin/escritorios', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ action: actionMap[tipo], user_id: userId }),
    })
    if (res.ok) {
      if (tipo === 'remove' || tipo === 'delete') {
        setUsuarios(prev => prev.filter(u => u.id !== userId))
        setEscritorios(prev => prev.map(e => e.id === selecionado
          ? { ...e, total_usuarios: e.total_usuarios - 1 }
          : e
        ))
      } else {
        setUsuarios(prev => prev.map(u => u.id === userId ? { ...u, banido: tipo === 'ban' } : u))
      }
      setConfirmarUser(null)
    }
  }

  // ── Criar escritório ──────────────────────────────────────────────────────

  async function criar() {
    if (!novoNome.trim()) return
    setCriando(true)
    const res = await fetch('/api/admin/escritorios', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ action: 'create', nome: novoNome }),
    })
    setCriando(false)
    if (res.ok) {
      setNovoNome('')
      setShowNovo(false)
      carregarLista()
    } else {
      const d = await res.json().catch(() => ({}))
      alert(d.error || 'Não foi possível criar o escritório. Tente novamente.')
    }
  }

  // ── Excluir escritório ────────────────────────────────────────────────────

  async function excluirEscritorio() {
    if (!selecionado) return
    const res = await fetch('/api/admin/escritorios', {
      method:  'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ id: selecionado }),
    })
    if (res.ok) {
      setEscritorios(prev => prev.filter(e => e.id !== selecionado))
      setSelecionado(null)
      setDetalhe(null)
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  const filtrados = escritorios.filter(e =>
    e.nome.toLowerCase().includes(busca.toLowerCase()) ||
    (e.gerente_email ?? '').toLowerCase().includes(busca.toLowerCase())
  )

  return (
    <div className="flex h-full">

      {/* ── Lista de escritórios ─────────────────────────────────────────── */}
      <div className="w-80 shrink-0 border-r border-border flex flex-col overflow-hidden">

        <div className="p-5 border-b border-border">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h1 className="font-display text-[20px] font-medium tracking-tight">Escritórios</h1>
              <p className="text-[12px] text-ink-3">{escritorios.length} cadastrados</p>
            </div>
            <button
              onClick={() => setShowNovo(v => !v)}
              className="px-3 py-1.5 bg-accent-strong text-white rounded-[8px] text-[12px] font-semibold hover:opacity-90 transition"
            >
              + Novo
            </button>
          </div>

          {showNovo && (
            <div className="flex gap-2 mt-2">
              <input
                type="text"
                value={novoNome}
                onChange={e => setNovoNome(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && criar()}
                placeholder="Nome do escritório"
                className="flex-1 border border-border rounded-[8px] px-3 py-2 text-[12px] bg-bg outline-none focus:border-accent-strong"
              />
              <button
                onClick={criar}
                disabled={criando || !novoNome.trim()}
                className="px-3 py-2 bg-accent-strong text-white rounded-[8px] text-[12px] font-semibold disabled:opacity-50 hover:opacity-90 transition"
              >
                {criando ? '...' : 'Criar'}
              </button>
            </div>
          )}

          <input
            type="text"
            value={busca}
            onChange={e => setBusca(e.target.value)}
            placeholder="Buscar escritório..."
            className="w-full mt-3 border border-border rounded-[8px] px-3 py-2 text-[12px] bg-surface outline-none focus:border-accent-strong placeholder:text-ink-3"
          />
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-1">
          {loading ? (
            <p className="text-ink-3 text-[12px] text-center py-8">Carregando...</p>
          ) : filtrados.length === 0 ? (
            <p className="text-ink-3 text-[12px] text-center py-8">Nenhum escritório encontrado</p>
          ) : filtrados.map(e => {
            const statusCfg = STATUS_OPTIONS.find(s => s.value === (e.plano_status ?? '')) ?? STATUS_OPTIONS[0]
            return (
              <button
                key={e.id}
                onClick={() => selecionar(e.id)}
                className={`w-full text-left px-3 py-3 rounded-[10px] border transition-colors ${
                  selecionado === e.id
                    ? 'bg-accent-soft border-accent'
                    : 'bg-surface border-border hover:border-border-strong'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-[13px] font-medium text-ink truncate">{e.nome}</p>
                    <p className="text-[11px] text-ink-3 mt-0.5 truncate">
                      {e.gerente_email ?? 'Sem gerente'} · {e.total_usuarios} usuário{e.total_usuarios !== 1 ? 's' : ''}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    {e.plano && (
                      <p className="text-[10px] font-medium text-ink-2 capitalize">{e.plano}</p>
                    )}
                    <span className={`text-[10px] font-medium ${statusCfg.cls}`}>
                      {statusCfg.label}
                    </span>
                    {e.invest_match_enabled && (
                      <p className="text-[9px] font-semibold text-accent-strong mt-0.5 uppercase tracking-wide">IM Plus</p>
                    )}
                    {e.reforma_tributaria_enabled && (
                      <p className="text-[9px] font-semibold text-accent-strong mt-0.5 uppercase tracking-wide">RT</p>
                    )}
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* ── Painel de detalhe ────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto">
        {!selecionado ? (
          <div className="flex items-center justify-center h-full text-ink-3 text-[13px]">
            Selecione um escritório para gerenciar
          </div>
        ) : detLoading ? (
          <div className="flex items-center justify-center h-full text-ink-3 text-[13px]">
            Carregando...
          </div>
        ) : detalhe ? (
          <div className="max-w-2xl mx-auto p-8 space-y-8">

            {/* Header */}
            <div>
              <h2 className="font-display text-[24px] font-medium tracking-tight">{detalhe.nome}</h2>
              <p className="text-[11px] text-ink-3 mt-1">ID: {detalhe.id}</p>
            </div>

            {/* ── Seção: Informações ──────────────────────────────────────── */}
            <section>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-3 mb-3">
                Informações
              </p>
              <div className="bg-surface border border-border rounded-[12px] p-5 space-y-4">
                <div>
                  <label className="text-[11px] text-ink-3 block mb-1.5">Nome do escritório</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={editNome}
                      onChange={e => { setEditNome(e.target.value); setMsgInfo('') }}
                      className="flex-1 border border-border rounded-[8px] px-3 py-2 text-[13px] bg-bg outline-none focus:border-accent-strong"
                    />
                    <button
                      onClick={salvarInfo}
                      disabled={salvandoInfo || !editNome.trim()}
                      className="px-4 py-2 bg-accent-strong text-white rounded-[8px] text-[12px] font-semibold disabled:opacity-50 hover:opacity-90 transition"
                    >
                      {salvandoInfo ? '...' : 'Salvar'}
                    </button>
                  </div>
                  {msgInfo && (
                    <p className={`text-[12px] mt-1.5 ${msgInfo === 'Salvo.' ? 'text-ok' : 'text-warn'}`}>
                      {msgInfo}
                    </p>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-3 text-[13px]">
                  <div>
                    <span className="text-ink-3 text-[11px]">Criado em</span>
                    <p className="text-ink mt-0.5">{fmt(detalhe.criado_em)}</p>
                  </div>
                  <div>
                    <span className="text-ink-3 text-[11px]">Total de usuários</span>
                    <p className="text-ink mt-0.5">{usuarios.length}</p>
                  </div>
                </div>
              </div>
            </section>

            {/* ── Seção: Pacotes (novo modelo) ────────────────────────────── */}
            <section>
              <div className="flex items-center justify-between mb-3">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-3">
                  Pacotes de análises
                </p>
                <a
                  href={`/dashboard/admin/pacotes?escritorio_id=${detalhe.id}`}
                  className="text-[12px] text-accent-strong hover:underline"
                >
                  Gerenciar pacotes →
                </a>
              </div>
              <div className="bg-surface border border-border rounded-[12px] p-4 text-[12px] text-ink-3">
                Os pacotes de análises (Pontual / Institucional / Corporativo) são gerenciados na página{' '}
                <a href={`/dashboard/admin/pacotes?escritorio_id=${detalhe.id}`} className="text-accent-strong hover:underline">
                  Pacotes
                </a>
                . Cada pacote pertence ao escritório e é consumido por qualquer usuário vinculado.
              </div>
            </section>

            {/* ── Seção: Invest Match (Plus) ──────────────────────────────── */}
            <section>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-3 mb-3">
                Invest Match <span className="text-accent-strong normal-case font-semibold">Plus</span>
              </p>
              <div className="bg-surface border border-border rounded-[12px] p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-[13px] font-medium text-ink">Módulo de originação Invest Match</p>
                    <p className="text-[12px] text-ink-3 mt-1 leading-relaxed">
                      Recurso adicional opcional. Habilite apenas para escritórios que contrataram o upgrade Plus.
                      Quando desabilitado, os usuários do escritório veem uma tela de apresentação ao acessar o módulo.
                    </p>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={imEnabled}
                    onClick={toggleInvestMatch}
                    disabled={salvandoIM}
                    className={`relative shrink-0 w-11 h-6 rounded-full transition-colors disabled:opacity-50 ${
                      imEnabled ? 'bg-accent-strong' : 'bg-surface-2 border border-border'
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${
                        imEnabled ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <span className={`text-[12px] font-medium ${imEnabled ? 'text-ok' : 'text-ink-3'}`}>
                    {imEnabled ? 'Habilitado' : 'Desabilitado'}
                  </span>
                  {salvandoIM && <span className="text-[12px] text-ink-3">salvando…</span>}
                </div>
                {msgIM && (
                  <p className={`text-[12px] mt-1.5 ${msgIM.includes('Erro') ? 'text-warn' : 'text-ok'}`}>
                    {msgIM}
                  </p>
                )}
              </div>
            </section>

            {/* ── Seção: Adequação à Reforma Tributária (Ferrante) ─────────── */}
            <section>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-3 mb-3">
                Adequação à Reforma Tributária <span className="text-accent-strong normal-case font-semibold">Premium</span>
              </p>
              <div className="bg-surface border border-border rounded-[12px] p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-[13px] font-medium text-ink">Módulo de adequação à Reforma Tributária</p>
                    <p className="text-[12px] text-ink-3 mt-1 leading-relaxed">
                      Recurso premium opcional. Habilite apenas para escritórios que contrataram o upgrade.
                      Quando desabilitado, a opção aparece bloqueada na abertura da análise.
                    </p>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={rtEnabled}
                    onClick={toggleReformaTributaria}
                    disabled={salvandoRT}
                    className={`relative shrink-0 w-11 h-6 rounded-full transition-colors disabled:opacity-50 ${
                      rtEnabled ? 'bg-accent-strong' : 'bg-surface-2 border border-border'
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${
                        rtEnabled ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <span className={`text-[12px] font-medium ${rtEnabled ? 'text-ok' : 'text-ink-3'}`}>
                    {rtEnabled ? 'Habilitado' : 'Desabilitado'}
                  </span>
                  {salvandoRT && <span className="text-[12px] text-ink-3">salvando…</span>}
                </div>
                {msgRT && (
                  <p className={`text-[12px] mt-1.5 ${msgRT.includes('Erro') ? 'text-warn' : 'text-ok'}`}>
                    {msgRT}
                  </p>
                )}
              </div>
            </section>

            {/* ── Seção: Plano (legacy — mantido para compat) ─────────────── */}
            <section>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-3 mb-3">
                Plano contratado <span className="text-ink-3 normal-case font-normal">(legacy)</span>
              </p>
              <div className="bg-surface border border-border rounded-[12px] p-5 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[11px] text-ink-3 block mb-1.5">Tipo de plano</label>
                    <select
                      value={editPlano}
                      onChange={e => { setEditPlano(e.target.value as PlanoTipo); setMsgPlano('') }}
                      className="w-full border border-border rounded-[8px] px-3 py-2 text-[13px] bg-bg outline-none focus:border-accent-strong"
                    >
                      {PLANO_OPTIONS.map(o => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[11px] text-ink-3 block mb-1.5">Status</label>
                    <select
                      value={editPlanoStatus}
                      onChange={e => { setEditPlanoStatus(e.target.value as PlanoStatus); setMsgPlano('') }}
                      className="w-full border border-border rounded-[8px] px-3 py-2 text-[13px] bg-bg outline-none focus:border-accent-strong"
                    >
                      {STATUS_OPTIONS.map(o => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
                {msgPlano && (
                  <p className={`text-[12px] ${msgPlano === 'Plano atualizado.' ? 'text-ok' : 'text-warn'}`}>
                    {msgPlano}
                  </p>
                )}
                <button
                  onClick={salvarPlano}
                  disabled={salvandoPlano}
                  className="w-full py-2.5 bg-accent-strong text-white rounded-[8px] text-[13px] font-semibold disabled:opacity-50 hover:opacity-90 transition"
                >
                  {salvandoPlano ? 'Salvando...' : 'Salvar plano'}
                </button>
              </div>
            </section>

            {/* ── Seção: Usuários ─────────────────────────────────────────── */}
            <section>
              <div className="flex items-center justify-between mb-3">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-3">
                  Usuários ({usuarios.length})
                </p>
                <button
                  onClick={() => { setShowConvite(v => !v); setMsgConvite(''); setInviteEmail('') }}
                  className="text-[12px] font-medium text-accent-strong hover:underline"
                >
                  {showConvite ? 'Cancelar' : '+ Convidar usuário'}
                </button>
              </div>

              {showConvite && (
                <div className="bg-surface border border-border rounded-[12px] p-4 mb-4 space-y-3">
                  <p className="text-[11px] font-semibold text-ink-2 uppercase tracking-wide">Novo convite</p>
                  <input
                    type="email"
                    value={inviteEmail}
                    onChange={e => setInviteEmail(e.target.value)}
                    placeholder="email@exemplo.com"
                    className="w-full border border-border rounded-[8px] px-3 py-2 text-[13px] bg-bg outline-none focus:border-accent-strong placeholder:text-ink-3"
                  />
                  <div className="flex gap-2">
                    {(['gerente', 'assessor'] as UserRole[]).map(r => (
                      <button
                        key={r}
                        onClick={() => setInviteRole(r)}
                        className={`flex-1 py-2 rounded-[8px] text-[12px] border transition-colors ${
                          inviteRole === r
                            ? 'border-accent bg-accent-soft text-accent-strong'
                            : 'border-border hover:border-border-strong text-ink-2'
                        }`}
                      >
                        {r === 'gerente' ? 'Gerente' : 'Assessor'}
                      </button>
                    ))}
                  </div>
                  {msgConvite && (
                    <p className={`text-[12px] ${msgConvite.startsWith('Convite') ? 'text-ok' : 'text-warn'}`}>
                      {msgConvite}
                    </p>
                  )}
                  <button
                    onClick={convidar}
                    disabled={invitando || !inviteEmail.trim()}
                    className="w-full py-2.5 bg-accent-strong text-white rounded-[8px] text-[12px] font-semibold disabled:opacity-50 hover:opacity-90 transition"
                  >
                    {invitando ? 'Enviando...' : 'Enviar convite'}
                  </button>
                </div>
              )}

              <div className="space-y-2">
                {usuarios.length === 0 ? (
                  <div className="bg-surface border border-border rounded-[12px] p-6 text-center">
                    <p className="text-ink-3 text-[13px]">Nenhum usuário vinculado</p>
                    <p className="text-ink-3 text-[12px] mt-1">Convide o primeiro usuário acima</p>
                  </div>
                ) : usuarios.map(u => {
                  const roleCfg = ROLE_CONFIG[u.role] ?? ROLE_CONFIG.assessor
                  const isEditing = editandoUser === u.id
                  const isConfirming = confirmarUser?.id === u.id

                  return (
                    <div
                      key={u.id}
                      className={`bg-surface border rounded-[12px] p-4 transition-colors ${
                        u.banido ? 'border-warn/20 bg-warn/5' : 'border-border'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className={`text-[13px] font-medium truncate ${u.banido ? 'line-through text-ink-3' : 'text-ink'}`}>
                              {u.email}
                            </p>
                            <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full border ${roleCfg.cls}`}>
                              {roleCfg.label}
                            </span>
                            {u.banido && (
                              <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full border border-warn/30 text-warn bg-warn/10">
                                Desativado
                              </span>
                            )}
                          </div>
                          {u.nome && (
                            <p className="text-[11px] text-ink-3 mt-0.5">{u.nome}</p>
                          )}
                          <p className="text-[11px] text-ink-3 mt-0.5">
                            Cadastro: {fmt(u.criado_em)}
                            {u.ultimo_login && ` · Login: ${fmt(u.ultimo_login)}`}
                          </p>
                        </div>

                        {u.role !== 'admin' && (
                          <div className="flex gap-1.5 shrink-0">
                            <button
                              onClick={() => {
                                if (isEditing) { setEditandoUser(null) }
                                else { setEditandoUser(u.id); setEditUserRole(u.role as UserRole) }
                              }}
                              className="px-2.5 py-1.5 text-[11px] border border-border rounded-[6px] text-ink-2 hover:border-border-strong hover:text-ink transition"
                            >
                              {isEditing ? 'Fechar' : 'Editar'}
                            </button>
                            <button
                              onClick={() => setConfirmarUser({ id: u.id, tipo: u.banido ? 'ban' : 'ban' })}
                              className={`px-2.5 py-1.5 text-[11px] border rounded-[6px] transition ${
                                u.banido
                                  ? 'border-ok/40 text-ok hover:bg-ok/5'
                                  : 'border-warn/40 text-warn hover:bg-warn/5'
                              }`}
                            >
                              {u.banido ? 'Reativar' : 'Desativar'}
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Edição inline de role */}
                      {isEditing && (
                        <div className="mt-3 pt-3 border-t border-border flex items-center gap-2">
                          <select
                            value={editUserRole}
                            onChange={e => setEditUserRole(e.target.value as UserRole)}
                            className="flex-1 border border-border rounded-[8px] px-2.5 py-2 text-[12px] bg-bg outline-none focus:border-accent-strong"
                          >
                            <option value="gerente">Gerente: acesso completo ao escritório</option>
                            <option value="assessor">Assessor: acesso aos próprios deals</option>
                          </select>
                          <button
                            onClick={() => salvarRole(u.id)}
                            disabled={salvandoUser}
                            className="px-3 py-2 bg-accent-strong text-white rounded-[8px] text-[12px] font-semibold disabled:opacity-50 hover:opacity-90 transition"
                          >
                            {salvandoUser ? '...' : 'OK'}
                          </button>
                          <button
                            onClick={() => setConfirmarUser({ id: u.id, tipo: 'remove' })}
                            className="px-3 py-2 border border-warn/40 text-warn rounded-[8px] text-[12px] hover:bg-warn/5 transition"
                          >
                            Remover
                          </button>
                        </div>
                      )}

                      {/* Confirmação de ação */}
                      {isConfirming && (
                        <div className="mt-3 pt-3 border-t border-border">
                          {confirmarUser!.tipo === 'ban' && !u.banido && (
                            <p className="text-[12px] text-warn mb-2">Desativar conta de {u.email}?</p>
                          )}
                          {confirmarUser!.tipo === 'ban' && u.banido && (
                            <p className="text-[12px] text-ok mb-2">Reativar conta de {u.email}?</p>
                          )}
                          {confirmarUser!.tipo === 'remove' && (
                            <p className="text-[12px] text-warn mb-2">Remover {u.email} deste escritório? A conta do usuário será mantida.</p>
                          )}
                          {confirmarUser!.tipo === 'delete' && (
                            <p className="text-[12px] text-warn mb-2">Excluir permanentemente {u.email}? Esta ação é irreversível.</p>
                          )}
                          <div className="flex gap-2">
                            <button
                              onClick={() => {
                                const t = confirmarUser!.tipo
                                if (t === 'ban') executarAcaoUser(u.id, u.banido ? 'unban' : 'ban')
                                else executarAcaoUser(u.id, t)
                              }}
                              className="flex-1 py-2 bg-warn text-white rounded-[8px] text-[12px] font-semibold hover:opacity-90 transition"
                            >
                              Confirmar
                            </button>
                            <button
                              onClick={() => setConfirmarUser(null)}
                              className="flex-1 py-2 border border-border text-ink-2 rounded-[8px] text-[12px] hover:border-border-strong transition"
                            >
                              Cancelar
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </section>

            {/* ── Zona de risco ───────────────────────────────────────────── */}
            <section className="border-t border-border pt-6">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-3 mb-3">
                Zona de risco
              </p>
              {confirmarDel ? (
                <div className="bg-warn/5 border border-warn/20 rounded-[12px] p-4 space-y-3">
                  <p className="text-[13px] text-warn font-medium">
                    Excluir &ldquo;{detalhe.nome}&rdquo;?
                  </p>
                  <p className="text-[12px] text-ink-3">
                    Todos os usuários do escritório serão <strong className="text-warn">excluídos do sistema</strong> (perdem o acesso imediatamente, sem login com credenciais antigas) e suas análises serão removidas. Esta ação é irreversível.
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={excluirEscritorio}
                      className="flex-1 py-2 bg-warn text-white rounded-[8px] text-[12px] font-semibold hover:opacity-90 transition"
                    >
                      Excluir escritório
                    </button>
                    <button
                      onClick={() => setConfirmarDel(false)}
                      className="flex-1 py-2 border border-border text-ink-2 rounded-[8px] text-[12px] hover:border-border-strong transition"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setConfirmarDel(true)}
                  className="px-4 py-2 border border-warn/40 text-warn text-[12px] font-medium rounded-[8px] hover:bg-warn/5 transition"
                >
                  Excluir escritório
                </button>
              )}
            </section>

          </div>
        ) : null}
      </div>
    </div>
  )
}
