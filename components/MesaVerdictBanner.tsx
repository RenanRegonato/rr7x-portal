'use client'

interface MesaRevisao {
  aprovacao:                 'aprovado' | 'aprovado_com_ressalvas' | 'revisao_necessaria'
  diagnostico_final:         string
  pontos_fortes:             string[]
  pontos_fracos:             string[]
  contradicoes_detectadas:   { descricao: string; agentes: string[]; criticidade: 'alta' | 'media' | 'baixa' }[]
  recomendacao_assessor:     string
}

interface MesaVerdictBannerProps {
  mesa:        MesaRevisao
  checkedAt?:  string | null
}

const APROVACAO_CFG = {
  aprovado: {
    label:    'APROVADO PELA MESA',
    icon:     '✓',
    cls:      'border-ok bg-ok/10 text-ok',
    subtitle: 'Material pode ser submetido a comitê sem ressalvas.',
  },
  aprovado_com_ressalvas: {
    label:    'APROVADO COM RESSALVAS',
    icon:     '⚠',
    cls:      'border-accent-strong bg-accent-soft text-accent-strong',
    subtitle: 'Material pode ser apresentado, mas os pontos fracos abaixo devem ser destacados.',
  },
  revisao_necessaria: {
    label:    'REVISÃO NECESSÁRIA',
    icon:     '⛔',
    cls:      'border-warn bg-warn/10 text-warn',
    subtitle: 'Não submeter a comitê até endereçar as contradições / pontos fracos abaixo.',
  },
} as const

export default function MesaVerdictBanner({ mesa, checkedAt }: MesaVerdictBannerProps) {
  const cfg = APROVACAO_CFG[mesa.aprovacao]
  return (
    <div className={`rounded-[14px] border-2 ${cfg.cls} p-5 mb-6`}>
      <div className="flex items-baseline justify-between gap-4 mb-2">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[24px] leading-none">{cfg.icon}</span>
            <h2 className="font-display text-[20px] font-semibold tracking-tight">{cfg.label}</h2>
          </div>
          <p className="text-[12px] mt-1 opacity-90">{cfg.subtitle}</p>
        </div>
        {checkedAt && (
          <span className="text-[11px] opacity-70 shrink-0">
            Mesa em {new Date(checkedAt).toLocaleString('pt-BR')}
          </span>
        )}
      </div>

      <div className="text-[13px] leading-relaxed mt-3 whitespace-pre-wrap">
        {mesa.diagnostico_final}
      </div>

      {(mesa.pontos_fortes.length > 0 || mesa.pontos_fracos.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          {mesa.pontos_fortes.length > 0 && (
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider mb-1.5 opacity-80">Pontos fortes</p>
              <ul className="text-[12px] space-y-1 opacity-90 list-disc pl-4">
                {mesa.pontos_fortes.map((p, i) => <li key={i}>{p}</li>)}
              </ul>
            </div>
          )}
          {mesa.pontos_fracos.length > 0 && (
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider mb-1.5 opacity-80">Pontos fracos</p>
              <ul className="text-[12px] space-y-1 opacity-90 list-disc pl-4">
                {mesa.pontos_fracos.map((p, i) => <li key={i}>{p}</li>)}
              </ul>
            </div>
          )}
        </div>
      )}

      {mesa.recomendacao_assessor && (
        <div className="mt-4 pt-3 border-t border-current/20">
          <p className="text-[11px] font-semibold uppercase tracking-wider mb-1 opacity-80">Recomendação para o assessor</p>
          <p className="text-[13px] leading-relaxed opacity-90">{mesa.recomendacao_assessor}</p>
        </div>
      )}
    </div>
  )
}
