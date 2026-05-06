'use client'

import { useEffect, useState } from 'react'

type UserRole = 'admin' | 'gerente' | 'assessor'

type Usuario = {
  id:              string
  email:           string
  criado_em:       string
  ultimo_login:    string | null
  role:            UserRole
  escritorio_id:   string | null
  escritorio_nome: string | null
}

type Escritorio = { id: string; nome: string }

const ROLE_CONFIG: Record<UserRole, { label: string; cls: string }> = {
  admin:    { label: 'Admin',    cls: 'text-warn bg-warn/10 border-warn/30'     },
  gerente:  { label: 'Gerente',  cls: 'text-sky-700 bg-sky/10 border-sky/30'   },
  assessor: { label: 'Assessor', cls: 'text-ink-2 bg-surface-2 border-border'  },
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

  useEffect(() => {
    fetch('/api/admin/usuarios').then(r => r.json()).then(d => {
      setUsuarios(d.usuarios ?? [])
      setEscritorios(d.escritorios ?? [])
      setLoading(false)
    })
  }, [])

  function selecionar(u: Usuario) {
    setSelecionado(u)
    setEditRole(u.role)
    setEditEscId(u.escritorio_id ?? '')
    setMsg('')
  }

  async function salvar() {
    if (!selecionado) return
    setSalvando(true)
    setMsg('')
    const res = await fetch('/api/admin/usuarios', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id:      selecionado.id,
        role:         editRole,
        escritorio_id: editEscId || null,
      }),
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

  const fmt = (d: string | null) => d
    ? new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' })
    : '—'

  const filtrados = usuarios.filter(u => u.email?.toLowerCase().includes(busca.toLowerCase()))

  return (
    <div className="flex h-full">
      {/* Lista */}
      <div className="flex-1 p-6 overflow-y-auto border-r border-border flex flex-col">
        <div className="mb-4">
          <h1 className="font-display text-[22px] font-medium tracking-tight">Usuários</h1>
          <p className="text-[13px] text-ink-3">{usuarios.length} cadastrados</p>
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
                      <p className="text-[13px] font-medium text-ink">{u.email}</p>
                      <p className="text-[11px] text-ink-3 mt-0.5">
                        Cadastro: {fmt(u.criado_em)}
                        {u.escritorio_nome && ` · ${u.escritorio_nome}`}
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
                Conta administrativa — perfil não editável.
              </p>
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
