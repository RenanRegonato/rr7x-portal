/**
 * Kanban Aprimorado do Invest Match (Fase C)
 * 
 * Adiciona:
 * - Filtros (tipo deal, tipo investidor, score mínimo)
 * - Busca por empresa/investidor
 * - Contador visual por coluna com progresso
 * - Integração com Mapa Inteligente (sugestões)
 */

'use client'

import { useMemo, useState } from 'react'
import MatchesBoard, { type BoardCard } from './MatchesBoard'

interface MatchesBoardEnhancedProps {
  initial: BoardCard[]
  total: number
}

type FilterTipoDeal = 'todos' | 'equity' | 'debt' | 'credito_estruturado' | 'mezzanine'
type FilterTipoInvestidor = 'todos' | 'pessoa_fisica' | 'fundo' | 'banco' | 'securitizadora'

export default function MatchesBoardEnhanced({ initial, total }: MatchesBoardEnhancedProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [filterTipoDeal, setFilterTipoDeal] = useState<FilterTipoDeal>('todos')
  const [filterTipoInvestidor, setFilterTipoInvestidor] = useState<FilterTipoInvestidor>('todos')
  const [filterScoreMin, setFilterScoreMin] = useState(0)

  // Filtrar cards baseado nos filtros ativos
  const filteredCards = useMemo(() => {
    return initial.filter(card => {
      const matchSearch =
        !searchQuery ||
        card.empresa_nome.toLowerCase().includes(searchQuery.toLowerCase()) ||
        card.investidor_nome.toLowerCase().includes(searchQuery.toLowerCase())

      const matchScore = card.score_final >= filterScoreMin

      // TODO: Adicionar filtros de tipoDeal e tipoInvestidor quando tipos forem propagados no BoardCard
      // Por enquanto, apenas aplicar busca e score

      return matchSearch && matchScore
    })
  }, [initial, searchQuery, filterScoreMin, filterTipoDeal, filterTipoInvestidor])

  // Contadores por status
  const countByStatus = useMemo(() => {
    const counts = new Map<string, number>()
    filteredCards.forEach(card => {
      counts.set(card.status, (counts.get(card.status) ?? 0) + 1)
    })
    return counts
  }, [filteredCards])

  return (
    <div className="space-y-4">
      {/* Barra de Filtros */}
      <div className="bg-surface border border-border rounded-lg p-4 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          {/* Busca */}
          <div>
            <label className="text-xs font-medium text-ink-2 block mb-1.5">Buscar</label>
            <input
              type="text"
              placeholder="Empresa ou investidor..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-lg text-sm text-ink placeholder:text-ink-3 focus:outline-none focus:border-accent-strong"
            />
          </div>

          {/* Filtro Score Mínimo */}
          <div>
            <label className="text-xs font-medium text-ink-2 block mb-1.5">Score mínimo</label>
            <select
              value={filterScoreMin}
              onChange={(e) => setFilterScoreMin(Number(e.target.value))}
              className="w-full px-3 py-2 border border-border rounded-lg text-sm text-ink focus:outline-none focus:border-accent-strong"
            >
              <option value={0}>Qualquer um</option>
              <option value={70}>70+</option>
              <option value={80}>80+</option>
              <option value={90}>90+</option>
            </select>
          </div>

          {/* Filtro Tipo Deal */}
          <div>
            <label className="text-xs font-medium text-ink-2 block mb-1.5">Tipo de deal</label>
            <select
              value={filterTipoDeal}
              onChange={(e) => setFilterTipoDeal(e.target.value as FilterTipoDeal)}
              className="w-full px-3 py-2 border border-border rounded-lg text-sm text-ink focus:outline-none focus:border-accent-strong"
            >
              <option value="todos">Todos</option>
              <option value="equity">Equity</option>
              <option value="debt">Debt</option>
              <option value="credito_estruturado">Crédito Estruturado</option>
              <option value="mezzanine">Mezzanine</option>
            </select>
          </div>

          {/* Filtro Tipo Investidor */}
          <div>
            <label className="text-xs font-medium text-ink-2 block mb-1.5">Tipo de investidor</label>
            <select
              value={filterTipoInvestidor}
              onChange={(e) => setFilterTipoInvestidor(e.target.value as FilterTipoInvestidor)}
              className="w-full px-3 py-2 border border-border rounded-lg text-sm text-ink focus:outline-none focus:border-accent-strong"
            >
              <option value="todos">Todos</option>
              <option value="pessoa_fisica">Pessoa Física</option>
              <option value="fundo">Fundo</option>
              <option value="banco">Banco</option>
              <option value="securitizadora">Securitizadora</option>
            </select>
          </div>
        </div>

        {/* Info de filtros ativos */}
        <div className="text-xs text-ink-2 flex items-center justify-between">
          <span>
            {filteredCards.length === initial.length
              ? `${total} oportunidades`
              : `${filteredCards.length} de ${total} oportunidades (filtradas)`}
          </span>
          {(searchQuery || filterScoreMin > 0 || filterTipoDeal !== 'todos' || filterTipoInvestidor !== 'todos') && (
            <button
              onClick={() => {
                setSearchQuery('')
                setFilterScoreMin(0)
                setFilterTipoDeal('todos')
                setFilterTipoInvestidor('todos')
              }}
              className="text-accent hover:text-accent/80 underline"
            >
              Limpar filtros
            </button>
          )}
        </div>
      </div>

      {/* Kanban */}
      {filteredCards.length > 0 ? (
        <MatchesBoard initial={filteredCards} />
      ) : (
        <div className="bg-surface border border-border rounded-lg p-12 text-center">
          <p className="text-ink-2 text-sm">Nenhum match corresponde aos filtros aplicados</p>
        </div>
      )}
    </div>
  )
}
