'use client'

import type { InputHTMLAttributes, SelectHTMLAttributes } from 'react'

export function Field({ label, help, children }: {
  label:    string
  help?:    string
  children: React.ReactNode
}) {
  return (
    <label className="block">
      <span className="block text-[12px] font-medium text-ink-2 mt-3.5 mb-1.5">{label}</span>
      {help && <span className="block text-[11px] text-ink-3 -mt-1 mb-1.5">{help}</span>}
      {children}
    </label>
  )
}

export function OttoInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className="w-full border border-border rounded-[10px] px-3 py-2.5 text-[13px] bg-surface outline-none transition-shadow
        focus:border-accent-strong focus:shadow-[0_0_0_3px_oklch(0.93_0.04_40)]
        placeholder:text-ink-3"
    />
  )
}

export function OttoTextarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className="w-full border border-border rounded-[10px] px-4 py-3.5 text-[14px] bg-surface outline-none resize-y transition-shadow
        focus:border-accent-strong focus:shadow-[0_0_0_3px_oklch(0.93_0.04_40)]
        placeholder:text-ink-3"
    />
  )
}

export function OttoSelect({ children, glyph, ...props }: SelectHTMLAttributes<HTMLSelectElement> & { glyph?: string }) {
  return (
    <div className="relative">
      {glyph && (
        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 w-[22px] h-[22px] rounded-md bg-accent-soft grid place-items-center text-[11px] font-display font-semibold text-accent-ink pointer-events-none">
          {glyph}
        </span>
      )}
      <select
        {...props}
        className={`w-full appearance-none border border-border rounded-[10px] py-2.5 text-[13px] bg-surface outline-none transition-shadow
          focus:border-accent-strong focus:shadow-[0_0_0_3px_oklch(0.93_0.04_40)]
          ${glyph ? 'pl-[42px] pr-9' : 'pl-3 pr-9'}`}
      >
        {children}
      </select>
      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-2 w-1.5 h-1.5 border-r-[1.5px] border-b-[1.5px] border-ink-2 rotate-45"/>
    </div>
  )
}

export function Segmented({ value, onChange, options, fullWidth = false }: {
  value:    string
  onChange: (v: string) => void
  options:  string[]
  fullWidth?: boolean
}) {
  return (
    <div className={`inline-flex bg-surface-2 border border-border rounded-full p-[3px] ${fullWidth ? 'flex w-full' : ''}`}>
      {options.map((opt) => (
        <button
          key={opt}
          type="button"
          onClick={() => onChange(opt)}
          className={`${fullWidth ? 'flex-1' : ''} px-3.5 py-1 rounded-full text-[12px] font-medium transition-colors
            ${value === opt ? 'bg-surface text-ink shadow-soft-sm' : 'text-ink-2 hover:text-ink'}`}
        >
          {opt}
        </button>
      ))}
    </div>
  )
}
