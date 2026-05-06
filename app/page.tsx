import Link from 'next/link'
import AuthErrorHandler from '@/components/AuthErrorHandler'

const agentes = [
  { initial: 'O', color: 'bg-peach',  nome: 'Otto Orquestra',   titulo: 'Deal Orchestrator',           desc: 'Deal Readiness Score + ativação dos agentes certos' },
  { initial: 'P', color: 'bg-sky',    nome: 'Pedro Panorama',   titulo: 'Market Researcher',            desc: 'Pesquisa mercadológica com benchmarks e validação de demanda' },
  { initial: 'D', color: 'bg-sage',   nome: 'Davi Diagnóstico', titulo: 'Financial Diagnostician',      desc: 'DRE normalizada, EBITDA ajustado, valuation' },
  { initial: 'A', color: 'bg-sand',   nome: 'Arthur Aquisição', titulo: 'M&A Architect',                desc: 'Tese, estrutura da transação, perfil de comprador' },
  { initial: 'C', color: 'bg-lilac',  nome: 'Clara Cláusula',   titulo: 'Contracts Specialist',         desc: 'NDA, SHA, LOI, análise de contratos e passivos' },
  { initial: 'V', color: 'bg-cream',  nome: 'Victor Valor',     titulo: 'Deal Originator',              desc: 'Teaser, IM, pitch deck e pipeline de compradores' },
  { initial: 'E', color: 'bg-sage',   nome: 'Estela Estrutura', titulo: 'Operation Structure Advisor',  desc: 'Ranking de operações: custo × prazo × adequação' },
  { initial: 'P', color: 'bg-sand',   nome: 'Paulo Preparo',    titulo: 'Deal Readiness Coach',         desc: 'Veredicto de Maturidade + roadmap de preparação' },
  { initial: 'R', color: 'bg-sky',    nome: 'Rodrigo Relatório',titulo: 'Quality Reviewer',             desc: 'Revisão cruzada e consistência entre todos os relatórios' },
]

