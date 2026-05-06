/**
 * PhaseLabel — separador horizontal de fases dentro do SquadView.
 */
export default function PhaseLabel({ n, label, status }) {
  const dot = {
    done:    'bg-ok text-white border-transparent',
    running: 'bg-accent-strong text-white border-transparent',
    pending: 'bg-transparent text-ink-3 border-border-strong border-dashed',
  }[status];
  const text = {
    done:    'text-ok',
    running: 'text-accent-strong',
    pending: 'text-ink-3',
  }[status];
  const labelMap = { done: 'Concluído', running: 'Executando', pending: 'Em fila' };

  return (
    <div className="flex items-center gap-2.5 mb-2.5">
      <div className={`w-[22px] h-[22px] rounded-full grid place-items-center font-mono text-[11px] font-semibold border ${dot}`}>{n}</div>
      <div className="text-[13px] font-semibold text-ink">{label}</div>
      <div className="flex-1 h-px bg-border"/>
      <div className={`text-[11px] font-medium uppercase tracking-wider ${text}`}>{labelMap[status]}</div>
    </div>
  );
}
