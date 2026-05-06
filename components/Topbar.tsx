'use client'

import { IconArrowLeft, IconBell, IconSearch } from './Icons'
import Pill from './Pill'

interface Tab { id: string; label: string }

interface TopbarProps {
  variant?:     'tabs' | 'context'
  tabs?:        Tab[]
  tab?:         string
  onTab?:       (id: string) => void
  title?:       string
  subtitle?:    string
  badge?:       { label: string; kind: 'live' | 'warn' | 'draft' }
  onBack?:      () => void
  right?:       React.ReactNode
  showSearch?:  boolean
  userInitials?: string
}

export default function Topbar({
  variant     = 'tabs',
  tabs        = [],
  tab,
  onTab,
  title,
  subtitle,
  badge,
  onBack,
  right,
  showSearch  = true,
  userInitials = 'RM',
}: TopbarProps) {
  return (
    <header className="flex items-center gap-4 px-8 py-3.5 border-b border-border bg-bg sticky top-0 z-10">
      {variant === 'context' ? (
        <>
          {onBack && (
            <button
              onClick={onBack}
              className="text-[12px] text-ink-2 hover:text-ink hover:bg-surface-2 px-2.5 py-1.5 rounded-md flex items-center gap-1.5 transition-colors"
            >
              <IconArrowLeft size={14}/> Voltar
            </button>
          )}
          <div className="flex items-center gap-2.5 ml-1 min-w-0">
            <div className="font-display text-[18px] font-medium tracking-tight truncate">{title}</div>
            {badge && <Pill kind={badge.kind}>{badge.label}</Pill>}
            {subtitle && <span className="text-[12px] text-ink-3 hidden sm:block">{subtitle}</span>}
          </div>
        </>
      ) : (
        <div className="flex items-center gap-1">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => onTab?.(t.id)}
              className={`px-3.5 py-[7px] rounded-md text-[13px] font-medium transition-colors
                ${tab === t.id ? 'bg-surface-2 text-ink' : 'text-ink-2 hover:text-ink'}`}
            >
              {t.label}
            </button>
          ))}
        </div>
      )}

      <div className="ml-auto flex items-center gap-2">
        {showSearch && variant === 'tabs' && <SearchInline/>}
        {right}
        {variant === 'tabs' && (
          <>
            <button className="w-8 h-8 grid place-items-center rounded-md text-ink-2 hover:bg-surface-2 hover:text-ink transition-colors">
              <IconBell size={16}/>
            </button>
            <div className="w-7 h-7 rounded-full bg-accent-soft text-accent-ink grid place-items-center text-[11px] font-semibold">
              {userInitials}
            </div>
          </>
        )}
      </div>
    </header>
  )
}

function SearchInline() {
  return (
    <div className="flex items-center gap-2 px-3 py-[7px] border border-border rounded-[10px] bg-surface w-[240px]">
      <span className="text-ink-3 flex-none"><IconSearch size={14}/></span>
      <input
        className="flex-1 bg-transparent outline-none text-[13px] placeholder:text-ink-3"
        placeholder="Buscar deals, ativos, setores..."
      />
      <span className="font-mono text-[10px] text-ink-3 border border-border rounded px-1 py-0.5 bg-bg">⌘K</span>
    </div>
  )
}