const planos = [
  {
    nome:     'Avulso',
    valor:    'R$ 2.500 – 5.000',
    desc:     'por análise',
    features: ['1 análise completa', 'DRS + Diagnóstico + M&A/Crédito', 'Blind Teaser + Sell-Side Pitchbook', 'Entrega em até 24h'],
    destaque: false,
    cta:      'Contratar análise',
    href:     '/auth/signup',
  },
  {
    nome:     'Recorrente',
    valor:    'R$ 8.000 – 15.000',
    desc:     'por mês · 5 a 15 análises',
    features: ['5 a 15 análises/mês', 'Todos os outputs incluídos', 'Identidade do escritório', 'Entrega em até 12h', 'Até 3 usuários'],
    destaque: true,
    cta:      'Assinar plano',
    href:     '/auth/signup',
  },
  {
    nome:     'Enterprise',
    valor:    'R$ 25.000 – 50.000',
    desc:     'por mês · volume ilimitado',
    features: ['Análises ilimitadas', 'Instância dedicada', 'Frameworks do escritório', 'Integração via API', 'Gerente de conta dedicado'],
    destaque: false,
    cta:      'Falar com consultor',
    href:     'mailto:gestor@renanregonato.com.br?subject=Enterprise Deal Intelligence',
  },
]

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-bg text-ink">
      <AuthErrorHandler />
      {/* Header */}
      <header className="border-b border-border px-6 py-4 flex items-center justify-between max-w-6xl mx-auto">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-accent grid place-items-center font-display italic font-semibold text-[15px] text-accent-ink">
            o
          </div>
          <span className="font-display font-medium text-[20px] tracking-tight">Otto</span>
          <span className="text-[11px] text-ink-3 ml-1">Deal Intelligence</span>
        </div>
        <div className="flex gap-3">
          <Link href="/auth/login" className="text-ink-2 hover:text-ink text-[13px] px-4 py-2 transition">
            Entrar
          </Link>
          <Link href="/auth/signup" className="bg-accent-strong hover:opacity-90 text-white font-semibold text-[13px] px-4 py-2 rounded-[10px] transition">
            Começar grátis
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-4xl mx-auto px-6 pt-20 pb-16 text-center">
        <div className="inline-flex items-center gap-1.5 bg-accent-soft border border-accent text-accent-ink text-[11px] font-semibold px-3 py-1 rounded-full mb-6 uppercase tracking-wider">
          Para escritórios de M&A e Estruturação de Crédito
        </div>
        <h1 className="font-display text-[48px] md:text-[56px] font-medium leading-[1.1] tracking-tight mb-6">
          Diagnóstico completo de ativo<br/>
          <span className="italic text-accent-strong">em 90 minutos</span>
        </h1>
        <p className="text-ink-2 text-[16px] max-w-2xl mx-auto mb-8 leading-relaxed">
          9 especialistas em IA executando em paralelo — DRS, diagnóstico financeiro, análise de M&A,
          estruturação de crédito, contratos, blind teaser e pitchbook no padrão de um partner sênior de PE.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/auth/signup" className="bg-accent-strong hover:opacity-90 text-white font-semibold px-6 py-3 rounded-[10px] transition text-[14px]">
            Diagnóstico gratuito no seu próximo deal
          </Link>
          <Link href="#planos" className="border border-border-strong hover:bg-surface-2 text-ink px-6 py-3 rounded-[10px] transition text-[14px]">
            Ver planos
          </Link>
        </div>
      </section>

      {/* Métricas */}
      <section className="border-y border-border py-8 bg-surface">
        <div className="max-w-4xl mx-auto px-6 grid grid-cols-3 gap-6 text-center">
          <div>
            <div className="font-display text-[36px] font-medium text-accent-strong">90 min</div>
            <div className="text-ink-3 text-[13px] mt-1">por análise completa</div>
          </div>
          <div>
            <div className="font-display text-[36px] font-medium text-accent-strong">9</div>
            <div className="text-ink-3 text-[13px] mt-1">especialistas em paralelo</div>
          </div>
          <div>
            <div className="font-display text-[36px] font-medium text-accent-strong">13</div>
            <div className="text-ink-3 text-[13px] mt-1">entregáveis por ativo</div>
          </div>
        </div>
      </section>

      {/* Agentes */}
      <section className="max-w-5xl mx-auto px-6 py-16">
        <h2 className="font-display text-[32px] font-medium text-center tracking-tight mb-2">Os 9 Especialistas</h2>
        <p className="text-ink-3 text-center text-[14px] mb-10">Cada agente tem uma especialidade cirúrgica. Todos executam simultaneamente.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {agentes.map((a) => (
            <div key={a.nome} className="bg-surface border border-border rounded-[14px] p-5 shadow-soft-sm">
              <div className={`w-9 h-9 rounded-[10px] grid place-items-center font-display font-medium text-[16px] mb-3 ${a.color} text-[oklch(0.32_0.06_50)]`}>
                {a.initial}
              </div>
              <div className="font-semibold text-[13px] text-ink">{a.nome}</div>
              <div className="text-accent-strong text-[11px] mb-1 font-medium">{a.titulo}</div>
              <div className="text-ink-3 text-[12px] leading-relaxed">{a.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Planos */}
      <section id="planos" className="max-w-5xl mx-auto px-6 py-16">
        <h2 className="font-display text-[32px] font-medium text-center tracking-tight mb-2">Planos</h2>
        <p className="text-ink-3 text-center text-[14px] mb-10">Sem contrato de longo prazo para começar.</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {planos.map((p) => (
            <div
              key={p.nome}
              className={`rounded-[14px] p-6 border flex flex-col shadow-soft-sm ${
                p.destaque ? 'border-accent bg-accent-soft/30' : 'border-border bg-surface'
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
                  <li key={f} className="flex items-start gap-2 text-[13px] text-ink-2">
                    <span className="text-ok font-bold mt-0.5">✓</span> {f}
                  </li>
                ))}
              </ul>
              <Link
                href={p.href}
                className={`w-full text-center py-2.5 rounded-[10px] font-semibold text-[13px] transition ${
                  p.destaque
                    ? 'bg-accent-strong text-white hover:opacity-90'
                    : 'border border-border-strong hover:bg-surface-2 text-ink'
                }`}
              >
                {p.cta}
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8 text-center">
        <div className="flex items-center justify-center gap-2.5 mb-2">
          <div className="w-6 h-6 rounded-md bg-accent grid place-items-center font-display italic font-semibold text-[13px] text-accent-ink">o</div>
          <span className="font-display font-medium text-[16px]">Otto · RR7x Capital Hub</span>
        </div>
        <p className="text-ink-3 text-[12px]">gestor@renanregonato.com.br</p>
        <p className="mt-2 text-[11px] text-ink-3 italic">"O ativo certo, para o comprador certo, no timing certo."</p>
      </footer>
    </div>
  )
}
