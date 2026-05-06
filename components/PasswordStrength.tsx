'use client'

const RULES = [
  { label: 'Mínimo 8 caracteres',   test: (p: string) => p.length >= 8 },
  { label: 'Letra maiúscula (A-Z)', test: (p: string) => /[A-Z]/.test(p) },
  { label: 'Letra minúscula (a-z)', test: (p: string) => /[a-z]/.test(p) },
  { label: 'Número (0-9)',          test: (p: string) => /\d/.test(p) },
  { label: 'Caractere especial',    test: (p: string) => /[^A-Za-z0-9]/.test(p) },
]

const LEVELS = [
  { label: 'Muito fraca', color: 'bg-[oklch(0.60_0.20_25)]',  text: 'text-[oklch(0.50_0.20_25)]' },
  { label: 'Fraca',       color: 'bg-[oklch(0.65_0.18_50)]',  text: 'text-[oklch(0.52_0.18_50)]' },
  { label: 'Razoável',    color: 'bg-[oklch(0.72_0.16_80)]',  text: 'text-[oklch(0.52_0.16_80)]' },
  { label: 'Forte',       color: 'bg-[oklch(0.65_0.18_150)]', text: 'text-[oklch(0.45_0.18_150)]' },
  { label: 'Muito forte', color: 'bg-[oklch(0.60_0.20_155)]', text: 'text-[oklch(0.40_0.20_155)]' },
]

export function calcPasswordScore(password: string): number {
  return RULES.filter(r => r.test(password)).length
}

export function isPasswordStrong(password: string): boolean {
  return calcPasswordScore(password) >= 4
}

export default function PasswordStrength({ password }: { password: string }) {
  if (!password) return null

  const score  = calcPasswordScore(password)
  const level  = LEVELS[score] ?? LEVELS[0]
  const filled = score

  return (
    <div className="mt-2 space-y-2">
      {/* Bar */}
      <div className="flex gap-1">
        {LEVELS.map((l, i) => (
          <div
            key={i}
            className={`h-1 flex-1 rounded-full transition-colors duration-200 ${i < filled ? level.color : 'bg-surface-2'}`}
          />
        ))}
      </div>

      {/* Label */}
      <p className={`text-[11px] font-medium ${level.text}`}>{level.label}</p>

      {/* Rules checklist */}
      <ul className="space-y-0.5">
        {RULES.map((rule) => {
          const ok = rule.test(password)
          return (
            <li key={rule.label} className="flex items-center gap-1.5 text-[11px]">
              <span className={ok ? 'text-ok' : 'text-ink-3'}>
                {ok ? '✓' : '○'}
              </span>
              <span className={ok ? 'text-ink-2' : 'text-ink-3'}>{rule.label}</span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
