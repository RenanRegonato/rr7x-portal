type PhaseStatus = 'done' | 'running' | 'pending'

export default function PhaseLabel({ n, label, status }: {
  n:      number
  label:  string
  status: PhaseStatus
}) {
  const dot: Record<PhaseStatus, string> = {
    done:    'bg-ok text-white border-transparent',
    running: 'bg-accent-strong text-white border-transparent',
    pending: 'bg-transparent text-ink-3 border-border-strong border-dashed',
  }
  const text: Record<PhaseStatus, string> = {
    done:    'text-ok',
    running: 'text-accent-strong',
    pending: 'text-ink-3',
  }
  const labelMap: Record<PhaseStatus, string> = {
    done:    'Concluído',
    running: 'Executando',
    pending: 'Em fila',
  }

  return (
    <div className="flex items-center gap-2.5 mb-2.5">
      <div className={`w-[22px] h-[22px] rounded-full grid place-items-center font-mono text-[11px] font-semibold border ${dot[status]}`}>
        {n}
      </div>
      <div className="text-[13px] font-semibold text-ink">{label}</div>
      <div className="flex-1 h-px bg-border"/>
      <div className={`text-[11px] font-medium uppercase tracking-wider ${text[status]}`}>
        {labelMap[status]}
      </div>
    </div>
  )
}
