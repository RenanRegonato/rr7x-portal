import { ICONS_BY_NAME } from './Icons';

/**
 * Sidebar — navegação fixa à esquerda.
 * Props: current (id ativo), onNav(id), user
 */
export default function Sidebar({ current, onNav, user = { name: 'Ricardo Mendes', role: 'Sócio Jr' } }) {
  const items = [
    { id: 'home',       label: 'Início',     icon: 'home' },
    { id: 'pipeline',   label: 'Pipeline',   icon: 'pipeline', count: 8 },
    { id: 'squad',      label: 'Squad',      icon: 'squad' },
    { id: 'docs',       label: 'Documentos', icon: 'doc',     count: 47 },
    { id: 'frameworks', label: 'Frameworks', icon: 'sparkle' },
  ];
  const collections = [
    { label: 'Sell-Side', count: 5 },
    { label: 'Buy-Side',  count: 2 },
    { label: 'Crédito',   count: 4 },
  ];

  return (
    <aside className="border-r border-border bg-bg p-[18px_18px_24px] flex flex-col gap-6 sticky top-0 h-screen w-[240px]">
      <div>
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-accent grid place-items-center font-display italic font-semibold text-[16px] text-accent-ink">o</div>
          <div className="font-display font-medium text-[22px] tracking-tight">Otto</div>
          <div className="text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded bg-surface-2 text-ink-2 border border-border">Beta</div>
        </div>
        <div className="text-[11px] text-ink-3 ml-[38px] -mt-1 tracking-wide">Deal intelligence · XP</div>
      </div>

      <NavSection label="Workspace">
        {items.map((item) => (
          <NavItem key={item.id} {...item} active={current === item.id} onClick={() => onNav(item.id)}/>
        ))}
      </NavSection>

      <NavSection label="Coleções">
        {collections.map((c) => (
          <NavItem key={c.label} icon="folder" label={c.label} count={c.count}/>
        ))}
      </NavSection>

      <div className="mt-auto flex flex-col gap-1.5">
        <span className="inline-flex items-center gap-2 text-xs text-ink-2 bg-surface-2 border border-border px-2.5 py-1 rounded-full w-max">
          <span className="w-1.5 h-1.5 rounded-full bg-ok"/> Squad operacional
        </span>
        <span className="text-xs text-ink-3 px-2">{user.name} · {user.role}</span>
      </div>
    </aside>
  );
}

function NavSection({ label, children }) {
  return (
    <div className="flex flex-col gap-0.5">
      <div className="text-[10px] font-semibold uppercase tracking-wider text-ink-3 px-2 pb-1.5">{label}</div>
      {children}
    </div>
  );
}

function NavItem({ icon, label, count, active, onClick }) {
  const Ico = ICONS_BY_NAME[icon];
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2.5 px-2.5 py-[7px] rounded-md text-[13px] font-medium transition-colors text-left
        ${active ? 'bg-surface-2 text-ink' : 'text-ink-2 hover:bg-surface-hover hover:text-ink'}`}
    >
      {Ico && <Ico size={15}/>}
      <span className="flex-1">{label}</span>
      {count != null && <span className="text-[11px] text-ink-3 tabular-nums">{count}</span>}
    </button>
  );
}
