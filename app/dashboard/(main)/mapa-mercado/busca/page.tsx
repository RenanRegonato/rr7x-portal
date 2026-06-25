'use client'

import { Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'

function BuscaContent() {
  const searchParams = useSearchParams()
  const q = searchParams.get('q') || ''

  const resultados = []
  const total = 0

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div>
          <label className="text-xs font-medium text-base-ink/60 uppercase">Tipo</label>
          <select className="w-full mt-2 px-3 py-2 border border-base-border rounded-lg text-sm">
            <option>Todos</option>
            <option>Gestora</option>
            <option>FIDC</option>
            <option>Banco</option>
          </select>
        </div>
        <div>
          <label className="text-xs font-medium text-base-ink/60 uppercase">UF</label>
          <select className="w-full mt-2 px-3 py-2 border border-base-border rounded-lg text-sm">
            <option>Todos</option>
            <option>SP</option>
            <option>RJ</option>
          </select>
        </div>
        <div>
          <label className="text-xs font-medium text-base-ink/60 uppercase">&nbsp;</label>
          <button className="w-full mt-2 px-3 py-2 bg-accent text-white rounded-lg text-sm hover:bg-accent/90">
            Aplicar
          </button>
        </div>
      </div>

      <div className="text-center py-12">
        <p className="text-base-ink/60">Nenhum resultado encontrado</p>
      </div>
    </div>
  )
}

export default function BuscaPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-base-ink">Resultados da Busca</h1>
      <Suspense fallback={<div className="text-center text-base-ink/60">Carregando...</div>}>
        <BuscaContent />
      </Suspense>
    </div>
  )
}
