import AgentMark from './AgentMark';
import { IconCheck } from './Icons';

/**
 * AgentRow — linha de agente em execução.
 */
export default function AgentRow({ agent, pct, active, onClick }) {
  const done    = pct >= 100;
  const running = pct > 0 && pct < 100;

  return (
    <button
      onClick={onClick}
      className={`text-left w-full bg-surface border rounded-[14px] p-3.5 flex items-center gap-3 transition-all
                  ${active ? 'border-border-strong bg-surface-2' : 'border-border hover:border-border-strong'}`}
    >
      <AgentMark color={agent.color} initial={agent.initial} pulsing={running}/>

      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-baseline gap-2">
          <div className="text-[13px] font-semibold">{agent.name}</div>
          <div className="font-mono text-[11px] text-ink-3">
            {done ? '100%' : running ? `${Math.round(pct)}%` : '—'}
          </div>
        </div>
        <div className="text-[11px] text-ink-3 mb-1.5 truncate">{agent.role}</div>
        <div className="h-[3px] bg-surface-2 rounded-sm overflow-hidden">
          <div
            className="h-full transition-[width] duration-300"
            style={{ width: `${pct}%`, background: done ? 'oklch(0.6 0.1 155)' : 'oklch(0.66 0.14 32)' }}
          />
        </div>
      </div>

      {done && <IconCheck size={14} sw={2.5}/>}
    </button>
  );
}
