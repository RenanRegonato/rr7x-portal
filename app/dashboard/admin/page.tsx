'use client'

import { useEffect, useState } from 'react'

type Metricas = {
  totalClientes: number
  subsAtivas: number
  porPlano: { avulso: number; recorrente: number; enterprise: number }
  totalAnalises: number
  analisesHoje: number
  porStatus: { concluido: number; processando: number; erro: number }
}

function Card({ label, valor, sub }: { label: string; valor: string | number; sub?: string }) {
  return (
    <div className="bg-surface border border-border rounded-[14px] p-5 shadow-soft-sm">
      <p className="text-[11px] text-ink-3 mb-1 uppercase tracking-wide font-medium">{label}</p>
      <p className="font-display text-[32px] font-medium text-ink">{valor}</p>
      {sub && <p className="text-[12px] text-ink-3 mt-1">{sub}</p>}
    </div>
  )
}

export default function AdminOverview() {
  const [m, setM]           = useState<Metricas | null>(null)
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null)

  function load() {
    fetch('/api/admin/metricas').then(r => r.json()).then(d => {
      setM(d)
      setUpdatedAt(new Date())
    })
  }

  useEffect(() => {
    load()
    const t = setInterval(load, 30_000)
    return () => clearInterval(t)
  }, [])

  if (!m) return <div className="p-8 text-ink-3 text-[13px]">Carregando...</div>

  const fmtTime = (d: Date) => d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })

  return (
    <div className="p-8 max-w-4xl">
      <div className="flex items-baseline justify-between mb-1">
        <h1 className="font-display text-[24px] font-medium tracking-tight">Overview</h1>
        {updatedAt && (
          <button onClick={load} className="text-[11px] text-ink-3 hover:text-ink transition">
            Atualizado às {fmtTime(updatedAt)} · Atualizar
          </button>
        )}
      </div>
      <p className="text-ink-3 text-[13px] mb-8">Visão geral da plataforma em tempo real</p>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Card label="Clientes" valor={m.totalClientes} />
        <Card label="Licenças ativas" valor={m.subsAtivas} sub={`de ${m.totalClientes} cadastrados`} />
        <Card label="Análises rodadas" valor={m.totalAnalises} sub={`${m.analisesHoje} hoje`} />
        <Card label="Taxa de ativação" valor={`${m.totalClientes ? Math.round((m.subsAtivas / m.totalClientes) * 100) : 0}%`} sub="clientes com plano" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-surface border border-border rounded-[14px] p-5 shadow-soft-sm">
          <h2 className="text-[13px] font-semibold mb-4 text-ink">Distribuição por plano</h2>
          <div className="space-y-3">
            {[
              { label: 'Avulso',      valor: m.porPlano.avulso,      cor: 'bg-peach'  },
              { label: 'Recorrente',  valor: m.porPlano.recorrente,  cor: 'bg-sky'    },
              { label: 'Enterprise',  valor: m.porPlano.enterprise,  cor: 'bg-lilac'  },
            ].map(p => (
              <div key={p.label}>
                <div className="flex justify-between text-[13px] mb-1.5">
                  <span className="text-ink-2">{p.label}</span>
                  <span className="font-semibold text-ink">{p.valor}</span>
                </div>
                <div className="h-1.5 bg-surface-2 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${p.cor} rounded-full transition-all`}
                    style={{ width: m.subsAtivas ? `${(p.valor / m.subsAtivas) * 100}%` : '0%' }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-surface border border-border rounded-[14px] p-5 shadow-soft-sm">
          <h2 className="text-[13px] font-semibold mb-4 text-ink">Análises por status</h2>
          <div className="space-y-3">
            {[
              { label: 'Concluídas',  valor: m.porStatus.concluido,   color: 'text-ok'   },
              { label: 'Processando', valor: m.porStatus.processando,  color: 'text-ink-2' },
              { label: 'Com erro',    valor: m.porStatus.erro,         color: 'text-warn'  },
            ].map(s => (
              <div key={s.label} className="flex items-center justify-between">
                <span className="text-ink-2 text-[13px]">{s.label}</span>
                <span className={`font-display text-[24px] font-medium ${s.color}`}>{s.valor}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
