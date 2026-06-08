'use client'

import { useEffect, useState } from 'react'

// Aviso "antes do commit": mostra ao cliente, na hora de criar a análise,
// quanto do pacote esta análise vai consumir e quanto resta. Unidade =
// ANÁLISE (pacote do escritório), customer-facing — não confundir com o
// card de COGS (USD), que é admin-only. Lição CBRdoc: preço antes de confirmar.

interface Saldo {
  has_pacote:   boolean
  total?:       number
  consumido?:   number
  restante?:    number
  esgotado?:    boolean
  limite_baixo?: boolean
}

export default function SaldoPacoteAviso() {
  const [s, setS] = useState<Saldo | null>(null)

  useEffect(() => {
    let alive = true
    fetch('/api/consumo/saldo')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (alive && d) setS(d as Saldo) })
      .catch(() => {})
    return () => { alive = false }
  }, [])

  // Sem dado ainda, ou escritório sem pacote (ex.: admin): não mostra nada.
  if (!s || !s.has_pacote) return null

  const { restante = 0, total = 0, esgotado, limite_baixo } = s

  const tone = esgotado
    ? 'bg-[oklch(0.62_0.2_25)]/8 border-[oklch(0.62_0.2_25)]/30 text-[oklch(0.50_0.2_25)]'
    : limite_baixo
      ? 'bg-warn/10 border-warn/30 text-ink-2'
      : 'bg-surface-2 border-border text-ink-2'

  return (
    <div className={`flex items-center gap-2.5 rounded-[10px] border px-3.5 py-2.5 text-[12.5px] ${tone}`}>
      <span className="text-[15px] leading-none">{esgotado ? '⛔' : limite_baixo ? '⚠️' : '📦'}</span>
      <span>
        {esgotado ? (
          <>Pacote esgotado ({total} de {total} usadas). Solicite ao gestor a habilitação de um novo pacote para rodar esta análise.</>
        ) : (
          <>
            Esta análise consome <strong>1 do seu pacote</strong>. Após confirmar,
            restam <strong>{restante - 1}</strong> de {total} análise(s).
          </>
        )}
      </span>
    </div>
  )
}
