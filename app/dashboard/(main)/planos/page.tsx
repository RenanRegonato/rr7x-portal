import Topbar from '@/components/Topbar'

const WHATSAPP = '5514988220001'

const planos = [
  {
    id:       'avulso',
    nome:     'Avulso',
    valor:    'R$ 2.500 – 5.000',
    desc:     'por análise',
    features: ['1 análise completa', 'Todos os outputs incluídos', 'Entrega em até 24h'],
    destaque: false,
    mensagem: 'Olá! Tenho interesse no plano Avulso do Deal Intelligence (R$ 2.500 – R$ 5.000 por análise). Podemos conversar?',
    botao:    'Contratar',
  },
  {
    id:       'recorrente',
    nome:     'Recorrente',
    valor:    'R$ 8.000 – 15.000',
    desc:     '/mês · 5 a 15 análises',
    features: ['5–15 análises/mês', 'Identidade do escritório', 'Suporte prioritário', 'Até 3 usuários'],
    destaque: true,
    mensagem: 'Olá! Tenho interesse no plano Recorrente do Deal Intelligence (R$ 8.000 – R$ 15.000/mês). Podemos conversar?',
    botao:    'Contratar',
  },
  {
    id:       'enterprise',
    nome:     'Enterprise',
    valor:    'R$ 25.000 – 50.000',
    desc:     '/mês · volume ilimitado',
    features: ['Ilimitado', 'Instância dedicada', 'Integração via API', 'Gerente dedicado'],
    destaque: false,
    mensagem: 'Olá! Tenho interesse no plano Enterprise do Deal Intelligence (R$ 25.000 – R$ 50.000/mês). Podemos conversar?',
    botao:    'Falar com consultor',
  },
]

export default function PlanosPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <Topbar variant="context" title="Planos"/>

      <main className="max-w-4xl mx-auto px-8 py-12 w-full">
        <div className="mb-8">
          <h1 className="font-display text-[32px] font-medium tracking-tight">Escolha seu plano</h1>
          <p className="text-ink-3 mt-1">Sem contrato de longo prazo para começar.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {planos.map((p) => (
            <div
              key={p.id}
              className={`rounded-[14px] p-6 border flex flex-col shadow-soft-sm ${
                p.destaque
                  ? 'border-accent bg-accent-soft/30'
                  : 'border-border bg-surface'
              }`}
            >
              {p.destaque && (
                <div className="text-[10px] font-semibold uppercase tracking-wider text-accent-strong mb-2">
                  Mais escolhido
                </div>
              )}
              <div className="font-display text-[20px] font-medium mb-0.5">{p.nome}</div>
              <div className="font-display text-[24px] font-medium">{p.valor}</div>
              <div className="text-ink-3 text-[12px] mb-5">{p.desc}</div>

              <ul className="space-y-2 mb-6 flex-1">
                {p.features.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-[13px] text-ink-2">
                    <span className="text-ok font-bold">✓</span> {f}
                  </li>
                ))}
              </ul>

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
                {p.botao}
              </a>
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}
