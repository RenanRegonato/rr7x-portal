type AgentColor = 'peach' | 'sage' | 'sand' | 'sky' | 'lilac' | 'cream'
type AgentSize  = 'sm' | 'md' | 'lg'

export default function AgentMark({
  color = 'peach',
  initial,
  size  = 'md',
  pulsing = false,
}: {
  color?:   AgentColor
  initial:  string
  size?:    AgentSize
  pulsing?: boolean
}) {
  const palette: Record<AgentColor, string> = {
    peach: 'bg-peach text-[oklch(0.32_0.08_35)]',
    sage:  'bg-sage  text-[oklch(0.32_0.06_155)]',
    sand:  'bg-sand  text-[oklch(0.35_0.06_65)]',
    sky:   'bg-sky   text-[oklch(0.34_0.06_240)]',
    lilac: 'bg-lilac text-[oklch(0.34_0.06_300)]',
    cream: 'bg-cream text-[oklch(0.36_0.05_75)]',
  }
  const sizes: Record<AgentSize, string> = {
    sm: 'w-7 h-7 text-[13px] rounded-lg',
    md: 'w-9 h-9 text-[16px] rounded-[10px]',
    lg: 'w-12 h-12 text-[20px] rounded-xl',
  }

  return (
    <div className={`relative grid place-items-center font-display font-medium tracking-tight flex-none ${palette[color]} ${sizes[size]}`}>
      {initial}
      {pulsing && (
        <span className="absolute -inset-1 rounded-xl border-2 border-accent-strong animate-pulse-ring pointer-events-none"/>
      )}
    </div>
  )
}
