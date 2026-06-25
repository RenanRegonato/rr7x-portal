/**
 * Mapa Inteligente do Mercado — Dashboard
 * 
 * Entrada do módulo com busca unificada, cards de totais,
 * rankings destaque e navegação para módulos
 */

'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function MapaMercadoPage() {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState('')
  const [isSearching, setIsSearching] = useState(false)

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    if (!searchQuery.trim()) return

    setIsSearching(true)
    // Redirecionar para página de resultados com query
    router.push(`/dashboard/mapa-mercado/busca?q=${encodeURIComponent(searchQuery)}`)
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-base-ink">Mapa Inteligente do Mercado</h1>
          <p className="text-sm text-base-ink/60 mt-1">
            Inteligência de mercado de capitais — gestoras, FIDCs, securitizadoras, bancos
          </p>
        </div>
      </div>

      {/* Busca Principal */}
      <div className="bg-white border border-base-border rounded-lg p-6">
        <form onSubmit={handleSearch} className="space-y-4">
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar fundo, gestora, banco, FIDC, securitizadora..."
              className="w-full px-4 py-3 border border-base-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/50"
            />
            <button
              type="submit"
              disabled={isSearching}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-accent hover:text-accent/80 disabled:opacity-50"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </button>
          </div>
          <p className="text-xs text-base-ink/50">
            Comece digitando para buscar por nome, CNPJ, tipo ou localidade
          </p>
        </form>
      </div>

      {/* Cards de Totais */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white border border-base-border rounded-lg p-4">
          <p className="text-xs font-medium text-base-ink/60 uppercase">Gestoras</p>
          <p className="text-2xl font-semibold text-base-ink mt-2">1.842</p>
          <p className="text-xs text-base-ink/60 mt-1">AUM: R$ 7,1T</p>
        </div>

        <div className="bg-white border border-base-border rounded-lg p-4">
          <p className="text-xs font-medium text-base-ink/60 uppercase">FIDCs</p>
          <p className="text-2xl font-semibold text-base-ink mt-2">2.107</p>
          <p className="text-xs text-base-ink/60 mt-1">PL: R$ 480B</p>
        </div>

        <div className="bg-white border border-base-border rounded-lg p-4">
          <p className="text-xs font-medium text-base-ink/60 uppercase">Securitizadoras</p>
          <p className="text-2xl font-semibold text-base-ink mt-2">312</p>
          <p className="text-xs text-base-ink/60 mt-1">CRI/CRA</p>
        </div>

        <div className="bg-white border border-base-border rounded-lg p-4">
          <p className="text-xs font-medium text-base-ink/60 uppercase">Bancos</p>
          <p className="text-2xl font-semibold text-base-ink mt-2">168</p>
          <p className="text-xs text-base-ink/60 mt-1">Carteira PJ</p>
        </div>
      </div>

      {/* Navegação para Módulos */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link
          href="/dashboard/mapa-mercado/rankings"
          className="bg-white border border-base-border rounded-lg p-6 hover:border-accent/50 transition"
        >
          <h3 className="font-semibold text-base-ink mb-2">Rankings Proprietários</h3>
          <p className="text-sm text-base-ink/60">
            Gestoras por AUM, administradores por nº de FIDCs, distribuidores por alcance
          </p>
        </Link>

        <Link
          href="/dashboard/mapa-mercado/conexoes"
          className="bg-white border border-base-border rounded-lg p-6 hover:border-accent/50 transition"
        >
          <h3 className="font-semibold text-base-ink mb-2">Mapa de Conexões</h3>
          <p className="text-sm text-base-ink/60">
            Grafo de relacionamentos — quem trabalha com quem, co-investimentos
          </p>
        </Link>

        <Link
          href="/dashboard/mapa-mercado/comparador"
          className="bg-white border border-base-border rounded-lg p-6 hover:border-accent/50 transition"
        >
          <h3 className="font-semibold text-base-ink mb-2">Comparador</h3>
          <p className="text-sm text-base-ink/60">
            Lado a lado: AUM, veículos, captação, principais parceiros
          </p>
        </Link>
      </div>

      {/* Integração com Invest Match */}
      <div className="bg-accent/5 border border-accent/20 rounded-lg p-6">
        <h3 className="font-semibold text-base-ink mb-2">Integrado com Invest Match</h3>
        <p className="text-sm text-base-ink/70 mb-4">
          O Mapa Inteligente alimenta o motor de matching — encontre o investidor certo para cada deal
          com base na inteligência de mercado.
        </p>
        <Link
          href="/dashboard/invest-match"
          className="text-accent hover:text-accent/80 text-sm font-medium"
        >
          Ir para Invest Match →
        </Link>
      </div>

      {/* Rodapé com Atribuição */}
      <div className="pt-4 border-t border-base-border/40">
        <p className="text-xs text-base-ink/50">
          Fontes: <span className="inline-flex gap-2">
            <span>CVM Dados Abertos</span>
            <span>•</span>
            <span>BCB</span>
            <span>•</span>
            <span>B3</span>
            <span>•</span>
            <span>Receita Federal</span>
          </span>
          <br />
          Dados públicos sob licença ODbL — atualizado hoje às 08:12
        </p>
      </div>
    </div>
  )
}
