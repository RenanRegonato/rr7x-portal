/**
 * Card de Entidade para Mapa Inteligente
 */

import Link from 'next/link'
import type { MercadoEntidade } from '@/lib/mapa-mercado/types'

interface EntidadeCardProps {
  entidade: MercadoEntidade
}

export function EntidadeCard({ entidade }: EntidadeCardProps) {
  return (
    <Link
      href={`/dashboard/mapa-mercado/entidade/${entidade.id}`}
      className="block bg-white border border-base-border rounded-lg p-4 hover:border-accent/50 hover:shadow-sm transition"
    >
      <div className="flex items-start gap-4">
        {entidade.logo_url && (
          <img
            src={entidade.logo_url}
            alt={entidade.razao_social}
            className="w-12 h-12 rounded object-cover flex-shrink-0"
          />
        )}

        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-base-ink truncate">
            {entidade.nome_fantasia || entidade.razao_social}
          </h3>

          <div className="flex items-center gap-2 mt-2">
            {entidade.tipos.map((tipo) => (
              <span
                key={tipo}
                className="inline-block text-xs px-2 py-1 bg-base-bg border border-base-border/50 rounded text-base-ink/70"
              >
                {tipo}
              </span>
            ))}
          </div>

          {entidade.uf && (
            <p className="text-xs text-base-ink/60 mt-2">
              {entidade.municipio}, {entidade.uf}
            </p>
          )}
        </div>

        {entidade.score_relevancia && (
          <div className="flex flex-col items-center justify-center bg-base-bg rounded p-3 flex-shrink-0">
            <p className="text-lg font-bold text-accent">{entidade.score_relevancia}</p>
            <p className="text-xs text-base-ink/60">Score</p>
          </div>
        )}
      </div>
    </Link>
  )
}
