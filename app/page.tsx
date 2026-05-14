import type { Metadata } from "next";
import Link from "next/link";
import AuthErrorHandler from "@/components/AuthErrorHandler";

export const metadata: Metadata = {
  title: "Otto by RR7x — Plataforma de inteligência operacional para M&A",
  description:
    "Analise deals de M&A em até 40 minutos. 9 módulos especializados rodando em paralelo. Material institucional pronto para o mercado.",
  alternates: { canonical: "/" },
};

/* ─── Data ───────────────────────────────────────────────────────────────── */

const inteligencias = [
  {
    num: "01",
    bg: "bg-lp-accent-soft",
    dominio: "orquestração",
    funcao: "Estratégia e DRS",
    descricao:
      "Calcula o Deal Readiness Score do ativo, mapeia riscos materiais e define a sequência do pipeline antes de qualquer análise.",
    beneficio: "A equipe entra no deal sabendo exatamente onde ele está.",
  },
  {
    num: "02",
    bg: "bg-[#ECF8FF]",
    dominio: "mercado",
    funcao: "Viabilidade de Mercado",
    descricao:
      "Lê o cenário setorial, projeta demanda e emite parecer Go/No-Go com base em dados macro e microeconômicos.",
    beneficio: "Deals inviáveis saem da fila antes de consumir horas do time.",
  },
  {
    num: "03",
    bg: "bg-[#FEF8ED]",
    dominio: "m&a · valuation",
    funcao: "Tese de M&A e Valuation",
    descricao:
      "Constrói a tese de aquisição, calcula valuation por múltiplos e DCF e estrutura a estratégia de negociação.",
    beneficio: "O suporte técnico para a mesa de negociação já sai do pipeline.",
  },
  {
    num: "04",
    bg: "bg-[#EDFAF4]",
    dominio: "finanças",
    funcao: "Diagnóstico Financeiro",
    descricao:
      "Analisa EBITDA ajustado, endividamento, fluxo de caixa e tendências operacionais do ativo.",
    beneficio: "Números chegam organizados e interpretados, não em formato bruto.",
  },
  {
    num: "05",
    bg: "bg-[#F3EEFF]",
    dominio: "jurídico",
    funcao: "Análise Jurídica",
    descricao:
      "Identifica riscos legais, gaps de documentação e indica necessidade de NDA, SHA ou LOI.",
    beneficio: "O escritório sabe o que pedir antes de envolver o jurídico externo.",
  },
  {
    num: "06",
    bg: "bg-[#EDFAF4]",
    dominio: "crédito estruturado",
    funcao: "Crédito e Estruturação",
    descricao:
      "Ranqueia operações estruturadas aplicáveis — CRI, CRA, debêntures, securitização — por viabilidade.",
    beneficio: "Alternativas surgem automaticamente, sem consulta avulsa.",
  },
  {
    num: "07",
    bg: "bg-[#FEF0F4]",
    dominio: "originação",
    funcao: "Pipeline de Compradores",
    descricao:
      "Define o posicionamento do ativo e mapeia o perfil ideal de compradores e investidores.",
    beneficio: "O Blind Teaser sai calibrado para o público certo.",
  },
  {
    num: "08",
    bg: "bg-[#FEF8ED]",
    dominio: "maturidade",
    funcao: "Maturidade do Deal",
    descricao:
      "Avalia a prontidão do ativo para o mercado e gera roadmap de pré-venda quando necessário.",
    beneficio: "Deals não prontos recebem diagnóstico específico, não rejeição genérica.",
  },
  {
    num: "09",
    bg: "bg-[#ECF8FF]",
    dominio: "consolidação",
    funcao: "Controle de Qualidade",
    descricao:
      "Faz revisão cruzada entre todas as leituras e garante consistência técnica no relatório final.",
    beneficio: "O material que chega ao cliente passou por checagem interna sem custo adicional.",
  },
];

const comparativo = [
  { dim: "Tempo por análise completa",     trad: "10–15 dias úteis",               otto: "até 40 min" },
  { dim: "Capacidade mensal",              trad: "Baixa escala",                   otto: "40+ deals analisáveis" },
  { dim: "Organização do material",        trad: "Descentralizada por pessoa",     otto: "Fluxo estruturado e centralizado" },
  { dim: "Visibilidade sobre riscos",      trad: "Dependente da análise",          otto: "Cruzamento automático" },
  { dim: "Crescimento da capacidade",      trad: "Mais contratações = mais custo", otto: "Escala sem custo proporcional" },
  { dim: "Padrão dos materiais",           trad: "Variável por analista",          otto: "Institucional em todos os deals" },
  { dim: "Tempo de resposta ao cliente",   trad: "2 a 3 dias",                     otto: "No mesmo dia" },
  { dim: "Deals com análise profunda/mês", trad: "10 de 40",                       otto: "38 a 40 de 40" },
];

const planos = [
  {
    nome: "Pontual",
    tag: "avulso · por análise",
    preco: "R$ 2.500",
    complemento: "– 5.000 / análise",
    desc: "Para escritórios com demanda esporádica. Créditos sob demanda, sem comprometimento mensal.",
    features: [
      "Pipeline completo por análise",
      "Pitchbook e Teaser white-label",
      "Saída institucional padronizada",
      "Sem fidelidade contratual",
    ],
    destaque: false,
    cta: "Solicitar proposta",
    href: "/auth/signup",
    roi: null as string | null,
  },
  {
    nome: "Institucional",
    tag: "mensal · escritório",
    preco: "R$ 12.000",
    complemento: "/ mês",
    desc: "Para escritórios com fluxo constante. Análises ilimitadas dentro da capacidade mensal.",
    features: [
      "Até 20 análises por mês",
      "Onboarding e configuração incluídos",
      "Saída com identidade do escritório",
      "Suporte técnico prioritário",
      "Histórico e acervo de análises",
    ],
    destaque: true,
    cta: "Começar agora",
    href: "/auth/signup",
    roi: "ROI estimado no 1º mês",
  },
  {
    nome: "Corporativo",
    tag: "sob medida · enterprise",
    preco: "Sob consulta",
    complemento: "",
    desc: "Para redes de escritórios, fundos e estruturas com alto volume. SLA garantido.",
    features: [
      "Volume e SLA negociados",
      "Integração com sistemas internos",
      "Onboarding dedicado",
      "Gestor de conta exclusivo",
      "Acordo de confidencialidade",
    ],
    destaque: false,
    cta: "Falar com nossa equipe",
    href: "mailto:gestor@renanregonato.com.br?subject=Proposta%20Corporativo",
    roi: null as string | null,
  },
];

