type PillKind = 'live' | 'warn' | 'draft'

export default function Pill({ children, kind = 'live' }: { children: React.ReactNode; kind?: PillKind }) {
  const styles: Record<PillKind, string> = {
    live:  'bg-ok-soft   text-[oklch(0.4_0.1_155)]  border-[oklch(0.85_0.05_155)]',
    warn:  'bg-warn-soft text-[oklch(0.45_0.1_65)]  border-[oklch(0.85_0.06_75)]',
    draft: 'bg-info-soft text-[oklch(0.4_0.08_240)] border-[oklch(0.85_0.04_240)]',
  }
  return (
    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full border ${styles[kind]}`}>
      {children}
    </span>
  )
}
