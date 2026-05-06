export default function DRSBar({ value, showLabel = true, height = 'h-1' }: {
  value: number
  showLabel?: boolean
  height?: string
}) {
  const color =
    value >= 4 ? 'oklch(0.6 0.1 155)' :
    value >= 3 ? 'oklch(0.7 0.13 75)' :
                 'oklch(0.6 0.16 25)'
  const pct = Math.max(0, Math.min(100, (value / 5) * 100))

  return (
    <div className="flex items-center gap-1.5">
      <div className={`flex-1 ${height} bg-surface-2 rounded-full overflow-hidden`}>
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }}/>
      </div>
      {showLabel && (
        <span className="font-mono text-[11px] font-semibold text-ink-2 tabular-nums">
          DRS {value.toFixed(1)}/5
        </span>
      )}
    </div>
  )
}
