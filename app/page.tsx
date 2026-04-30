import Link from 'next/link'

const planos = [
  {
    nome: 'Avulso',
    valor: 'R$ 2.500 – 5.000',
    descricao: 'por análise',
    features: [
      '1 análise completa',
      'DRS + Diagnóstico + M&A/Crédito',
      'Blind Teaser + Sell-Side Pitchbook',
      'Entrega em até 24h',
    ],
    cta: 'Contratar análise',
    plano: 'avulso',
    destaque: false,
  },
  {
    nome: 'Recorrente',
    valor: 'R$ 8.000 – 15.000',
    descricao: 'por mês · 5 a 15 análises',
    features: [
      '5 a 15 análises/mês',
      'Todos os outputs incluídos',
      'Identidade do escritório',
      'Entrega em até 12h',
      'Até 3 usuários',
    ],
    cta: 'Assinar plano',
    plano: 'recorrente',
    destaque: true,
  },
  {
    nome: 'Enterprise',
    valor: 'R$ 25.000 – 50.000',
    descricao: 'por mês · volume ilimitado',
    features: [
      'Análises ilimitadas',
      'Instância dedicada',
      'Frameworks do escritório',
      'Integração via API',
      'Gerente de conta dedicado',
    ],
    cta: 'Falar com consultor',
    plano: 'enterprise',
    destaque: false,
  },
]

