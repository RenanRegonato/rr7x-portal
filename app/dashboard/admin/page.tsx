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
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className="text-3xl font-bold text-white">{valor}</p>
      {sub && <p className="text-xs text-gray-500 mt-1">{sub}</p>}
    </div>
  )
}

export default function AdminOverview() {
  const [m, setM] = useState<Metricas | null>(null)

  useEffect(() => {
    fetch('/api/admin/metricas').then(r => r.json()).then(setM)
  }, [])

  if (!m) return <div className="p-8 text-gray-500 text-sm">Carregando...</div>

  return (
    <div className="p-8">
      <h1 className="text-xl font-bold mb-1">Overview</h1>
      <p className="text-gray-500 text-sm mb-8">Visão geral da plataforma em tempo real</p>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Card label="Clientes cadastrados" valor={m.totalClientes} />
        <Card label="Licenças ativas" valor={m.subsAtivas} sub={`de ${m.totalClientes} cadastrados`} />
        <Card label="Análises rodadas" valor={m.totalAnalises} sub={`${m.analisesHoje} hoje`} />
        <Card label="Taxa de ativação" valor={`${m.totalClientes ? Math.round((m.subsAtivas / m.totalClientes) * 100) : 0}%`} sub="clientes com plano ativo" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Planos */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <h2 className="text-sm font-semibold mb-4 text-gray-300">Distribuição por plano</h2>
          <div className="space-y-3">
            {[
              { label: 'Avulso', valor: m.porPlano.avulso, cor: 'bg-cyan-500' },
              { label: 'Recorrente', valor: m.porPlano.recorrente, cor: 'bg-indigo-500' },
              { label: 'Enterprise', valor: m.porPlano.enterprise, cor: 'bg-purple-500' },
            ].map(p => (
              <div key={p.label}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-400">{p.label}</span>
                  <span className="font-semibold">{p.valor}</span>
                </div>
                <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${p.cor} rounded-full transition-all`}
                    style={{ width: m.subsAtivas ? `${(p.valor / m.subsAtivas) * 100}%` : '0%' }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Análises por status */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <h2 className="text-sm font-semibold mb-4 text-gray-300">Análises por status</h2>
          <div className="space-y-3">
            {[
              { label: 'Concluídas', valor: m.porStatus.concluido, cor: 'text-green-400', bg: 'bg-green-400' },
              { label: 'Processando', valor: m.porStatus.processando, cor: 'text-yellow-400', bg: 'bg-yellow-400' },
              { label: 'Com erro', valor: m.porStatus.erro, cor: 'text-red-400', bg: 'bg-red-400' },
            ].map(s => (
              <div key={s.label} className="flex items-center justify-between">
                <span className="text-gray-400 text-sm">{s.label}</span>
                <span className={`font-bold text-lg ${s.cor}`}>{s.valor}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
