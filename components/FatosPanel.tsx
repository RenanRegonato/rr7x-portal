'use client'

import { useCallback, useEffect, useState } from 'react'

interface Fact {
  id:            string
  fact_type:     string
  key:           string
  value:         Record<string, unknown>
  source_doc:    string | null
  source_page:   number | null
  source_quote:  string | null
  asserted_by:   string
  confidence:    number
  notes:         string | null
  criado_em:     string
}

const TYPE_LABEL: Record<string, { label: string; color: string; order: number }> = {
  documento_disponivel:  { label: 'Documentos',         color: 'bg-sky-50 text-sky-700 border-sky-200',           order: 1 },
  numero_financeiro:     { label: 'Números financeiros', color: 'bg-ok/10 text-ok border-ok/30',                  order: 2 },
  estrutura_societaria:  { label: 'Estrutura societária', color: 'bg-accent-soft text-accent-strong border-accent/30', order: 3 },
  contrato:              { label: 'Contratos',          color: 'bg-surface-2 text-ink-2 border-border',           order: 4 },
  garantia:              { label: 'Garantias',          color: 'bg-surface-2 text-ink-2 border-border',           order: 5 },
  passivo:               { label: 'Passivos',           color: 'bg-warn/10 text-warn border-warn/30',             order: 6 },
  evento_relevante:      { label: 'Eventos relevantes', color: 'bg-surface-2 text-ink-2 border-border',           order: 7 },
  lacuna:                { label: 'Lacunas',            color: 'bg-warn/10 text-warn border-warn/30',             order: 8 },
}

function fmtConf(c: number): { label: string; cls: string } {
  if (c >= 0.9) return { label: '✓ Alta',  cls: 'text-ok' }
  if (c >= 0.7) return { label: '∼ Média', cls: 'text-accent-strong' }
  return { label: '⚠ Baixa', cls: 'text-warn' }
}

function renderValue(fact: Fact): React.ReactNode {
  const v = fact.value
  switch (fact.fact_type) {
    case 'documento_disponivel': {
      const status = (v.disponivel === false || v.status === 'erro_leitura')
        ? <span className="text-warn">✗ não disponível</span>
        : <span className="text-ok">✓ disponível</span>
      return <span>{String(v.nome ?? fact.key)} — {status}</span>
    }
    case 'numero_financeiro': {
      const amount = typeof v.amount === 'number'
        ? v.amount.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 2 })
        : '?'
      return <span>{String(v.descricao ?? fact.key)}{v.periodo ? ` (${v.periodo})` : ''}: <strong>{String(v.unit ?? '')} {amount}</strong></span>
    }
    default:
      return <code className="text-[12px]">{JSON.stringify(v, null, 0).slice(0, 200)}</code>
  }
}

interface FatosPanelProps {
  analiseId:          string
  factsExtractedAt:   string | null
  onReextract:        () => void
}

export default function FatosPanel({ analiseId, factsExtractedAt, onReextract }: FatosPanelProps) {
  const [facts,   setFacts]   = useState<Fact[]>([])
  const [loading, setLoading] = useState(true)
  const [erro,    setErro]    = useState('')
  const [reextracting, setReextracting] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setErro('')
    try {
      const r = await fetch(`/api/analise/${analiseId}/fact-extract`, { cache: 'no-store' })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error || 'Erro ao listar')
      setFacts(d.facts ?? [])
    } catch (e) {
      setErro((e as Error).message)
    } finally {
      setLoading(false)
    }
  }, [analiseId])

  useEffect(() => { void load() }, [load])

  async function reextract() {
    if (!confirm('Re-extrair fatos? Os fatos existentes do extractor serão substituídos pela nova extração.')) return
    setReextracting(true)
    try {
      const r = await fetch(`/api/analise/${analiseId}/fact-extract?force=1`, { method: 'POST' })
      if (!r.ok) {
        const d = await r.json().catch(() => ({}))
        alert(d.error || 'Erro ao re-extrair')
        return
      }
      await load()
      onReextract()
    } finally {
      setReextracting(false)
    }
  }

  if (loading) {
    return <div className="text-ink-3 text-[13px] py-10 text-center">Carregando fatos...</div>
  }

  if (erro) {
    return <div className="rounded-[10px] bg-warn/10 text-warn text-[13px] p-4">{erro}</div>
  }

  // Agrupa por tipo
  const grupos = new Map<string, Fact[]>()
  for (const f of facts) {
    const arr = grupos.get(f.fact_type) ?? []
    arr.push(f)
    grupos.set(f.fact_type, arr)
  }
  const sortedTypes = Array.from(grupos.keys()).sort((a, b) =>
    (TYPE_LABEL[a]?.order ?? 99) - (TYPE_LABEL[b]?.order ?? 99)
  )

  return (
    <div className="bg-surface border border-border rounded-[14px] shadow-soft-sm overflow-hidden">
      <div className="flex items-center justify-between px-7 py-4 border-b border-border">
        <div>
          <h2 className="font-display text-[18px] font-medium">Fatos consolidados (Truth Layer)</h2>
          <p className="text-[11px] text-ink-3 mt-0.5">
            {facts.length} fato{facts.length === 1 ? '' : 's'} extraído{facts.length === 1 ? '' : 's'} da ingestão documental
            {factsExtractedAt && ` · última extração em ${new Date(factsExtractedAt).toLocaleString('pt-BR')}`}
          </p>
        </div>
        <button
          onClick={reextract}
          disabled={reextracting}
          className="text-[12px] text-ink-3 hover:text-ink flex items-center gap-1.5 disabled:opacity-40"
        >
          {reextracting ? 'Re-extraindo...' : '↺ Re-extrair fatos'}
        </button>
      </div>

      <div className="p-7">
        {facts.length === 0 ? (
          <div className="text-center py-10 text-[13px] text-ink-3">
            <p>Nenhum fato extraído ainda.</p>
            <p className="mt-1">A extração roda automaticamente após a ingestão dos documentos.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {sortedTypes.map(tipo => {
              const cfg = TYPE_LABEL[tipo] ?? { label: tipo, color: 'bg-surface-2 text-ink-2 border-border', order: 99 }
              const items = grupos.get(tipo) ?? []
              return (
                <div key={tipo}>
                  <div className="flex items-center gap-2 mb-3">
                    <span className={`text-[11px] px-2 py-0.5 rounded-full border ${cfg.color}`}>
                      {cfg.label}
                    </span>
                    <span className="text-[11px] text-ink-3">{items.length} fato{items.length === 1 ? '' : 's'}</span>
                  </div>
                  <div className="space-y-1.5">
                    {items.map(f => {
                      const conf = fmtConf(f.confidence)
                      return (
                        <div key={f.id} className="rounded-[8px] bg-bg border border-border p-3 text-[13px]">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="font-mono text-[11px] text-ink-3 mb-0.5">[F:{f.fact_type}:{f.key}]</div>
                              <div>{renderValue(f)}</div>
                              {f.source_doc && (
                                <div className="text-[11px] text-ink-3 mt-1">
                                  fonte: {f.source_doc}{f.source_page ? `, p${f.source_page}` : ''}
                                  {f.source_quote && <span className="ml-2 italic">"{f.source_quote.slice(0, 100)}{f.source_quote.length > 100 ? '...' : ''}"</span>}
                                </div>
                              )}
                              {f.notes && (
                                <div className="text-[11px] text-ink-3 mt-1 italic">{f.notes}</div>
                              )}
                            </div>
                            <span className={`text-[11px] shrink-0 ${conf.cls}`}>{conf.label}</span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
