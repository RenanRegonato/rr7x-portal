/**
 * Lista de Ranking para Mapa Inteligente
 */

import Link from 'next/link'

interface RankingItem {
  position: number
  entidade: {
    id: string
    razao_social: string
    nome_fantasia?: string
    logo_url?: string
    score_relevancia?: number
  }
  value?: number | string
}

interface RankingListProps {
  items: RankingItem[]
  title?: string
  valueLabel?: string
}

export function RankingList({ items, title, valueLabel = 'Valor' }: RankingListProps) {
  if (items.length === 0) {
    return (
      <div className="bg-white border border-base-border rounded-lg p-6 text-center">
        <p className="text-base-ink/60">Nenhum ranking disponível</p>
      </div>
    )
  }

  return (
    <div className="bg-white border border-base-border rounded-lg overflow-hidden">
      {title && (
        <div className="px-4 py-3 border-b border-base-border/40">
          <h3 className="font-semibold text-base-ink text-sm">{title}</h3>
        </div>
      )}

      <div className="divide-y divide-base-border/40">
        {items.map((item) => (
          <Link
            key={item.position}
            href={`/dashboard/mapa-mercado/entidade/${item.entidade.id}`}
            className="flex items-center gap-4 px-4 py-3 hover:bg-base-bg transition"
          >
            <div className="font-bold text-lg text-accent w-8">{item.position}</div>

            {item.entidade.logo_url && (
              <img
                src={item.entidade.logo_url}
                alt={item.entidade.razao_social}
                className="w-8 h-8 rounded object-cover"
              />
            )}

            <div className="flex-1 min-w-0">
              <p className="font-medium text-base-ink truncate text-sm">
                {item.entidade.nome_fantasia || item.entidade.razao_social}
              </p>
            </div>

            {item.value && (
              <div className="text-right text-sm">
                <p className="font-semibold text-base-ink">{item.value}</p>
              </div>
            )}
          </Link>
        ))}
      </div>
    </div>
  )
}
