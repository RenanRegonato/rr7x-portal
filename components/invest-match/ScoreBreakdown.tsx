// Visual do breakdown de score de um match. Server-safe (sem 'use client').
// Mostra as 10 dimensões estruturais + barras de score final/estruturado/semântico/LLM.

import { scoreColor } from '@/lib/invest-match/labels'

const DIM_LABEL: Record<string, string> = {
  setorial:      'Setorial',
  ticket:        'Ticket',
  stage:         'Estágio',
  maturity:      'Maturidade',
  governance:    'Governança',
  risk:          'Risco',
  geography:     'Geografia',
  documentation: 'Documentação',
  exit_horizon:  'Horizonte saída',
  urgency:       'Urgência',
}

interface DimValue { score?: number; peso?: number }

export default function ScoreBreakdown({
  scoreFinal, scoreEstruturado, scoreSemantico, scoreLlm, breakdown,
}: {
  scoreFinal:       number
  scoreEstruturado: number | null
  scoreSemantico:   number | null
  scoreLlm:         number | null
  breakdown:        Record<string, unknown> | null
}) {
  const dims = Object.entries(DIM_LABEL).map(([key, label]) => {
    const v = (breakdown?.[key] ?? {}) as DimValue
    return { key, label, score: typeof v.score === 'number' ? v.score : null, peso: v.peso }
  })

  return (
    <div className="space-y-4">
      {/* Scores macro */}
      <div className="grid grid-cols-4 gap-2">
        <MacroScore label="Final"      value={scoreFinal} bold/>
        <MacroScore label="Estrutural" value={scoreEstruturado}/>
        <MacroScore label="Semântico"  value={scoreSemantico}/>
        <MacroScore label="LLM"        value={scoreLlm}/>
      </div>

      {/* Dimensões estruturais */}
      <div className="space-y-1.5">
        {dims.map(d => (
          <div key={d.key} className="flex items-center gap-2">
            <span className="text-[11px] text-ink-2 w-28 shrink-0">{d.label}</span>
            <div className="flex-1 h-1.5 bg-surface-2 rounded-full overflow-hidden">
              <div
                className="h-full bg-accent-strong/70 rounded-full"
                style={{ width: `${d.score ?? 0}%` }}
              />
            </div>
            <span className="text-[11px] tabular-nums text-ink-3 w-8 text-right">
              {d.score != null ? Math.round(d.score) : '—'}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

function MacroScore({ label, value, bold }: { label: string; value: number | null; bold?: boolean }) {
  return (
    <div className="bg-surface-2 rounded-lg px-3 py-2 text-center">
      <div className="text-[10px] uppercase tracking-wider text-ink-3">{label}</div>
      <div className={`tabular-nums ${bold ? 'text-xl font-semibold' : 'text-base'} ${value != null ? scoreColor(value) : 'text-ink-3'}`}>
        {value != null ? Math.round(value) : '—'}
      </div>
    </div>
  )
}
