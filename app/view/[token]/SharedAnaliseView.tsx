'use client'

import { useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

const TABS = [
  { key: 'relatorio_consolidado', label: 'Resumo Executivo' },
  { key: 'drive_intake',          label: 'Ingestão'         },
  { key: 'orchestration',         label: 'Orquestração'     },
  { key: 'pesquisa',              label: 'Mercado'          },
  { key: 'diagnostico',           label: 'Diagnóstico'      },
  { key: 'analise_ma',            label: 'M&A'              },
  { key: 'contratos',             label: 'Contratos'        },
  { key: 'originacao',            label: 'Originação'       },
  { key: 'estruturacao',          label: 'Estruturação'     },
  { key: 'maturidade',            label: 'Maturidade'       },
  { key: 'revisao',               label: 'Revisão'          },
  { key: 'blind_teaser',          label: 'Blind Teaser'     },
  { key: 'sell_side_pitchbook',   label: 'Pitchbook'        },
]

export default function SharedAnaliseView({ analise }: { analise: any }) {
  const outputs: Record<string, string> = analise.outputs ?? {}
  const visibleTabs = TABS.filter((t) => outputs[t.key])
  const [activeTab, setActiveTab] = useState(
    outputs.relatorio_consolidado ? 'relatorio_consolidado' : (visibleTabs[0]?.key ?? '')
  )

  return (
    <div className="min-h-screen bg-bg flex flex-col">
      {/* Header */}
      <header className="border-b border-border bg-surface px-8 py-4 flex items-center justify-between sticky top-0 z-10">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-3 mb-0.5">RR7x Capital Hub</p>
          <h1 className="font-display text-[18px] font-medium text-ink leading-none">{analise.nome_ativo}</h1>
        </div>
        <div className="text-right">
          <p className="text-[10px] text-ink-3 uppercase tracking-wide">Deal Intelligence</p>
          <p className="text-[11px] text-ink-2 font-medium">Link público · somente leitura</p>
        </div>
      </header>

      {/* Tab nav */}
      <nav className="px-8 border-b border-border flex gap-1 bg-bg overflow-x-auto">
        {visibleTabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={`px-3.5 py-3 text-[13px] font-medium border-b-2 transition-colors whitespace-nowrap
              ${activeTab === t.key ? 'text-ink border-accent-strong' : 'text-ink-2 border-transparent hover:text-ink'}`}
          >
            {t.label}
          </button>
        ))}
      </nav>

      {/* Content */}
      <main className="flex-1 p-8">
        {activeTab && outputs[activeTab] ? (
          <div className="bg-surface border border-border rounded-[14px] shadow-soft-sm overflow-hidden max-w-4xl mx-auto">
            <div className="px-7 py-4 border-b border-border">
              <h2 className="font-display text-[18px] font-medium">
                {TABS.find((t) => t.key === activeTab)?.label ?? activeTab}
              </h2>
            </div>
            <div className="px-7 py-6">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  h1: ({ children }) => <h1 className="font-display text-[24px] font-medium tracking-tight mt-6 mb-3 text-ink">{children}</h1>,
                  h2: ({ children }) => <h2 className="font-display text-[20px] font-medium tracking-tight mt-5 mb-2.5 text-ink">{children}</h2>,
                  h3: ({ children }) => <h3 className="text-[15px] font-semibold mt-4 mb-2 text-ink">{children}</h3>,
                  h4: ({ children }) => <h4 className="text-[13px] font-semibold mt-3 mb-1.5 text-ink">{children}</h4>,
                  p:  ({ children }) => <p className="text-[13px] text-ink-2 leading-[1.7] mb-3">{children}</p>,
                  ul: ({ children }) => <ul className="list-disc pl-5 mb-3 space-y-1 text-[13px] text-ink-2">{children}</ul>,
                  ol: ({ children }) => <ol className="list-decimal pl-5 mb-3 space-y-1 text-[13px] text-ink-2">{children}</ol>,
                  li: ({ children }) => <li className="leading-[1.7]">{children}</li>,
                  strong: ({ children }) => <strong className="font-semibold text-ink">{children}</strong>,
                  code: ({ children }) => <code className="font-mono text-[12px] bg-bg-tint px-1.5 py-0.5 rounded text-accent-ink">{children}</code>,
                  pre: ({ children }) => <pre className="bg-bg-tint rounded-[10px] p-4 overflow-x-auto font-mono text-[12px] mb-3">{children}</pre>,
                  table: ({ children }) => <div className="overflow-x-auto mb-4"><table className="w-full text-[13px] border-collapse">{children}</table></div>,
                  thead: ({ children }) => <thead className="border-b border-border">{children}</thead>,
                  th: ({ children }) => <th className="text-left py-2 pr-4 font-semibold text-ink">{children}</th>,
                  td: ({ children }) => <td className="py-2 pr-4 text-ink-2 border-b border-border">{children}</td>,
                  blockquote: ({ children }) => <blockquote className="border-l-2 border-accent pl-4 text-ink-2 italic my-3">{children}</blockquote>,
                  hr: () => <hr className="border-border my-5"/>,
                }}
              >
                {outputs[activeTab]}
              </ReactMarkdown>
            </div>
          </div>
        ) : (
          <div className="text-center text-ink-3 text-[13px] mt-16">Selecione uma aba acima.</div>
        )}
      </main>

      <footer className="border-t border-border px-8 py-4 text-center text-[11px] text-ink-3">
        RR7x Capital Hub · Deal Intelligence · documento confidencial gerado por IA
      </footer>
    </div>
  )
}