const depoimentos = [
  {
    texto:
      "Testamos o Otto em dois deals que eram candidatos ao No-Go de início. Em menos de uma hora tinha análise financeira e mapa jurídico de ambos. Um descartamos mesmo. O outro revelou uma estrutura de crédito que ninguém tinha visto — hoje é um mandato ativo.",
    nome: "Ricardo C.",
    cargo: "Sócio",
    empresa: "Boutique M&A · São Paulo",
    initial: "R",
    bg: "bg-lp-accent-soft",
  },
  {
    texto:
      "Minha função mudou de forma concreta. Antes eu passava dois dias organizando material para uma reunião. Agora esse trabalho já chega feito. Entro para fazer o que exige julgamento real — que é o que eu deveria estar fazendo desde o início.",
    nome: "Camila D.",
    cargo: "Analista Sênior",
    empresa: "Escritório de Estruturação · Rio de Janeiro",
    initial: "C",
    bg: "bg-[#EDFAF4]",
  },
  {
    texto:
      "O que mais me surpreendeu não foi a velocidade. Foi a consistência. Todo relatório sai com o mesmo padrão técnico. Para uma estrutura que analisa mais de 20 ativos por mês, isso muda completamente a forma de operar.",
    nome: "Felipe M.",
    cargo: "Gestor de Crédito",
    empresa: "Fundo de Crédito Estruturado · Belo Horizonte",
    initial: "F",
    bg: "bg-[#F3EEFF]",
  },
];

const faqs = [
  {
    q: "Como os dados dos deals são protegidos?",
    a: "Otto opera com criptografia em trânsito (TLS 1.3) e em repouso (AES-256). Nenhum dado é compartilhado entre escritórios. Cada análise fica isolada em ambiente dedicado ao escritório contratante.",
  },
  {
    q: "A plataforma está em conformidade com a LGPD?",
    a: "Sim. Otto não trata dados pessoais de terceiros — opera exclusivamente com documentos financeiros e societários dos ativos. O escritório continua sendo o controlador dos dados submetidos. Oferecemos DPA para planos Institucional e Corporativo.",
  },
  {
    q: "Quanto tempo leva para ter a plataforma funcionando?",
    a: "O onboarding leva de 1 a 3 dias úteis para os planos Institucional e Corporativo. Para o plano Pontual, a primeira análise pode ser submetida no mesmo dia do contrato.",
  },
  {
    q: "Otto se integra com ferramentas que já usamos?",
    a: "Atualmente exporta em PDF, Word e formato editável compatível com Office. Integração via API e conectores para CRMs estão no roadmap. Para planos Corporativo, avaliamos integrações customizadas mediante escopo.",
  },
  {
    q: "Como funciona o cancelamento?",
    a: "Planos mensais têm cancelamento a qualquer momento com 30 dias de aviso. Não há fidelidade mínima nos planos Pontual e Institucional. Planos Corporativos seguem o contrato negociado.",
  },
  {
    q: "Qual suporte está disponível?",
    a: "Todos os planos têm suporte por e-mail com resposta em até 24h úteis. O plano Institucional inclui suporte prioritário. O plano Corporativo inclui gestor de conta dedicado e SLA customizado.",
  },
  {
    q: "Quanto tempo leva para receber a análise?",
    a: "Até 40 minutos após a submissão dos documentos. Para planos Institucional e Corporativo, entrega garantida no mesmo dia mesmo para casos com documentação incompleta.",
  },
];

/* ─── Component ──────────────────────────────────────────────────────────── */