const agentes = [
  { icon: '🎛️', nome: 'Otto Orquestra', titulo: 'Deal Orchestrator', desc: 'Deal Readiness Score + ativação dos agentes certos' },
  { icon: '🔍', nome: 'Pedro Panorama', titulo: 'Market Researcher', desc: 'Pesquisa mercadológica com benchmarks e validação de demanda' },
  { icon: '💊', nome: 'Davi Diagnóstico', titulo: 'Financial Diagnostician', desc: 'DRE normalizada, EBITDA ajustado, valuation' },
  { icon: '🏛️', nome: 'Arthur Aquisição', titulo: 'M&A Architect', desc: 'Tese, estrutura da transação, perfil de comprador' },
  { icon: '📋', nome: 'Clara Cláusula', titulo: 'Contracts Specialist', desc: 'NDA, SHA, LOI, análise de contratos e passivos' },
  { icon: '🎯', nome: 'Victor Valor', titulo: 'Deal Originator', desc: 'Teaser, IM, pitch deck e pipeline de compradores' },
  { icon: '🗺️', nome: 'Estela Estrutura', titulo: 'Operation Structure Advisor', desc: 'Ranking de operações: custo × prazo × adequação' },
  { icon: '🏗️', nome: 'Paulo Preparo', titulo: 'Deal Readiness Coach', desc: 'Veredicto de Maturidade + roadmap de preparação' },
  { icon: '✅', nome: 'Rodrigo Relatório', titulo: 'Quality Reviewer', desc: 'Revisão cruzada e consistência entre todos os relatórios' },
]

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <header className="border-b border-gray-800 px-6 py-4 flex items-center justify-between max-w-6xl mx-auto">
        <div>
          <span className="font-bold text-lg text-cyan-400">RR7x</span>
          <span className="text-gray-400 text-sm ml-2">Deal Intelligence</span>
        </div>
        <div className="flex gap-3">
          <Link href="/auth/login" className="text-gray-400 hover:text-white text-sm px-4 py-2 transition">
            Entrar
          </Link>
          <Link href="/auth/signup" className="bg-cyan-500 hover:bg-cyan-400 text-gray-950 font-semibold text-sm px-4 py-2 rounded-lg transition">
            Começar grátis
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-4xl mx-auto px-6 pt-20 pb-16 text-center">
        <div className="inline-block bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-xs font-medium px-3 py-1 rounded-full mb-6">
          Para escritórios de M&A e Estruturação de Crédito
        </div>
        <h1 className="text-4xl md:text-5xl font-bold leading-tight mb-6">
          Diagnóstico completo de ativo<br />
          <span className="text-cyan-400">em 90 minutos</span>
        </h1>
        <p className="text-gray-400 text-lg max-w-2xl mx-auto mb-8">
          9 especialistas em IA que executam em paralelo e entregam DRS, diagnóstico financeiro, análise de M&A, estruturação de crédito, contratos, blind teaser e pitchbook — no padrão de um partner sênior de PE.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/auth/signup" className="bg-cyan-500 hover:bg-cyan-400 text-gray-950 font-semibold px-6 py-3 rounded-lg transition">
            Diagnóstico gratuito no seu próximo deal
          </Link>
          <Link href="#planos" className="border border-gray-700 hover:border-gray-500 text-gray-300 px-6 py-3 rounded-lg transition">
            Ver planos
          </Link>
        </div>
      </section>

      {/* Métricas */}
      <section className="border-y border-gray-800 py-8">
        <div className="max-w-4xl mx-auto px-6 grid grid-cols-3 gap-6 text-center">
          <div>
            <div className="text-3xl font-bold text-cyan-400">90 min</div>
            <div className="text-gray-400 text-sm mt-1">por análise completa</div>
          </div>
          <div>
            <div className="text-3xl font-bold text-cyan-400">9</div>
            <div className="text-gray-400 text-sm mt-1">especialistas em paralelo</div>
          </div>
          <div>
            <div className="text-3xl font-bold text-cyan-400">13</div>
            <div className="text-gray-400 text-sm mt-1">entregáveis por ativo</div>
          </div>
        </div>
      </section>

      {/* Agentes */}
      <section className="max-w-5xl mx-auto px-6 py-16">
        <h2 className="text-2xl font-bold text-center mb-2">Os 9 Especialistas</h2>
        <p className="text-gray-400 text-center mb-10">Cada agente tem uma especialidade cirúrgica. Todos executam simultaneamente.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {agentes.map(a => (
            <div key={a.nome} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
              <div className="text-2xl mb-2">{a.icon}</div>
              <div className="font-semibold text-sm">{a.nome}</div>
              <div className="text-cyan-400 text-xs mb-1">{a.titulo}</div>
              <div className="text-gray-400 text-xs">{a.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Planos */}
      <section id="planos" className="max-w-5xl mx-auto px-6 py-16">
        <h2 className="text-2xl font-bold text-center mb-2">Planos</h2>
        <p className="text-gray-400 text-center mb-10">Sem contrato de longo prazo para começar.</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {planos.map(p => (
            <div key={p.nome} className={`rounded-xl p-6 border flex flex-col ${p.destaque ? 'border-cyan-500 bg-cyan-500/5' : 'border-gray-800 bg-gray-900'}`}>
              {p.destaque && (
                <div className="text-cyan-400 text-xs font-medium mb-3">MAIS ESCOLHIDO</div>
              )}
              <div className="font-bold text-lg mb-1">{p.nome}</div>
              <div className="text-2xl font-bold text-white mb-0.5">{p.valor}</div>
              <div className="text-gray-400 text-xs mb-5">{p.descricao}</div>
              <ul className="space-y-2 mb-6 flex-1">
                {p.features.map(f => (
                  <li key={f} className="flex items-start gap-2 text-sm text-gray-300">
                    <span className="text-cyan-400 mt-0.5">✓</span> {f}
                  </li>
                ))}
              </ul>
              <Link
                href={p.plano === 'enterprise' ? 'mailto:gestor@renanregonato.com.br?subject=Enterprise Deal Intelligence' : '/auth/signup'}
                className={`w-full text-center py-2.5 rounded-lg font-semibold text-sm transition ${p.destaque ? 'bg-cyan-500 hover:bg-cyan-400 text-gray-950' : 'border border-gray-600 hover:border-gray-400 text-white'}`}
              >
                {p.cta}
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-800 py-8 text-center text-gray-500 text-sm">
        <p className="font-semibold text-white mb-1">RR7x Capital Hub</p>
        <p>gestor@renanregonato.com.br</p>
        <p className="mt-3 text-xs">"O ativo certo, para o comprador certo, no timing certo."</p>
      </footer>
    </div>
  )
}
