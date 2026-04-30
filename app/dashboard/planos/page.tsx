import Link from 'next/link'

const WHATSAPP = '5514988220001'

const planos = [
  {
    id: 'avulso',
    nome: 'Avulso',
    valor: 'R$ 2.500 – 5.000',
    desc: 'por análise',
    features: ['1 análise completa', 'Todos os outputs incluídos', 'Entrega em até 24h'],
    destaque: false,
    mensagem: 'Olá! Tenho interesse no plano Avulso do Deal Intelligence (R$ 2.500 – R$ 5.000 por análise). Podemos conversar?',
    botao: 'Contratar',
  },
  {
    id: 'recorrente',
    nome: 'Recorrente',
    valor: 'R$ 8.000 – 15.000',
    desc: '/mês · 5 a 15 análises',
    features: ['5–15 análises/mês', 'Identidade do escritório', 'Suporte prioritário', 'Até 3 usuários'],
    destaque: true,
    mensagem: 'Olá! Tenho interesse no plano Recorrente do Deal Intelligence (R$ 8.000 – R$ 15.000/mês). Podemos conversar?',
    botao: 'Contratar',
  },
  {
    id: 'enterprise',
    nome: 'Enterprise',
    valor: 'R$ 25.000 – 50.000',
    desc: '/mês · volume ilimitado',
    features: ['Ilimitado', 'Instância dedicada', 'Integração via API', 'Gerente dedicado'],
    destaque: false,
    mensagem: 'Olá! Tenho interesse no plano Enterprise do Deal Intelligence (R$ 25.000 – R$ 50.000/mês). Podemos conversar?',
    botao: 'Falar com consultor',
  },
]

export default function PlanosPage() {
  return (
    <div className="min-h-screen bg-gray-950">
      <header className="border-b border-gray-800 px-6 py-4 flex items-center gap-4 max-w-4xl mx-auto">
        <Link href="/dashboard" className="text-gray-500 hover:text-white text-sm">← Dashboard</Link>
        <span className="text-gray-600">/</span>
        <span className="text-white font-semibold text-sm">Planos</span>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-12">
        <h1 className="text-2xl font-bold text-center mb-2">Escolha seu plano</h1>
        <p className="text-gray-400 text-center text-sm mb-10">Sem contrato de longo prazo para começar.</p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {planos.map(p => (
            <div key={p.id} className={`rounded-xl p-6 border flex flex-col ${p.destaque ? 'border-cyan-500 bg-cyan-500/5' : 'border-gray-800 bg-gray-900'}`}>
              {p.destaque && <div className="text-cyan-400 text-xs font-medium mb-2">MAIS ESCOLHIDO</div>}
              <div className="font-bold text-lg mb-0.5">{p.nome}</div>
              <div className="text-xl font-bold mb-0.5">{p.valor}</div>
              <div className="text-gray-400 text-xs mb-5">{p.desc}</div>
              <ul className="space-y-2 mb-6 flex-1">
                {p.features.map(f => (
                  <li key={f} className="flex items-center gap-2 text-sm text-gray-300">
                    <span className="text-cyan-400">✓</span> {f}
                  </li>
                ))}
              </ul>
              <a
                href={`https://wa.me/${WHATSAPP}?text=${encodeURIComponent(p.mensagem)}`}
                target="_blank"
                rel="noopener noreferrer"
                className={`w-full py-2.5 rounded-lg font-semibold text-sm transition text-center block ${p.destaque ? 'bg-cyan-500 hover:bg-cyan-400 text-gray-950' : 'border border-gray-600 hover:border-gray-400 text-white'}`}
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
