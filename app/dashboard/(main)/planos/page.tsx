import Topbar from '@/components/Topbar'
import { getUserContext } from '@/lib/get-role'
import { getEntitlements } from '@/lib/entitlements'

const WHATSAPP = '5514988220001'

const planos = [
  {
    id:            'essential',
    nome:          'Essential',
    posicionamento:'O parecer institucional completo, pronto para decidir se a operação avança.',
    features: [
      'Pipeline completo de diligência (todos os agentes)',
      'Parecer rastreável + trilha de auditoria',
      'Documentos de captação (Blind Teaser e Pitchbook)',
      'Auto-pull de CNPJ + monitoramento contínuo',
      'Mapa do Mercado — consulta (busca e fichas)',
      'Exportação em PDF, Excel e PowerPoint',
    ],
    volume:   'Pacote básico',
    usuarios: 'Até 3 usuários',
    destaque: false,
    mensagem: 'Olá! Tenho interesse no plano Essential do Mandor. Podemos conversar?',
    botao:    'Falar com consultor',
  },
  {
    id:            'professional',
    nome:          'Professional',
    posicionamento:'Inteligência aplicada: tributário, originação interna e aprendizado do escritório.',
    features: [
      'Tudo do Essential',
      'Adequação à Reforma Tributária (agente dedicado)',
      'Aprendizados do escritório (inteligência acumulada)',
      'Invest Match: originação interna (teses + matching na sua base)',
      'Mapa do Mercado completo: busca IA, grafo e alvos de captação',
      'Regeneração e refinamento com briefing',
      'Identidade do escritório nos relatórios',
    ],
    volume:   'Volume ampliado',
    usuarios: 'Até 17 usuários',
    destaque: true,
    mensagem: 'Olá! Tenho interesse no plano Professional do Mandor. Podemos conversar?',
    botao:    'Falar com consultor',
  },
  {
    id:            'enterprise',
    nome:          'Enterprise',
    posicionamento:'A rede de capital e a escala corporativa, com governança avançada.',
    features: [
      'Tudo do Professional',
      'Invest Match em Rede: fontes de capital ampliadas',
      'Originação reversa + insights de calibração',
      'API e integrações',
      'Personalização de agentes',
      'Governança avançada, SSO e suporte estratégico',
      'Gerente dedicado',
    ],
    volume:   'Ilimitado / instância dedicada',
    usuarios: 'Usuários ilimitados',
    destaque: false,
    mensagem: 'Olá! Tenho interesse no plano Enterprise do Mandor. Podemos conversar?',
    botao:    'Falar com consultor',
  },
]

export default async function PlanosPage() {
  const ctx = await getUserContext()
  const ent = ctx?.escritorioId ? await getEntitlements(ctx.escritorioId) : null
  const planoAtual  = ent?.plano ?? null
  const precoAtual  = ent?.preco_mensal_brl ?? null
  const nomeAtual   = planoAtual ? (planos.find(p => p.id === planoAtual)?.nome ?? planoAtual) : null

  return (
    <div className="flex flex-col min-h-screen">
      <Topbar variant="context" title="Planos"/>

      <main className="max-w-5xl mx-auto px-8 py-12 w-full">
        <div className="mb-8">
          <h1 className="font-display text-[32px] font-medium tracking-tight">Planos do Mandor</h1>
          <p className="text-ink-3 mt-1">Uma esteira que evolui com o seu escritório, do parecer à rede de capital.</p>
          {nomeAtual && (
            <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-accent-strong/40 bg-accent-soft/50 px-3.5 py-1.5 text-[13px] text-ink">
              <span className="w-1.5 h-1.5 rounded-full bg-accent-strong"/>
              Plano atual do escritório: <strong>{nomeAtual}</strong>
              {precoAtual != null && <span className="text-ink-3">· R$ {precoAtual.toLocaleString('pt-BR')}/mês</span>}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 items-stretch">
          {planos.map((p) => {
            const ativo = p.id === planoAtual
            return (
              <div
                key={p.id}
                className={`rounded-[14px] p-6 border flex flex-col shadow-soft-sm ${
                  ativo
                    ? 'border-accent-strong ring-2 ring-accent-strong/60 bg-accent-soft/40'
                    : p.destaque
                      ? 'border-accent bg-accent-soft/30'
                      : 'border-border bg-surface'
                }`}
              >
                {ativo ? (
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-accent-strong mb-2">
                    ✓ Seu plano atual
                  </div>
                ) : p.destaque ? (
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-accent-strong mb-2">
                    Mais escolhido
                  </div>
                ) : null}

                <div className="font-display text-[24px] font-medium mb-1.5">{p.nome}</div>
                <div className="text-ink-3 text-[12.5px] leading-snug mb-5 min-h-[52px]">{p.posicionamento}</div>

                <ul className="space-y-2 mb-5 flex-1">
                  {p.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-[13px] text-ink-2">
                      <span className="text-accent-strong font-bold leading-5">✓</span> {f}
                    </li>
                  ))}
                </ul>

                <div className="border-t border-border pt-3 mb-5 text-[12px] text-ink-3">
                  <div>Volume: <span className="text-ink font-semibold">{p.volume}</span></div>
                </div>

                {ativo ? (
                  <div className="w-full py-2.5 rounded-[10px] font-semibold text-[13px] text-center bg-accent-soft text-accent-ink border border-accent-strong/30">
                    Plano vigente
                  </div>
                ) : (
                  <a
                    href={`https://wa.me/${WHATSAPP}?text=${encodeURIComponent(p.mensagem)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`w-full py-2.5 rounded-[10px] font-semibold text-[13px] transition text-center block ${
                      p.destaque
                        ? 'bg-accent-strong text-white hover:opacity-90'
                        : 'border border-border-strong bg-surface hover:bg-surface-2 text-ink'
                    }`}
                  >
                    {planoAtual ? 'Fazer upgrade' : p.botao}
                  </a>
                )}
              </div>
            )
          })}
        </div>

        <p className="text-ink-3 text-[12px] mt-6">
          Valores sob consulta. Fale com um consultor para a proposta adequada ao seu volume e estrutura.
        </p>
      </main>
    </div>
  )
}
