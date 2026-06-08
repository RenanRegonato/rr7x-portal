import Link from 'next/link'
import {
  IconHandshake, IconLock, IconCheck, IconArrowRight, IconUsers, IconSparkle,
} from '@/components/Icons'

// Tela de apresentação (upsell) exibida quando o escritório não tem o
// módulo Invest Match (Plus) habilitado. O bloqueio vira oportunidade comercial.

const WHATSAPP = '5514988220001'
const MENSAGEM  = 'Olá! Quero habilitar o módulo Invest Match (Plus) no meu escritório no Mandor. Podemos conversar?'
const WHATSAPP_HREF = `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(MENSAGEM)}`

const beneficios = [
  {
    titulo:    'Originação inteligente, sem esforço manual',
    descricao: 'Cada análise concluída no Mandor vira automaticamente uma tese de investimento, pronta para conexão.',
  },
  {
    titulo:    'Matches qualificados e explicados',
    descricao: 'O motor cruza suas teses com a base de investidores e entrega conexões com score multi-camada e a justificativa de por que combinam.',
  },
  {
    titulo:    'Pipeline de relacionamento ponta a ponta',
    descricao: 'Acompanhe cada oportunidade do primeiro contato ao fechamento, com curadoria e tags de negociação.',
  },
  {
    titulo:    'Originação reversa',
    descricao: 'Cadastre um investidor e receba na hora as teses mais compatíveis com a estratégia dele.',
  },
]

export default function UpsellPlus() {
  return (
    <div className="p-6 md:p-10 max-w-5xl mx-auto w-full">

      {/* Hero */}
      <div className="bg-surface border border-border rounded-2xl overflow-hidden">
        <div className="p-8 md:p-10 border-b border-border">
          <div className="flex items-center gap-2 text-accent-ink text-xs uppercase tracking-wider font-semibold mb-4">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-accent-soft">
              <IconLock size={13}/> Recurso exclusivo Plus
            </span>
          </div>

          <div className="flex items-start gap-3">
            <div className="shrink-0 w-11 h-11 rounded-xl bg-accent-soft text-accent-ink grid place-items-center">
              <IconHandshake size={22}/>
            </div>
            <div>
              <h1 className="text-3xl font-semibold text-ink tracking-tight">Invest Match</h1>
              <p className="text-ink-2 text-base mt-2 max-w-2xl leading-relaxed">
                O módulo de originação que transforma suas análises do Mandor em conexões reais com
                investidores, cruzando teses e perfis automaticamente para gerar oportunidades qualificadas.
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 mt-7">
            <a
              href={WHATSAPP_HREF}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-accent-strong text-white text-sm font-semibold hover:opacity-90 transition"
            >
              Quero habilitar o InvestMatch Plus <IconArrowRight size={16}/>
            </a>
            <Link
              href="/dashboard/planos"
              className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-surface border border-border text-ink-2 text-sm font-medium hover:border-accent-strong/40 hover:text-ink transition"
            >
              Ver planos
            </Link>
          </div>
        </div>

        {/* Benefícios */}
        <div className="p-8 md:p-10">
          <h2 className="text-sm font-semibold text-ink mb-5">O que o Invest Match faz pelo seu escritório</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-5">
            {beneficios.map(b => (
              <div key={b.titulo} className="flex gap-3">
                <div className="shrink-0 w-5 h-5 rounded-full bg-accent-soft text-accent-ink grid place-items-center mt-0.5">
                  <IconCheck size={12}/>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-ink">{b.titulo}</h3>
                  <p className="text-sm text-ink-2 mt-1 leading-relaxed">{b.descricao}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Para quem ajuda */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
        <div className="bg-surface border border-border rounded-xl p-6">
          <div className="flex items-center gap-2 mb-2">
            <IconUsers size={16}/>
            <h3 className="text-sm font-semibold text-ink">Para o escritório</h3>
          </div>
          <p className="text-sm text-ink-2 leading-relaxed">
            Aproveita o trabalho analítico que você já faz no Mandor e o converte em uma nova frente de
            receita: originação de deals com investidores, sem montar uma operação dedicada.
          </p>
        </div>
        <div className="bg-surface border border-border rounded-xl p-6">
          <div className="flex items-center gap-2 mb-2">
            <IconSparkle size={16}/>
            <h3 className="text-sm font-semibold text-ink">Para os seus clientes</h3>
          </div>
          <p className="text-sm text-ink-2 leading-relaxed">
            As empresas analisadas ganham acesso a investidores realmente aderentes à tese, com
            conexões fundamentadas, encurtando o caminho até a captação.
          </p>
        </div>
      </div>

      {/* CTA rodapé */}
      <div className="bg-accent-soft border border-accent/30 rounded-xl p-6 mt-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-sm font-semibold text-ink">Pronto para liberar o Invest Match?</h3>
          <p className="text-sm text-ink-2 mt-1">
            Fale com o time comercial e ative o módulo Plus no seu escritório.
          </p>
        </div>
        <a
          href={WHATSAPP_HREF}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-accent-strong text-white text-sm font-semibold hover:opacity-90 transition"
        >
          Falar com o comercial <IconArrowRight size={16}/>
        </a>
      </div>
    </div>
  )
}
