import { useEffect, useState } from 'react';
import { AGENTS } from '../data/mocks';
import Topbar from './Topbar';
import PhaseLabel from './PhaseLabel';
import AgentRow from './AgentRow';
import AgentMark from './AgentMark';
import LiveLog from './LiveLog';
import Pill from './Pill';
import { IconCheck, IconClock } from './Icons';

/**
 * SquadView — execução ao vivo dos 9 agentes.
 * Em produção, substituir o setInterval por stream real (WebSocket/SSE).
 */
export default function SquadView({ onBack, onComplete, dealName = 'Projeto Aurora' }) {
  const [progress, setProgress] = useState(() => AGENTS.map((_, i) => (i === 0 ? 100 : 0)));
  const [active, setActive]     = useState('otto');
  const [elapsed, setElapsed]   = useState(0);

  useEffect(() => {
    const t = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const t = setInterval(() => {
      setProgress((prev) => {
        const next = [...prev];
        for (let i = 1; i <= 6; i++) {
          if (next[0] >= 100 && next[i] < 100) next[i] = Math.min(100, next[i] + Math.random() * 4 + 1);
        }
        if (next.slice(1, 7).every((v) => v >= 100) && next[7] < 100) next[7] = Math.min(100, next[7] + 3);
        if (next[7] >= 100 && next[8] < 100) next[8] = Math.min(100, next[8] + 4);
        return next;
      });
    }, 280);
    return () => clearInterval(t);
  }, []);

  const overall = Math.round(progress.reduce((a, b) => a + b, 0) / AGENTS.length);
  const fmt = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  const phase1 = progress[0] >= 100 ? 'done' : 'running';
  const phase2 = progress.slice(1, 7).every((v) => v >= 100) ? 'done' : progress[0] >= 100 ? 'running' : 'pending';
  const phase3 = progress[7] >= 100 ? 'done' : phase2 === 'done' ? 'running' : 'pending';
  const phase4 = progress[8] >= 100 ? 'done' : progress[7] >= 100 ? 'running' : 'pending';

  return (
    <div className="flex flex-col min-h-screen">
      <Topbar
        variant="context"
        title={dealName}
        badge={{ label: 'Squad ativo', kind: 'live' }}
        onBack={onBack}
        right={
          <>
            <span className="font-mono text-[12px] text-ink-2 flex items-center gap-1.5">
              <IconClock size={12}/> {fmt(elapsed)}
            </span>
            <button
              onClick={onComplete}
              className="ml-2 inline-flex items-center gap-2 px-3.5 py-2 rounded-[10px] border border-border-strong bg-surface text-[13px] font-medium hover:bg-surface-2"
            >
              <IconCheck size={13}/> Concluir e revisar
            </button>
          </>
        }
      />

      <div className="grid grid-cols-[1fr_360px] gap-7 p-[28px_32px] items-start">
        <section>
          <header className="flex items-baseline justify-between mb-5">
            <h2 className="font-display font-medium text-[24px] tracking-tight m-0">Squad em execução</h2>
            <div className="text-[12px] text-ink-3">
              {overall}% · ETA {fmt(Math.max(0, Math.round((100 - overall) * 5)))}
            </div>
          </header>

          <PhaseLabel n={1} label="Orquestração" status={phase1}/>
          <div className="grid grid-cols-1 gap-2.5 mb-5">
            <AgentRow agent={AGENTS[0]} pct={progress[0]} active={active === 'otto'} onClick={() => setActive('otto')}/>
          </div>

          <PhaseLabel n={2} label="Análises em paralelo" status={phase2}/>
          <div className="grid grid-cols-2 gap-2.5 mb-5">
            {AGENTS.slice(1, 7).map((a, i) => (
              <AgentRow key={a.id} agent={a} pct={progress[i + 1]} active={active === a.id} onClick={() => setActive(a.id)}/>
            ))}
          </div>

          <PhaseLabel n={3} label="Veredicto de Maturidade" status={phase3}/>
          <div className="grid grid-cols-1 gap-2.5 mb-5">
            <AgentRow agent={AGENTS[7]} pct={progress[7]} active={active === 'paulo'} onClick={() => setActive('paulo')}/>
          </div>

          <PhaseLabel n={4} label="Revisão cruzada" status={phase4}/>
          <div className="grid grid-cols-1 gap-2.5">
            <AgentRow agent={AGENTS[8]} pct={progress[8]} active={active === 'rafael'} onClick={() => setActive('rafael')}/>
          </div>
        </section>

        <aside className="flex flex-col gap-4 sticky top-20">
          <ActiveAgentPanel agent={AGENTS.find((a) => a.id === active)}/>
          <LiveLogPanel progress={progress}/>
        </aside>
      </div>
    </div>
  );
}

function ActiveAgentPanel({ agent }) {
  return (
    <div className="bg-surface border border-border rounded-[14px] shadow-soft-sm p-[18px]">
      <div className="text-[11px] font-semibold uppercase tracking-wider text-ink-3">Especialista</div>
      <div className="flex items-center gap-2.5 mt-2.5">
        <AgentMark color={agent.color} initial={agent.initial}/>
        <div>
          <div className="font-display text-[18px] font-medium tracking-tight">{agent.name}</div>
          <div className="text-[12px] text-ink-3">{agent.role}</div>
        </div>
      </div>
      <p className="text-[13px] text-ink-2 mt-3.5 leading-relaxed">{agent.deliverable}</p>
    </div>
  );
}

function LiveLogPanel({ progress }) {
  return (
    <div className="bg-surface border border-border rounded-[14px] shadow-soft-sm overflow-hidden">
      <div className="px-[18px] py-3.5 border-b border-border flex items-center justify-between">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-ink-3">Log do squad</div>
        <Pill kind="live">ao vivo</Pill>
      </div>
      <LiveLog progress={progress}/>
    </div>
  );
}
