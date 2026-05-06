'use client'

import Pill from './Pill'

export interface LogLine {
  time:  string
  agent: string
  msg:   string
}

export default function LiveLog({ lines, isLive = true }: {
  lines:   LogLine[]
  isLive?: boolean
}) {
  return (
    <div className="bg-surface border border-border rounded-[14px] shadow-soft-sm overflow-hidden">
      <div className="px-[18px] py-3.5 border-b border-border flex items-center justify-between">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-ink-3">Log do squad</div>
        {isLive && <Pill kind="live">ao vivo</Pill>}
      </div>
      <div className="max-h-[260px] overflow-auto py-2 font-mono text-[11px]">
        {lines.length === 0 ? (
          <div className="px-[18px] py-3 text-ink-3">Aguardando início...</div>
        ) : (
          lines.map((l, i) => (
            <div key={i} className="grid grid-cols-[42px_72px_1fr] gap-2.5 px-[18px] py-[5px] text-ink-2">
              <span className="text-ink-3">{l.time}</span>
              <span className="text-accent-ink font-semibold truncate">{l.agent}</span>
              <span>{l.msg}</span>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