export default function LandingPage() {
  return (
    <div className="bg-lp-canvas text-lp-ink font-sans antialiased">
      <AuthErrorHandler />

      {/* ── Navbar ─────────────────────────────────────────────────────────── */}
      <header
        className="sticky top-0 z-50 border-b border-lp-border"
        style={{ background: "rgba(255,255,255,0.92)", backdropFilter: "blur(12px)" }}
      >
        <nav
          className="max-w-[1280px] mx-auto px-6 h-16 flex items-center justify-between"
          aria-label="Navegação principal"
        >
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-lp-accent grid place-items-center font-display italic font-normal text-[15px] text-white select-none">
              o
            </div>
            <span className="font-display text-[19px] text-lp-ink tracking-tight">Otto</span>
            <span className="text-[11px] text-lp-ink-3 font-sans tracking-wide uppercase">by RR7x</span>
          </Link>

          <ul className="hidden md:flex items-center gap-1 text-[13.5px] text-lp-ink-2">
            {[
              { href: "#como-funciona", label: "Como funciona" },
              { href: "#inteligencias", label: "Inteligências" },
              { href: "#comparativo",   label: "Comparativo"   },
              { href: "#planos",        label: "Planos"        },
              { href: "/blog",          label: "Blog"          },
            ].map((l) => (
              <li key={l.label}>
                <Link href={l.href} className="px-3 py-1.5 rounded-lg hover:bg-lp-fog transition-colors">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>

          <div className="flex items-center gap-2">
            <Link href="/auth/login" className="hidden sm:block text-[13px] text-lp-ink-2 hover:text-lp-ink px-4 py-2 transition-colors">
              Entrar
            </Link>
            <Link
              href="/auth/signup"
              className="text-[13px] font-medium text-white px-4 py-2 rounded-[9px] transition-opacity hover:opacity-90"
              style={{ background: "#1655E8" }}
            >
              Solicitar acesso
            </Link>
          </div>
        </nav>
      </header>

      {/* ── Hero ───────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden lp-hero-bg">
        <div className="max-w-[1280px] mx-auto px-6 pt-24 pb-20 lg:pt-32 lg:pb-28">
          <div className="max-w-[760px] mx-auto text-center">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 border border-lp-border-strong bg-lp-canvas text-lp-ink-2 text-[11px] font-medium px-3.5 py-1.5 rounded-full mb-8 tracking-widest uppercase">
              <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: "#1655E8" }} />
              9 inteligências em paralelo · 40 minutos
            </div>

            {/* Headline */}
            <h1 className="font-display text-[52px] sm:text-[64px] lg:text-[76px] leading-[1.04] tracking-tight text-lp-ink mb-6">
              Seu escritório analisa
              <br />
              40 deals por mês.{" "}
              <em style={{ fontStyle: "italic" }}>Quantos recebem análise real?</em>
            </h1>

            {/* Subline */}
            <p className="text-[16px] sm:text-[17px] text-lp-ink-2 leading-relaxed max-w-[620px] mx-auto mb-10">
              Otto é a plataforma de inteligência operacional que processa, analisa e estrutura
              operações de M&A em{" "}
              <strong className="text-lp-ink font-semibold">até 40 minutos</strong> — com compliance
              documentado, valuation sustentado e material pronto para o mercado.
            </p>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row gap-3 justify-center mb-4">
              <Link
                href="/auth/signup"
                className="inline-flex items-center justify-center gap-2 text-[14px] font-medium text-white px-7 py-3.5 rounded-[11px] transition-opacity hover:opacity-90"
                style={{ background: "#1655E8" }}
              >
                Solicitar acesso à plataforma
                <span aria-hidden>→</span>
              </Link>
              <a
                href="#comparativo"
                className="inline-flex items-center justify-center text-[14px] font-medium text-lp-ink border border-lp-border-strong px-7 py-3.5 rounded-[11px] hover:bg-lp-fog transition-colors"
              >
                Ver comparativo
              </a>
            </div>
            <p className="text-[12px] text-lp-ink-3">
              Reservamos uma conversa inicial para entender o contexto do escritório
            </p>
          </div>

          {/* Floating cards */}
          <div className="hidden lg:block relative mt-16 h-32">
            <div
              className="absolute left-0 top-0 w-[220px] bg-lp-canvas rounded-[16px] p-4 lp-card-shadow"
              style={{ transform: "translateY(-10px)" }}
              aria-hidden="true"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] font-medium text-lp-ink-3 uppercase tracking-widest">Deal Readiness Score</span>
                <span className="text-[10px] font-medium px-2 py-0.5 rounded-full" style={{ background: "#EDFAF4", color: "#14753B" }}>
                  Aprovado
                </span>
              </div>
              <div className="flex items-end gap-1 mb-1">
                <span className="font-display text-[38px] leading-none text-lp-ink">8.2</span>
                <span className="text-[16px] text-lp-ink-3 mb-1">/10</span>
              </div>
              <p className="text-[11px] text-lp-ink-3 mb-2">Grupo Meridian S.A.</p>
              <div className="h-1.5 rounded-full bg-lp-fog overflow-hidden">
                <div className="h-full rounded-full" style={{ width: "82%", background: "#1655E8" }} />
              </div>
            </div>

            <div
              className="absolute right-0 top-0 w-[252px] bg-lp-canvas rounded-[16px] p-4 lp-card-shadow"
              style={{ transform: "translateY(10px)" }}
              aria-hidden="true"
            >
              <div className="flex items-center gap-2 mb-3">
                <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: "#1655E8" }} />
                <span className="text-[10px] font-medium text-lp-ink-2">Análise em execução</span>
              </div>
              {[
                { r: "Diagnóstico Financeiro", done: true  },
                { r: "Tese de M&A",            done: true  },
                { r: "Originação",             done: false },
              ].map((a) => (
                <div key={a.r} className="flex items-center gap-2 py-1.5 border-t border-lp-border-subtle">
                  <span className="text-[10px] flex-shrink-0" style={{ color: a.done ? "#14753B" : "#1655E8" }}>
                    {a.done ? "✓" : "↻"}
                  </span>
                  <span className="text-[11px] text-lp-ink">{a.r}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Metrics bar ────────────────────────────────────────────────────── */}
      <section className="border-y border-lp-border bg-lp-fog">
        <div className="max-w-[1280px] mx-auto px-6 py-8">
          <dl className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            {[
              { value: "40 min",     label: "análise completa"          },
              { value: "40+",        label: "deals analisáveis/mês"     },
              { value: "4×",         label: "capacidade institucional"  },
              { value: "R$ 6M–12M",  label: "receita incremental/ano"   },
            ].map((m) => (
              <div key={m.value}>
                <dt className="font-display text-[34px] sm:text-[38px] leading-none text-lp-ink mb-1">{m.value}</dt>
                <dd className="text-[12px] text-lp-ink-3">{m.label}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* ── Problema: Tempo ────────────────────────────────────────────────── */}
      <section className="max-w-[1280px] mx-auto px-6 py-20 lg:py-28">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          <div>
            <p className="text-[11px] font-medium text-lp-accent uppercase tracking-widest mb-4">o gargalo operacional</p>
            <h2 className="font-display text-[36px] sm:text-[46px] leading-[1.08] tracking-tight text-lp-ink mb-5">
              Cada análise consome
              <br />
              entre{" "}
              <em style={{ fontStyle: "italic" }}>10 e 15 dias úteis.</em>
            </h2>
            <p className="text-[15.5px] text-lp-ink-2 leading-relaxed mb-6">
              Com 40 deals por mês e 10 a 15 dias de análise cada, sua equipe nunca
              sai do modo operacional. O tempo vai para triagem — não para mandatos.
            </p>
            <p className="text-[15px] text-lp-ink-3 leading-relaxed border-l-2 border-lp-border-strong pl-4">
              30 dos 40 deals que chegam por mês saem sem análise real. Sem resposta,
              sem diagnóstico, sem chance de virar receita.
            </p>
          </div>

          <div className="bg-lp-fog rounded-[20px] p-8 border border-lp-border">
            <div className="grid grid-cols-[1fr_auto_1fr] gap-4 items-center text-center">
              <div>
                <p className="text-[11px] font-medium text-lp-ink-3 uppercase tracking-wider mb-3">modelo tradicional</p>
                <p className="font-display text-[52px] leading-none text-lp-ink">10–15</p>
                <p className="text-[13px] text-lp-ink-3 mt-1">dias úteis</p>
                <p className="text-[11.5px] text-lp-ink-4 mt-1">por análise completa</p>
              </div>
              <div className="font-display text-[28px] text-lp-ink-4">×</div>
              <div>
                <p className="text-[11px] font-medium text-lp-accent uppercase tracking-wider mb-3">Otto</p>
                <p className="font-display text-[52px] leading-none text-lp-ink">40</p>
                <p className="text-[13px] text-lp-ink-3 mt-1">minutos</p>
                <p className="text-[11.5px] text-lp-ink-4 mt-1">9 módulos em paralelo</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Custo invisível ────────────────────────────────────────────────── */}
      <section className="bg-lp-fog border-y border-lp-border">
        <div className="max-w-[1280px] mx-auto px-6 py-20 lg:py-28">
          <div className="max-w-[600px] mb-12">
            <p className="text-[11px] font-medium text-lp-accent uppercase tracking-widest mb-4">custo real</p>
            <h2 className="font-display text-[36px] sm:text-[46px] leading-[1.08] tracking-tight text-lp-ink">
              O que ninguém contabiliza
              <br />
              em uma operação de{" "}
              <em style={{ fontStyle: "italic" }}>M&amp;A.</em>
            </h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              {
                value: "R$ 15k–30k",
                label: "custo mensal",
                desc: "de um analista júnior em CLT — encargos e bônus incluídos.",
                accent: false,
              },
              {
                value: "R$ 2k–8k",
                label: "honorários jurídicos",
                desc: "por análise contratual avulsa com advogado externo.",
                accent: false,
              },
              {
                value: "30 deals",
                label: "sem análise/mês",
                desc: "em escritório com 10+ profissionais e 40 deals de entrada.",
                accent: false,
              },
              {
                value: "R$ 9M+/ano",
                label: "receita não capturada",
                desc: "mandatos que passam pelo escritório sem virar receita.",
                accent: true,
              },
            ].map((c) => (
              <div
                key={c.label}
                className={`rounded-[18px] p-6 border ${
                  c.accent ? "bg-lp-ink border-lp-ink" : "bg-lp-canvas border-lp-border lp-card-shadow-sm"
                }`}
              >
                <p className={`font-display text-[30px] leading-none mb-1 ${c.accent ? "text-white" : "text-lp-ink"}`}>
                  {c.value}
                </p>
                <p className={`text-[11px] font-semibold uppercase tracking-wider mb-3 ${c.accent ? "text-lp-dark-text-2" : "text-lp-ink-3"}`}>
                  {c.label}
                </p>
                <p className={`text-[13px] leading-relaxed ${c.accent ? "text-lp-dark-text-2" : "text-lp-ink-3"}`}>
                  {c.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Custo de oportunidade ─────────────────────────────────────────── */}
      <section className="max-w-[1280px] mx-auto px-6 py-20 lg:py-28">
        <h2 className="font-display text-[44px] sm:text-[58px] lg:text-[72px] leading-[1.04] tracking-tight text-lp-ink max-w-[900px] mb-10">
          A pergunta não é
          <br />
          se Otto vale.
          <br />
          É{" "}
          <em style={{ fontStyle: "italic" }}>quanto custa esperar.</em>
        </h2>
        <div className="grid sm:grid-cols-2 gap-4 max-w-[720px]">
          <div className="border-l-2 border-lp-border-strong pl-5">
            <p className="text-[15.5px] text-lp-ink-2 leading-relaxed">
              Cada semana sem Otto são 10 deals que entram e saem sem análise real.
            </p>
          </div>
          <div className="border-l-2 pl-5" style={{ borderColor: "#1655E8" }}>
            <p className="text-[15.5px] text-lp-ink leading-relaxed font-medium">
              Cada mês são mandatos fechados pelo concorrente que respondeu primeiro.
            </p>
          </div>
        </div>
      </section>

      {/* ── A plataforma ───────────────────────────────────────────────────── */}
      <section className="bg-lp-fog border-y border-lp-border">
        <div className="max-w-[1280px] mx-auto px-6 py-20 lg:py-28">
          <div className="max-w-[640px] mb-14">
            <p className="text-[11px] font-medium text-lp-accent uppercase tracking-widest mb-4">a plataforma</p>
            <h2 className="font-display text-[36px] sm:text-[46px] leading-[1.08] tracking-tight text-lp-ink mb-5">
              Uma central de inteligência
              <br />
              que{" "}
              <em style={{ fontStyle: "italic" }}>potencializa assessores.</em>
            </h2>
            <p className="text-[15.5px] text-lp-ink-2 leading-relaxed mb-4">
              Otto não substitui o profissional. Organiza informação, cruza dados e amplia a
              capacidade de análise da equipe responsável pela decisão.
            </p>
            <p className="text-[14.5px] text-lp-ink-3 leading-relaxed border-l-2 border-lp-border-strong pl-4">
              A decisão final é sempre humana, técnica e profissional. Otto sai de cena no
              documento final.
            </p>
          </div>
          <div className="grid sm:grid-cols-3 gap-5">
            {[
              {
                num: "01",
                title: "Velocidade real",
                body: "Até 40 minutos da submissão ao diagnóstico completo. Para mandatos urgentes, isso muda o resultado da negociação.",
              },
              {
                num: "02",
                title: "Escala sem custo",
                body: "40+ deals analisáveis por mês com a mesma equipe. Crescimento sem contratação adicional.",
              },
              {
                num: "03",
                title: "Padrão institucional",
                body: "Material gerado com a identidade do escritório. Consistência técnica em todos os deals, independente do analista.",
              },
            ].map((f) => (
              <div key={f.num} className="bg-lp-canvas rounded-[18px] p-6 border border-lp-border lp-card-shadow-sm">
                <p className="font-display text-[12px] text-lp-ink-4 mb-3">{f.num}</p>
                <h3 className="text-[15px] font-semibold text-lp-ink mb-2.5">{f.title}</h3>
                <p className="text-[13.5px] text-lp-ink-3 leading-relaxed">{f.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Sistema: mockup ────────────────────────────────────────────────── */}
      <section className="max-w-[1280px] mx-auto px-6 py-20 lg:py-28">
        <div className="grid lg:grid-cols-2 gap-14 items-center">
          <div>
            <p className="text-[11px] font-medium text-lp-accent uppercase tracking-widest mb-4">interface</p>
            <h2 className="font-display text-[36px] sm:text-[44px] leading-[1.08] tracking-tight text-lp-ink mb-5">
              Do upload ao relatório.
              <br />
              <em style={{ fontStyle: "italic" }}>Tudo em uma tela.</em>
            </h2>
            <p className="text-[15px] text-lp-ink-2 leading-relaxed mb-6">
              O assessor submete os documentos do ativo. Otto orquestra os 9 módulos
              em paralelo e entrega o diagnóstico completo — com DRS, valuation, mapa
              jurídico, estruturação e Blind Teaser — em até 40 minutos.
            </p>
            <ul className="space-y-3">
              {[
                "Deal Readiness Score calculado automaticamente",
                "Status em tempo real de cada módulo",
                "Exportação em PDF, Word ou template do escritório",
                "Histórico completo de análises anteriores",
              ].map((item) => (
                <li key={item} className="flex items-start gap-2.5 text-[13.5px] text-lp-ink-2">
                  <span className="flex-shrink-0 mt-0.5 text-[11px] font-bold" style={{ color: "#1655E8" }}>✓</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>

          {/* Browser mockup */}
          <div className="rounded-[16px] overflow-hidden border border-lp-border lp-card-shadow" aria-hidden="true">
            {/* Browser chrome */}
            <div className="bg-lp-fog border-b border-lp-border px-4 py-3 flex items-center gap-3">
              <div className="flex gap-1.5">
                <span className="w-3 h-3 rounded-full bg-[#FF5F57]" />
                <span className="w-3 h-3 rounded-full bg-[#FEBC2E]" />
                <span className="w-3 h-3 rounded-full bg-[#28C840]" />
              </div>
              <div className="flex-1 bg-lp-canvas rounded-md px-3 py-1 text-[11px] text-lp-ink-3 font-mono">
                app.ottobyrr7x.com.br/analise/MRD-2025-041
              </div>
            </div>

            {/* App content */}
            <div className="bg-lp-canvas">
              {/* App nav */}
              <div className="border-b border-lp-border px-5 py-3 flex items-center justify-between">
                <div className="flex items-center gap-5">
                  <div className="flex items-center gap-1.5">
                    <div className="w-5 h-5 rounded bg-lp-accent grid place-items-center font-display italic text-[11px] text-white">o</div>
                    <span className="text-[12px] font-medium text-lp-ink">Otto</span>
                  </div>
                  <div className="hidden sm:flex gap-4 text-[11px] text-lp-ink-3">
                    <span className="text-lp-accent font-medium border-b border-lp-accent pb-0.5">Análises</span>
                    <span>Relatórios</span>
                    <span>Configurações</span>
                  </div>
                </div>
                <button className="text-[11px] font-medium text-white px-3 py-1.5 rounded-[7px]" style={{ background: "#1655E8" }}>
                  + Novo deal
                </button>
              </div>

              {/* Main content */}
              <div className="p-5">
                {/* Deal header */}
                <div className="flex items-start justify-between mb-5">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[11px] font-medium text-lp-ink-3 uppercase tracking-wider">MRD-2025-041</span>
                      <span className="text-[10px] font-medium px-2 py-0.5 rounded-full" style={{ background: "#EDFAF4", color: "#14753B" }}>
                        Aprovado para mercado
                      </span>
                    </div>
                    <p className="text-[15px] font-semibold text-lp-ink">Grupo Meridian S.A.</p>
                    <p className="text-[11.5px] text-lp-ink-3">Indústria · São Paulo, SP · Submetido há 23 min</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-medium text-lp-ink-3 uppercase tracking-wider mb-1">DRS</p>
                    <p className="font-display text-[28px] leading-none text-lp-ink">7.4</p>
                    <p className="text-[10px] text-lp-ink-4">/10</p>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="mb-5">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[11px] text-lp-ink-3">Pipeline</span>
                    <span className="text-[11px] font-medium text-lp-accent">67% completo</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-lp-fog overflow-hidden">
                    <div className="h-full rounded-full transition-all" style={{ width: "67%", background: "#1655E8" }} />
                  </div>
                </div>

                {/* Modules */}
                <div className="space-y-1">
                  {[
                    { name: "Estratégia e DRS",        status: "completo",    time: "02:14", done: true  },
                    { name: "Viabilidade de Mercado",  status: "completo",    time: "06:47", done: true  },
                    { name: "Tese de M&A e Valuation", status: "completo",    time: "11:23", done: true  },
                    { name: "Diagnóstico Financeiro",  status: "executando",  time: "—",     done: false },
                    { name: "Análise Jurídica",        status: "na fila",     time: "—",     done: null  },
                    { name: "Crédito e Estruturação",  status: "na fila",     time: "—",     done: null  },
                  ].map((mod) => (
                    <div
                      key={mod.name}
                      className={`flex items-center justify-between px-3 py-2 rounded-[8px] ${mod.done === null ? "" : mod.done ? "bg-lp-fog" : "bg-lp-accent-soft"}`}
                    >
                      <div className="flex items-center gap-2.5">
                        <span
                          className="text-[11px] w-4 text-center"
                          style={{
                            color: mod.done === true ? "#14753B" : mod.done === false ? "#1655E8" : "#9AAAC5",
                          }}
                        >
                          {mod.done === true ? "✓" : mod.done === false ? "↻" : "·"}
                        </span>
                        <span className={`text-[12px] ${mod.done === null ? "text-lp-ink-4" : "text-lp-ink"}`}>
                          {mod.name}
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span
                          className="text-[10px] font-medium"
                          style={{
                            color: mod.done === true ? "#14753B" : mod.done === false ? "#1655E8" : "#9AAAC5",
                          }}
                        >
                          {mod.status}
                        </span>
                        <span className="text-[10px] text-lp-ink-4 font-mono w-10 text-right">{mod.time}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Comparativo ────────────────────────────────────────────────────── */}
      <section id="comparativo" className="bg-lp-fog border-y border-lp-border">
        <div className="max-w-[1280px] mx-auto px-6 py-20 lg:py-28">
          <div className="max-w-[540px] mb-12">
            <p className="text-[11px] font-medium text-lp-accent uppercase tracking-widest mb-4">comparativo</p>
            <h2 className="font-display text-[36px] sm:text-[46px] leading-[1.08] tracking-tight text-lp-ink">
              Modelo Tradicional
              <br />× <em style={{ fontStyle: "italic" }}>Otto.</em>
            </h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-[13.5px]" style={{ borderCollapse: "collapse" }}>
              <thead>
                <tr className="border-b-2 border-lp-border-strong">
                  <th className="text-left py-3 pr-6 font-semibold text-lp-ink-3 text-[11px] uppercase tracking-wider w-[35%]">
                    Dimensão
                  </th>
                  <th className="text-left py-3 px-4 font-semibold text-lp-ink-3 text-[11px] uppercase tracking-wider">
                    Modelo Tradicional
                  </th>
                  <th className="text-left py-3 pl-4 font-semibold text-[11px] uppercase tracking-wider" style={{ color: "#1655E8" }}>
                    Otto
                  </th>
                </tr>
              </thead>
              <tbody>
                {comparativo.map((row, i) => (
                  <tr key={row.dim} className={`border-b border-lp-border ${i % 2 === 0 ? "bg-lp-canvas" : "bg-lp-fog"}`}>
                    <td className="py-3.5 pr-6 text-lp-ink-2 text-[13px]">{row.dim}</td>
                    <td className="py-3.5 px-4 text-lp-ink-3">{row.trad}</td>
                    <td className="py-3.5 pl-4 font-medium" style={{ color: "#1655E8" }}>{row.otto}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ── Pipeline ───────────────────────────────────────────────────────── */}
      <section id="como-funciona" className="max-w-[1280px] mx-auto px-6 py-20 lg:py-28">
        <div className="max-w-[540px] mb-12">
          <p className="text-[11px] font-medium text-lp-accent uppercase tracking-widest mb-4">como funciona</p>
          <h2 className="font-display text-[36px] sm:text-[46px] leading-[1.08] tracking-tight text-lp-ink">
            Do ativo cru
            <br />
            ao{" "}
            <em style={{ fontStyle: "italic" }}>Pitchbook entregue.</em>
          </h2>
        </div>

        <div className="grid md:grid-cols-4 gap-6 mb-8">
          {[
            {
              num: "01",
              tag: "intake",
              title: "Cadastro do ativo",
              body: "O assessor submete o deal e anexa documentos. O sistema lê e organiza cada arquivo para preparar o pipeline.",
            },
            {
              num: "02",
              tag: "orquestração",
              title: "Estratégia e DRS",
              body: "O módulo de orquestração calcula o Deal Readiness Score, mapeia riscos e define a sequência de análise.",
            },
            {
              num: "03",
              tag: "análise",
              title: "9 módulos em paralelo",
              body: "Cada módulo processa o ativo no seu domínio. Financeiro, jurídico, mercado, valuation — simultâneos.",
            },
            {
              num: "04",
              tag: "saída",
              title: "Saída padronizada",
              body: "Blind Teaser e Sell-Side Pitchbook gerados com a identidade do escritório. Otto sai de cena no documento final.",
            },
          ].map((s) => (
            <div key={s.num} className="bg-lp-fog rounded-[18px] p-6 border border-lp-border lp-card-shadow-sm">
              <p className="text-[10.5px] font-medium text-lp-ink-4 uppercase tracking-widest mb-1">{s.num} · {s.tag}</p>
              <div className="h-px bg-lp-border-strong mb-4 w-8" />
              <h3 className="text-[15px] font-semibold text-lp-ink mb-2.5 leading-snug">{s.title}</h3>
              <p className="text-[13px] text-lp-ink-3 leading-relaxed">{s.body}</p>
            </div>
          ))}
        </div>

        <p className="font-display text-[20px] italic text-lp-ink-2 border-t border-lp-border pt-6">
          Otto sai de cena no documento final.
        </p>
      </section>

      {/* ── Ganho operacional ──────────────────────────────────────────────── */}
      <section className="bg-lp-fog border-y border-lp-border">
        <div className="max-w-[1280px] mx-auto px-6 py-20 lg:py-28">
          <div className="grid lg:grid-cols-2 gap-16 items-start">
            <div>
              <p className="text-[11px] font-medium text-lp-accent uppercase tracking-widest mb-4">ganho operacional</p>
              <h2 className="font-display text-[36px] sm:text-[46px] leading-[1.08] tracking-tight text-lp-ink mb-5">
                A mesma equipe.
                <br />
                <em style={{ fontStyle: "italic" }}>Quatro vezes mais capacidade.</em>
              </h2>
              <p className="text-[15.5px] text-lp-ink-2 leading-relaxed mb-8">
                Mesma entrada, 4× mais análise. Trinta análises profundas adicionais por mês.
                Zero triagem manual. Sem contratação.
              </p>
              <div className="bg-lp-ink rounded-[16px] p-6">
                <p className="font-display text-[44px] leading-none text-white mb-1">R$ 6M–12M</p>
                <p className="text-[12px] font-medium uppercase tracking-widest mb-3" style={{ color: "#7A92BE" }}>
                  receita incremental anual
                </p>
                <p className="text-[13.5px] leading-relaxed" style={{ color: "#C8D4EC" }}>
                  Sem contratar. Sem aumentar custo fixo. Com a mesma equipe que você já tem.
                </p>
              </div>
            </div>

            <div className="space-y-4">
              {[
                {
                  header: "sem Otto",
                  dark: false,
                  items: [
                    "40 deals recebidos/mês",
                    "10 analisados com profundidade real",
                    "4 mandatos fechados/mês",
                    "30 deals sem análise — sem retorno",
                    "Receita mensal R$ 1M–2M",
                  ],
                },
                {
                  header: "com Otto",
                  dark: true,
                  items: [
                    "40 deals com profundidade — todos",
                    "+4 mandatos qualificados identificados/mês",
                    "+2 fechamentos (conversão conservadora)",
                    "ROI positivo no 1º mês de operação",
                    "Receita incremental anual R$ 6M–12M",
                  ],
                },
              ].map((col) => (
                <div
                  key={col.header}
                  className={`rounded-[16px] p-5 border ${
                    col.dark ? "border-lp-accent-strong bg-lp-accent-soft" : "border-lp-border bg-lp-canvas"
                  }`}
                >
                  <p className={`text-[11px] font-semibold uppercase tracking-wider mb-3 ${col.dark ? "text-lp-accent" : "text-lp-ink-3"}`}>
                    {col.header}
                  </p>
                  <ul className="space-y-1.5">
                    {col.items.map((item) => (
                      <li key={item} className={`flex items-start gap-2 text-[13px] ${col.dark ? "text-lp-accent-ink" : "text-lp-ink-2"}`}>
                        <span className="flex-shrink-0 mt-0.5 text-[10px]">{col.dark ? "→" : "·"}</span>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Inteligências ──────────────────────────────────────────────────── */}
      <section id="inteligencias" className="max-w-[1280px] mx-auto px-6 py-20 lg:py-28">
        <div className="text-center max-w-[600px] mx-auto mb-14">
          <p className="text-[11px] font-medium text-lp-accent uppercase tracking-widest mb-4">rede neural</p>
          <h2 className="font-display text-[36px] sm:text-[46px] leading-[1.08] tracking-tight text-lp-ink mb-4">
            Nove módulos em rede.
            <br />
            <em style={{ fontStyle: "italic" }}>Um único pipeline.</em>
          </h2>
          <p className="text-[15px] text-lp-ink-2 leading-relaxed">
            Cada módulo processa o ativo com a precisão do seu domínio. As leituras
            se cruzam. O resultado é um relatório institucional consistente.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {inteligencias.map((a) => (
            <article key={a.num} className="bg-lp-canvas rounded-[18px] p-5 border border-lp-border lp-card-shadow-sm">
              <div className="flex items-center gap-2.5 mb-3">
                <div className={`w-9 h-9 rounded-[10px] ${a.bg} grid place-items-center font-display font-normal text-[13px] text-lp-ink flex-shrink-0`}>
                  {a.num}
                </div>
                <span className="text-[10px] font-medium text-lp-ink-4 uppercase tracking-widest">{a.dominio}</span>
              </div>
              <p className="text-[13px] font-semibold text-lp-ink leading-snug mb-1.5">{a.funcao}</p>
              <p className="text-[12.5px] text-lp-ink-3 leading-relaxed mb-3">{a.descricao}</p>
              <p className="text-[11.5px] text-lp-accent border-t border-lp-border-subtle pt-2.5">
                → {a.beneficio}
              </p>
            </article>
          ))}
        </div>
      </section>

      {/* ── Otto potencializa ──────────────────────────────────────────────── */}
      <section className="bg-lp-fog border-y border-lp-border">
        <div className="max-w-[1280px] mx-auto px-6 py-20 lg:py-28">
          <div className="max-w-[540px] mb-12">
            <p className="text-[11px] font-medium text-lp-accent uppercase tracking-widest mb-4">posicionamento</p>
            <h2 className="font-display text-[36px] sm:text-[46px] leading-[1.08] tracking-tight text-lp-ink mb-4">
              Otto potencializa.
              <br />
              <em style={{ fontStyle: "italic" }}>Nunca substitui.</em>
            </h2>
            <p className="text-[15.5px] text-lp-ink-2">
              A decisão final é sempre humana, técnica e profissional.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-5">
            {[
              {
                header: "Otto faz",
                accent: false,
                items: [
                  "Organiza informações e dados",
                  "Cruza dados e identifica padrões",
                  "Estrutura diagnósticos iniciais",
                  "Aponta riscos e direcionamentos",
                  "Gera material para revisão",
                  "Documenta e sustenta processos",
                ],
              },
              {
                header: "O profissional decide",
                accent: true,
                items: [
                  "Validação técnica e especialista",
                  "Parecer jurídico e estratégico",
                  "Negociação de termos e estrutura",
                  "Julgamento estratégico do deal",
                  "Responsabilidade profissional",
                  "Assinatura e aprovação final",
                ],
              },
              {
                header: "Otto não faz",
                accent: false,
                items: [
                  "Não assina documentos",
                  "Não valida juridicamente",
                  "Não emite parecer técnico",
                  "Não toma decisões finais",
                  "Não representa o cliente",
                  "Não substitui nenhum profissional",
                ],
              },
            ].map((col) => (
              <div
                key={col.header}
                className={`rounded-[18px] p-6 border lp-card-shadow-sm ${
                  col.accent ? "bg-lp-ink border-lp-ink" : "bg-lp-canvas border-lp-border"
                }`}
              >
                <p className={`text-[12px] font-semibold mb-4 ${col.accent ? "text-white" : "text-lp-ink"}`}>
                  {col.header}
                </p>
                <ul className="space-y-2">
                  {col.items.map((item) => (
                    <li
                      key={item}
                      className={`flex items-start gap-2 text-[13px] leading-snug ${col.accent ? "text-lp-dark-text" : "text-lp-ink-2"}`}
                    >
                      <span className={`flex-shrink-0 mt-0.5 text-[10px] ${col.accent ? "opacity-50" : "text-lp-ink-4"}`}>·</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Depoimentos ────────────────────────────────────────────────────── */}
      <section className="max-w-[1280px] mx-auto px-6 py-20 lg:py-28">
        <div className="max-w-[540px] mb-12">
          <p className="text-[11px] font-medium text-lp-accent uppercase tracking-widest mb-4">depoimentos</p>
          <h2 className="font-display text-[36px] sm:text-[44px] leading-[1.1] tracking-tight text-lp-ink">
            Quem usa,{" "}
            <em style={{ fontStyle: "italic" }}>não volta ao modelo anterior.</em>
          </h2>
        </div>

        <div className="grid md:grid-cols-3 gap-5">
          {depoimentos.map((d) => (
            <figure key={d.nome} className="bg-lp-canvas rounded-[20px] p-6 border border-lp-border lp-card-shadow-sm flex flex-col">
              <blockquote className="flex-1 mb-6">
                <p className="text-[14px] text-lp-ink-2 leading-relaxed">
                  &ldquo;{d.texto}&rdquo;
                </p>
              </blockquote>
              <figcaption className="flex items-center gap-3 border-t border-lp-border-subtle pt-4">
                <div className={`w-9 h-9 rounded-full ${d.bg} grid place-items-center text-[13px] font-semibold text-lp-ink flex-shrink-0`}>
                  {d.initial}
                </div>
                <div>
                  <p className="text-[13px] font-semibold text-lp-ink">{d.nome}</p>
                  <p className="text-[11px] text-lp-ink-3">{d.cargo} · {d.empresa}</p>
                </div>
              </figcaption>
            </figure>
          ))}
        </div>
      </section>

      {/* ── Planos ─────────────────────────────────────────────────────────── */}
      <section id="planos" className="bg-lp-fog border-y border-lp-border">
        <div className="max-w-[1280px] mx-auto px-6 py-20 lg:py-28">
          <div className="text-center max-w-[540px] mx-auto mb-14">
            <p className="text-[11px] font-medium text-lp-accent uppercase tracking-widest mb-4">planos</p>
            <h2 className="font-display text-[36px] sm:text-[46px] leading-[1.08] tracking-tight text-lp-ink mb-4">
              Três modelos de
              <br />
              <em style={{ fontStyle: "italic" }}>contratação.</em>
            </h2>
            <p className="text-[14px] text-lp-ink-3">
              Sem taxa de adesão. Sem setup oculto. ROI positivo estimado no primeiro mês.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-5 max-w-[960px] mx-auto">
            {planos.map((p) => (
              <div
                key={p.nome}
                className={`relative rounded-[20px] p-7 flex flex-col ${
                  p.destaque ? "border-2 lp-card-shadow" : "border border-lp-border bg-lp-canvas lp-card-shadow-sm"
                }`}
                style={p.destaque ? { borderColor: "#1655E8", background: "#FFFFFF" } : {}}
              >
                {p.destaque && (
                  <div
                    className="absolute -top-3 left-1/2 -translate-x-1/2 text-[10px] font-semibold text-white px-3 py-1 rounded-full tracking-wide whitespace-nowrap"
                    style={{ background: "#1655E8" }}
                  >
                    Mais escolhido
                  </div>
                )}
                <div className="mb-5">
                  <p className="text-[10px] font-medium text-lp-ink-4 uppercase tracking-widest mb-2">{p.tag}</p>
                  <p className="text-[15px] font-semibold text-lp-ink mb-1">{p.nome}</p>
                  <div className="flex items-baseline gap-1">
                    <span className="font-display text-[26px] text-lp-ink leading-none">{p.preco}</span>
                    {p.complemento && <span className="text-[12px] text-lp-ink-3">{p.complemento}</span>}
                  </div>
                  <p className="text-[12.5px] text-lp-ink-3 mt-2 leading-relaxed">{p.desc}</p>
                  {p.roi && (
                    <p className="text-[11px] font-medium mt-2" style={{ color: "#14753B" }}>✓ {p.roi}</p>
                  )}
                </div>
                <ul className="space-y-2.5 flex-1 mb-7">
                  {p.features.map((f) => (
                    <li key={f} className="flex items-start gap-2.5 text-[13px] text-lp-ink-2">
                      <span className="flex-shrink-0 mt-0.5 text-[11px] font-bold" style={{ color: "#1655E8" }}>✓</span>
                      {f}
                    </li>
                  ))}
                </ul>
                <Link
                  href={p.href}
                  className={`w-full text-center py-2.5 rounded-[10px] text-[13px] font-medium transition-opacity ${
                    p.destaque ? "text-white hover:opacity-90" : "border border-lp-border-strong text-lp-ink hover:bg-lp-fog"
                  }`}
                  style={p.destaque ? { background: "#1655E8" } : {}}
                >
                  {p.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ────────────────────────────────────────────────────────────── */}
      <section className="max-w-[1280px] mx-auto px-6 py-20 lg:py-28">
        <div className="text-center max-w-[540px] mx-auto mb-14">
          <p className="text-[11px] font-medium text-lp-accent uppercase tracking-widest mb-4">dúvidas frequentes</p>
          <h2 className="font-display text-[36px] sm:text-[44px] leading-[1.1] tracking-tight text-lp-ink">
            Antes de decidir,{" "}
            <em style={{ fontStyle: "italic" }}>leia isso.</em>
          </h2>
        </div>
        <div className="max-w-[720px] mx-auto divide-y divide-lp-border">
          {faqs.map((faq) => (
            <details key={faq.q} className="group py-5 cursor-pointer">
              <summary className="flex items-center justify-between gap-4 text-[15px] font-semibold text-lp-ink select-none list-none">
                {faq.q}
                <span className="text-lp-ink-3 flex-shrink-0 text-[18px] font-light group-open:rotate-45 transition-transform">+</span>
              </summary>
              <p className="mt-3 text-[14px] text-lp-ink-2 leading-relaxed">{faq.a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* ── CTA final ──────────────────────────────────────────────────────── */}
      <section className="lp-dark-section">
        <div className="max-w-[1280px] mx-auto px-6 py-20 lg:py-28 text-center">
          <h2
            className="font-display text-[44px] sm:text-[60px] lg:text-[72px] leading-[1.04] tracking-tight mb-6"
            style={{ color: "#EEF3FF" }}
          >
            Para conhecer
            <br />
            <em style={{ fontStyle: "italic", color: "#93B4F8" }}>Otto.</em>
          </h2>
          <p className="text-[16px] leading-relaxed max-w-[500px] mx-auto mb-10" style={{ color: "#7A92BE" }}>
            Solicite acesso à plataforma. Reservamos uma conversa inicial para entender
            o contexto do escritório antes de qualquer demonstração.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/auth/signup"
              className="inline-flex items-center justify-center gap-2 text-[14px] font-medium text-white px-7 py-3.5 rounded-[11px] transition-opacity hover:opacity-90"
              style={{ background: "#1655E8" }}
            >
              Solicitar acesso
              <span aria-hidden>→</span>
            </Link>
            <a
              href="mailto:gestor@renanregonato.com.br?subject=Quero%20conhecer%20Otto"
              className="inline-flex items-center justify-center text-[14px] font-medium px-7 py-3.5 rounded-[11px] lp-dark-btn"
            >
              Falar com nossa equipe
            </a>
          </div>
          <p className="text-[12px] mt-6" style={{ color: "#334560" }}>
            1.426 transações de M&amp;A no Brasil em 2024 · Fonte: TTR / Kroll Brazil M&amp;A Report
          </p>
        </div>
      </section>

      {/* ── Footer ─────────────────────────────────────────────────────────── */}
      <footer className="border-t" style={{ background: "#040811", borderColor: "#1E2E4A" }}>
        <div className="max-w-[1280px] mx-auto px-6 py-14">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-8 mb-12">
            {/* Brand */}
            <div className="col-span-2">
              <div className="flex items-center gap-2.5 mb-3">
                <div className="w-7 h-7 rounded-lg bg-lp-accent grid place-items-center font-display italic font-normal text-[15px] text-white">o</div>
                <span className="font-display text-[19px] tracking-tight" style={{ color: "#EEF3FF" }}>Otto</span>
                <span className="text-[11px] tracking-wide uppercase" style={{ color: "#4A6090" }}>by RR7x</span>
              </div>
              <p className="text-[12px] leading-relaxed mb-3 max-w-[240px]" style={{ color: "#4A6090" }}>
                Plataforma de inteligência operacional para escritórios de M&amp;A e estruturação.
              </p>
              <a href="mailto:gestor@renanregonato.com.br" className="text-[12px] hover:underline" style={{ color: "#7A92BE" }}>
                gestor@renanregonato.com.br
              </a>
            </div>

            {/* Produto */}
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-widest mb-3" style={{ color: "#4A6090" }}>Produto</p>
              <ul className="space-y-2">
                {[
                  { label: "Como funciona", href: "#como-funciona" },
                  { label: "Comparativo",   href: "#comparativo"   },
                  { label: "Inteligências", href: "#inteligencias" },
                  { label: "Planos",        href: "#planos"        },
                ].map((l) => (
                  <li key={l.label}>
                    <Link href={l.href} className="text-[13px] hover:underline" style={{ color: "#6B82A8" }}>{l.label}</Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Recursos */}
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-widest mb-3" style={{ color: "#4A6090" }}>Recursos</p>
              <ul className="space-y-2">
                {[
                  { label: "Blog",        href: "/blog"        },
                  { label: "Entrar",      href: "/auth/login"  },
                  { label: "Criar conta", href: "/auth/signup" },
                ].map((l) => (
                  <li key={l.label}>
                    <Link href={l.href} className="text-[13px] hover:underline" style={{ color: "#6B82A8" }}>{l.label}</Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Legal */}
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-widest mb-3" style={{ color: "#4A6090" }}>Legal</p>
              <ul className="space-y-2">
                {[
                  { label: "Política de Privacidade", href: "/privacidade"    },
                  { label: "Termos de Uso",           href: "/termos"         },
                  { label: "Contato",                 href: "mailto:gestor@renanregonato.com.br" },
                ].map((l) => (
                  <li key={l.label}>
                    <Link href={l.href} className="text-[13px] hover:underline" style={{ color: "#6B82A8" }}>{l.label}</Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="border-t pt-6 flex flex-col sm:flex-row items-center justify-between gap-3" style={{ borderColor: "#1E2E4A" }}>
            <p className="text-[12px]" style={{ color: "#334560" }}>
              © {new Date().getFullYear()} RR7x Capital Hub. Todos os direitos reservados.
            </p>
            <p className="text-[11px] italic" style={{ color: "#334560" }}>
              "O ativo certo, para o comprador certo, no timing certo."
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
