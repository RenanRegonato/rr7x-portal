import { IS_HOMOLOG } from '@/lib/env'

// Badge de ambiente ao lado do logo. Em produção mantém "Beta"; em homologação
// troca por "HOMOLOG" em cor de alerta, para a equipe nunca confundir os ambientes.
export default function EnvBadge() {
  if (IS_HOMOLOG) {
    return (
      <span className="text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded bg-warn-soft text-warn border border-warn/30">
        Homolog
      </span>
    )
  }
  return (
    <span className="text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded bg-surface-2 text-ink-2 border border-border">
      Beta
    </span>
  )
}
