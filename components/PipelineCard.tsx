'use client'

import { useState } from 'react'
import Pill from './Pill'
import { IconTrash } from './Icons'

export interface AnaliseCard {
  id:          string
  nome_ativo:  string
  status:      'processando' | 'concluido' | 'erro'
  criado_em:   string
  deal_intake: {
    tipoAtivo?: string
    objetivo?:  string
    [key: string]: unknown
  }
}

const THUMB_BY_TYPE: Record<string, string> = {
  'Empresa (M&A)':         'bg-peach',
  'Startup / Scale-up':    'bg-sky',
  'Agronegócio':           'bg-sage',
  'Imóvel / Real Estate':  'bg-sand',
  'Portfólio de Crédito':  'bg-lilac',
  'Franquia':              'bg-cream',
  'Outro':                 'bg-peach',
}

const STATUS_MAP: Record<string, { label: string; kind: 'live' | 'warn' | 'draft' }> = {
  processando: { label: 'Squad ativo',  kind: 'live'  },
  concluido:   { label: 'Pronto',       kind: 'live'  },
  erro:        { label: 'Erro',         kind: 'warn'  },
}

export default function PipelineCard({ analise, onClick, onDelete }: {
  analise:   AnaliseCard
  onClick:   () => void
  onDelete?: () => void
}) {
  const [confirm, setConfirm] = useState(false)

  const tipo   = analise.deal_intake?.tipoAtivo ?? ''
  const thumb  = THUMB_BY_TYPE[tipo] ?? 'bg-surface-2'
  const st     = STATUS_MAP[analise.status] ?? { label: analise.status, kind: 'draft' as const }
  const glyph  = analise.nome_ativo?.[0]?.toUpperCase() ?? '?'
  const date   = new Date(analise.criado_em).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })

  function handleDeleteClick(e: React.MouseEvent) {
    e.stopPropagation()
    if (confirm) {
      onDelete?.()
    } else {
      setConfirm(true)
      setTimeout(() => setConfirm(false), 2500)
    }
  }

  return (
    <article
      onClick={onClick}
      className="group bg-surface border border-border rounded-[14px] overflow-hidden flex flex-col cursor-pointer transition-all hover:shadow-soft-md hover:border-border-strong relative"
    >
      <div className={`h-[120px] grid place-items-center ${thumb}`}>
        <span className="font-display font-normal italic text-[44px] tracking-tight text-[oklch(0.32_0.06_50/0.7)]">
          {glyph}
        </span>
      </div>

      {onDelete && (
        <button
          onClick={handleDeleteClick}
          title={confirm ? 'Clique para confirmar' : 'Excluir análise'}
          className={`absolute top-2 right-2 flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium transition-all
            opacity-0 group-hover:opacity-100
            ${confirm
              ? 'bg-warn-soft text-warn border border-[oklch(0.85_0.06_20)] opacity-100'
              : 'bg-bg/80 text-ink-3 hover:text-warn border border-border backdrop-blur-sm'
            }`}
        >
          <IconTrash size={12}/>
          {confirm ? 'Confirmar?' : ''}
        </button>
      )}

      <div className="p-[14px_16px_16px] border-t border-border flex flex-col gap-1">
        <div className="text-[14px] font-semibold tracking-tight leading-tight">{analise.nome_ativo}</div>
        <div className="text-[12px] text-ink-3 flex items-center gap-1.5 flex-wrap">
          {tipo && <span>{tipo}</span>}
          <Pill kind={st.kind}>{st.label}</Pill>
        </div>
        <div className="text-[11px] text-ink-3 mt-0.5">{date}</div>
      </div>
    </article>
  )
}
