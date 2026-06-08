'use client'

import { useEffect, useState } from 'react'
import { formatDateBR } from '@/lib/format-date'

type UserRole = 'admin' | 'gerente' | 'assessor'

type Usuario = {
  id:              string
  email:           string
  criado_em:       string
  ultimo_login:    string | null
  role:            UserRole
  escritorio_id:   string | null
  escritorio_nome: string | null
  banido:          boolean
}

type Escritorio = { id: string; nome: string }

const ROLE_CONFIG: Record<UserRole, { label: string; cls: string }> = {
  admin:    { label: 'Admin',    cls: 'text-warn bg-warn/10 border-warn/30'    },
  gerente:  { label: 'Gerente',  cls: 'text-sky-700 bg-sky/10 border-sky/30'  },
  assessor: { label: 'Assessor', cls: 'text-ink-2 bg-surface-2 border-border' },
}

export default function UsuariosPage() {
  const [usuarios,    setUsuarios]    = useState<Usuario[]>([])
  const [escritorios, setEscritorios] = useState<Escritorio[]>([])
  const [loading,     setLoading]     = useState(true)
  const [selecionado, setSelecionado] = useState<Usuario | null>(null)
  const [editRole,    setEditRole]    = useState<UserRole>('assessor')
  const [editEscId,   setEditEscId]   = useState<string>('')
  const [salvando,    setSalvando]    = useState(false)
  const [msg,         setMsg]         = useState('')
  const [busca,       setBusca]       = useState('')
  const [confirmarId, setConfirmarId] = useState<string | null>(null)

  // Invite form state
  const [showInvite,      setShowInvite]      = useState(false)
  const [inviteEmail,     setInviteEmail]     = useState('')
  const [inviteRole,      setInviteRole]      = useState<'gerente' | 'assessor'>('assessor')
  const [inviteEscId,     setInviteEscId]     = useState('')
  const [inviteEscNome,   setInviteEscNome]   = useState('')
  const [invitando,       setInvitando]       = useState(false)
  const [inviteMsg,       setInviteMsg]       = useState('')

  useEffect(() => {
    carregar()
  }, [])

  async function carregar() {
    const r = await fetch('/api/admin/usuarios')
    const d = await r.json()
    setUsuarios(d.usuarios ?? [])
    setEscritorios(d.escritorios ?? [])
    setLoading(false)
  }

  function selecionar(u: Usuario) {
    setSelecionado(u)
    setEditRole(u.role)
    setEditEscId(u.escritorio_id ?? '')
    setMsg('')
    setConfirmarId(null)
  }

  async function salvar() {
    if (!selecionado) return
    setSalvando(true)
    setMsg('')
    const res = await fetch('/api/admin/usuarios', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ user_id: selecionado.id, role: editRole, escritorio_id: editEscId || null }),
    })
    setSalvando(false)
    if (res.ok) {
      setMsg('Perfil atualizado.')
      setUsuarios(prev => prev.map(u =>
        u.id === selecionado.id
          ? { ...u, role: editRole, escritorio_id: editEscId || null, escritorio_nome: escritorios.find(e => e.id === editEscId)?.nome ?? null }
          : u
      ))
      setSelecionado(prev => prev ? { ...prev, role: editRole, escritorio_id: editEscId || null } : null)
    }
  }

  async function toggleBan(u: Usuario) {
    const action = u.banido ? 'unban' : 'ban'
    const res = await fetch('/api/admin/usuarios', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ action, user_id: u.id }),
    })
    if (res.ok) {
      const novoEstado = !u.banido
      setUsuarios(prev => prev.map(x => x.id === u.id ? { ...x, banido: novoEstado } : x))
      setSelecionado(prev => prev?.id === u.id ? { ...prev, banido: novoEstado } : prev)
    }
  }

  async function excluir(id: string) {
    const res = await fetch('/api/admin/usuarios', {
      method:  'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ user_id: id }),
    })
    if (res.ok) {
      setUsuarios(prev => prev.filter(u => u.id !== id))
      if (selecionado?.id === id) setSelecionado(null)
      setConfirmarId(null)
    }
  }

  async function convidar() {
    if (!inviteEmail) return
    setInvitando(true)
    setInviteMsg('')
    const res = await fetch('/api/admin/usuarios', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({
        action:          'invite',
        email:           inviteEmail,
        role:            inviteRole,
        escritorio_id:   inviteEscId || null,
        escritorio_nome: inviteRole === 'gerente' && !inviteEscId ? inviteEscNome : undefined,
      }),
    })
    setInvitando(false)
    if (res.ok) {
      setInviteMsg(`Convite enviado para ${inviteEmail}.`)
      setInviteEmail('')
      setInviteEscId('')
      setInviteEscNome('')
      carregar()
    } else {
      const d = await res.json()
      setInviteMsg(d.error ?? 'Erro ao convidar.')
    }
  }

  const fmt = (d: string | null) => d
    ? formatDateBR(d, { day: '2-digit', month: '2-digit', year: '2-digit' })
    : '—'

  const filtrados = usuarios.filter(u => u.email?.toLowerCase().includes(busca.toLowerCase()))

  return (
    <div className="flex h-full">
      {/* Lista */}
      <div className="flex-1 p-6 overflow-y-auto border-r border-border flex flex-col">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h1 className="font-display text-[22px] font-medium tracking-tight">Usuários</h1>
            <p className="text-[13px] text-ink-3">{usuarios.length} cadastrados</p>
          </div>
          <button
            onClick={() => { setShowInvite(v => !v); setInviteMsg('') }}
            className="px-4 py-2 bg-accent-strong text-white rounded-[10px] text-[13px] font-semibold hover:opacity-90 transition shrink-0"
          >
            + Convidar
          </button>
        </div>

        {/* Painel de convite */}
        {showInvite && (
          <div className="bg-surface border border-border rounded-[12px] p-4 mb-4 space-y-3">
            <p className="text-[12px] font-semibold text-ink-2 uppercase tracking-wide">Novo convite</p>

            <input
              type="email"
              value={inviteEmail}
              onChange={e => setInviteEmail(e.target.value)}
              placeholder="email@escritorio.com"
              className="w-full border border-border rounded-[10px] px-3 py-2.5 text-[13px] bg-bg outline-none focus:border-accent-strong transition-shadow placeholder:text-ink-3"
            />

            <div className="flex gap-2">
              {(['gerente', 'assessor'] as const).map(r => (
                <button
                  key={r}
                  onClick={() => setInviteRole(r)}
                  className={`flex-1 py-2 px-3 rounded-[10px] text-[12px] border transition-colors ${
                    inviteRole === r
                      ? 'border-accent bg-accent-soft text-accent-strong'
                      : 'border-border hover:border-border-strong text-ink-2 bg-surface'
                  }`}
                >
                  {r === 'gerente' ? 'Gerente' : 'Assessor'}
                </button>
              ))}
            </div>

            {inviteRole === 'assessor' && (
              <select
                value={inviteEscId}
                onChange={e => setInviteEscId(e.target.value)}
                className="w-full border border-border rounded-[10px] px-3 py-2.5 text-[13px] bg-bg outline-none focus:border-accent-strong transition-shadow"
              >
                <option value="">Selecionar escritório...</option>
                {escritorios.map(e => (
                  <option key={e.id} value={e.id}>{e.nome}</option>
                ))}
              </select>
            )}

            {inviteRole === 'gerente' && (
              <div className="space-y-2">
                <p className="text-[11px] text-ink-3">Vincular a escritório existente ou criar novo:</p>
                <select
                  value={inviteEscId}
                  onChange={e => setInviteEscId(e.target.value)}
                  className="w-full border border-border rounded-[10px] px-3 py-2.5 text-[13px] bg-bg outline-none focus:border-accent-strong transition-shadow"
                >
                  <option value="">Criar novo escritório</option>
                  {escritorios.map(e => (
                    <option key={e.id} value={e.id}>{e.nome}</option>
                  ))}
                </select>
                {!inviteEscId && (
                  <input
                    type="text"
                    value={inviteEscNome}
                    onChange={e => setInviteEscNome(e.target.value)}
                    placeholder="Nome do novo escritório"
                    className="w-full border border-border rounded-[10px] px-3 py-2.5 text-[13px] bg-bg outline-none focus:border-accent-strong transition-shadow placeholder:text-ink-3"
                  />
                )}
              </div>
            )}

            {inviteMsg && (
              <p className={`text-[12px] ${inviteMsg.startsWith('Convite') ? 'text-ok' : 'text-warn'}`}>
                {inviteMsg}
              </p>
            )}

            <button
              onClick={convidar}
              disabled={invitando || !inviteEmail}
              className="w-full py-2.5 rounded-[10px] bg-accent-strong text-white font-semibold text-[13px] hover:opacity-90 disabled:opacity-50 transition"
            >
              {invitando ? 'Enviando...' : 'Enviar convite'}
            </button>
          </div>
        )}

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
          <div className="space-y-1.5 flex-1">
            {filtrados.map(u => {
              const cfg = ROLE_CONFIG[u.role]
              return (
                <button
                  key={u.id}
                  onClick={() => selecionar(u)}
                  className={`w-full text-left px-4 py-3 rounded-[10px] border transition-colors ${
                    selecionado?.id === u.id
                      ? 'bg-accent-soft border-accent'
                      : 'bg-surface border-border hover:border-border-strong'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className={`text-[13px] font-medium ${u.banido ? 'text-ink-3 line-through' : 'text-ink'}`}>
                        {u.email}
                      </p>
                      <p className="text-[11px] text-ink-3 mt-0.5">
                        Cadastro: {fmt(u.criado_em)}
                        {u.escritorio_nome && ` · ${u.escritorio_nome}`}
                        {u.banido && ' · Desativado'}
                      </p>
                    </div>
                    <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full border ${cfg.cls}`}>
                      {cfg.label}
                    </span>
                  </div>
                </button>
              )
            })}
            {filtrados.length === 0 && (
              <p className="text-ink-3 text-[13px] text-center py-8">Nenhum usuário encontrado</p>
            )}
          </div>
        )}
      </div>

      {/* Painel de edição */}
      <div className="w-80 p-6 shrink-0 overflow-y-auto">
        {selecionado ? (
          <div className="space-y-5">
            <div>
              <h2 className="font-semibold text-ink break-all">{selecionado.email}</h2>
              <p className="text-[11px] text-ink-3 mt-1">ID: {selecionado.id.slice(0, 8)}...</p>
            </div>

            <div className="bg-surface border border-border rounded-[10px] p-4 space-y-2 text-[13px]">
              <div className="flex justify-between">
                <span className="text-ink-3">Cadastro</span>
                <span className="text-ink">{fmt(selecionado.criado_em)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-ink-3">Último login</span>
                <span className="text-ink">{fmt(selecionado.ultimo_login)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-ink-3">Escritório</span>
                <span className="text-ink">{selecionado.escritorio_nome ?? '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-ink-3">Status</span>
                <span className={selecionado.banido ? 'text-warn font-medium' : 'text-ok'}>
                  {selecionado.banido ? 'Desativado' : 'Ativo'}
                </span>
              </div>
            </div>

            {/* Editar perfil */}
            {selecionado.role !== 'admin' && (
              <div className="space-y-3">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-ink-3">
                  Nível de acesso
                </p>

                {(['gerente', 'assessor'] as UserRole[]).map(r => (
                  <button
                    key={r}
                    onClick={() => setEditRole(r)}
                    className={`w-full py-2 px-3 rounded-[10px] text-[13px] border transition-colors text-left ${
                      editRole === r
                        ? 'border-accent bg-accent-soft text-accent-strong'
                        : 'border-border hover:border-border-strong text-ink-2 bg-surface'
                    }`}
                  >
                    <span className="font-medium capitalize">{r === 'gerente' ? 'Gerente' : 'Assessor'}</span>
                    <span className="text-[11px] block text-ink-3 mt-0.5">
                      {r === 'gerente'
                        ? 'Acesso ao escritório completo + equipe'
                        : 'Acesso apenas aos próprios deals'}
                    </span>
                  </button>
                ))}

                {editRole === 'assessor' && (
                  <div>
                    <p className="text-[11px] text-ink-3 mb-1.5">Vincular ao escritório</p>
                    <select
                      value={editEscId}
                      onChange={e => setEditEscId(e.target.value)}
                      className="w-full border border-border rounded-[10px] px-3 py-2.5 text-[13px] bg-surface outline-none focus:border-accent-strong transition-shadow"
                    >
                      <option value="">Sem vínculo</option>
                      {escritorios.map(e => (
                        <option key={e.id} value={e.id}>{e.nome}</option>
                      ))}
                    </select>
                  </div>
                )}

                {msg && <p className="text-ok text-[13px]">{msg}</p>}

                <button
                  onClick={salvar}
                  disabled={salvando}
                  className="w-full py-2.5 rounded-[10px] bg-accent-strong text-white font-semibold text-[13px] hover:opacity-90 disabled:opacity-50 transition"
                >
                  {salvando ? 'Salvando...' : 'Salvar perfil'}
                </button>
              </div>
            )}

            {selecionado.role === 'admin' && (
              <p className="text-[12px] text-ink-3 bg-surface-2 border border-border rounded-[10px] p-3">
                Conta administrativa: perfil não editável.
              </p>
            )}

            {/* Zona de risco */}
            {selecionado.role !== 'admin' && (
              <div className="border-t border-border pt-4 space-y-2">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-ink-3">Zona de risco</p>

                <button
                  onClick={() => toggleBan(selecionado)}
                  className={`w-full py-2 rounded-[10px] border text-[12px] font-medium transition ${
                    selecionado.banido
                      ? 'border-ok/40 text-ok hover:bg-ok/5'
                      : 'border-warn/40 text-warn hover:bg-warn/5'
                  }`}
                >
                  {selecionado.banido ? 'Reativar conta' : 'Desativar conta'}
                </button>

                {confirmarId === selecionado.id ? (
                  <div className="space-y-2">
                    <p className="text-[12px] text-warn">Excluir permanentemente? Esta ação é irreversível.</p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => excluir(selecionado.id)}
                        className="flex-1 py-2 rounded-[10px] bg-warn text-white text-[12px] font-semibold hover:opacity-90 transition"
                      >
                        Excluir
                      </button>
                      <button
                        onClick={() => setConfirmarId(null)}
                        className="flex-1 py-2 rounded-[10px] border border-border text-ink-2 text-[12px] hover:border-border-strong transition"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setConfirmarId(selecionado.id)}
                    className="w-full py-2 rounded-[10px] border border-warn/40 text-warn text-[12px] font-medium hover:bg-warn/5 transition"
                  >
                    Excluir usuário
                  </button>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center justify-center h-full text-ink-3 text-[13px]">
            Selecione um usuário
          </div>
        )}
      </div>
    </div>
  )
}
