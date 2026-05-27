import type { Metadata } from "next";
import Link from "next/link";
import AuthErrorHandler from "@/components/AuthErrorHandler";
import WhatsAppFloat from "@/components/WhatsAppFloat";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";

export const metadata: Metadata = {
  title: "Mandor | Inteligência operacional para M&A, crédito estruturado e preparação de deals",
  description:
    "Diagnóstico institucional de operações de M&A, crédito estruturado e preparação de ativos para o mercado: análise rastreável e auditável, ancorada em documento e fonte. Inclui adequação à Reforma Tributária e originação via Invest Match.",
  alternates: { canonical: "/" },
};

const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "@id": "https://www.mandor.com.br/#faq",
  mainEntity: [
    {
      "@type": "Question",
      name: "Como os dados dos deals são protegidos?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Mandor opera com criptografia em trânsito (TLS 1.3) e em repouso (AES-256). Nenhum dado é compartilhado entre escritórios. Cada análise fica isolada em ambiente dedicado ao escritório contratante.",
      },
    },
    {
      "@type": "Question",
      name: "A Mandor está em conformidade com a LGPD?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Sim. Mandor opera exclusivamente com documentos financeiros e societários dos ativos, sem tratar dados pessoais de terceiros. O escritório continua sendo o controlador dos dados submetidos. Oferecemos DPA para planos Institucional e Corporativo.",
      },
    },
    {
      "@type": "Question",
      name: "Quanto tempo leva para começar a operar com a Mandor?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "O onboarding leva de 1 a 3 dias úteis para os planos Institucional e Corporativo. Para o plano Pontual, a primeira análise pode ser submetida no mesmo dia do contrato.",
      },
    },
    {
      "@type": "Question",
      name: "Mandor se integra com ferramentas que já usamos?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Atualmente exporta em PDF, Word e formato editável compatível com Office. Integração via API e conectores para CRMs estão no roadmap. Para planos Corporativo, avaliamos integrações customizadas mediante escopo.",
      },
    },
    {
      "@type": "Question",
      name: "Como funciona o cancelamento?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Planos mensais têm cancelamento a qualquer momento com 30 dias de aviso. Não há fidelidade mínima nos planos Pontual e Institucional. Planos Corporativos seguem o contrato negociado.",
      },
    },
    {
      "@type": "Question",
      name: "Qual suporte está disponível?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Todos os planos têm suporte por e-mail com resposta em até 24h úteis. O plano Institucional inclui suporte prioritário. O plano Corporativo inclui gestor de conta dedicado e SLA customizado.",
      },
    },
    {
      "@type": "Question",
      name: "Quanto tempo leva para receber a análise?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Até 90 minutos após a submissão dos documentos. Para planos Institucional e Corporativo, entrega garantida no mesmo dia mesmo para casos com documentação incompleta.",
      },
    },
  ],
};

/* ─── Data ───────────────────────────────────────────────────────────────── */

const inteligencias = [
  {
    num: "01",
    bg: "bg-lp-accent-soft",
    dominio: "orquestração",
    funcao: "Estratégia e DRS",
    descricao:
      "Calcula o Deal Readiness Score, mapeia riscos materiais e define a sequência do pipeline antes que qualquer outro módulo execute.",
    beneficio: "A equipe entra no deal sabendo exatamente onde ele está.",
  },
  {
    num: "02",
    bg: "bg-[#ECF8FF]",
    dominio: "mercado",
    funcao: "Viabilidade de Mercado",
    descricao:
      "Lê o cenário setorial, projeta demanda e emite um parecer Go/No-Go com base em dados macro e microeconômicos.",
    beneficio: "Deals sem viabilidade ficam de fora antes de consumir tempo do time.",
  },
  {
    num: "03",
    bg: "bg-[#FEF8ED]",
    dominio: "m&a · valuation",
    funcao: "Tese de M&A e Valuation",
    descricao:
      "Constrói a tese de aquisição, calcula valuation por múltiplos e DCF e estrutura a estratégia de negociação.",
    beneficio: "O suporte técnico para qualquer negociação sai junto com o diagnóstico.",
  },
  {
    num: "04",
    bg: "bg-[#EDFAF4]",
    dominio: "finanças",
    funcao: "Diagnóstico Financeiro",
    descricao:
      "Analisa EBITDA ajustado, endividamento, fluxo de caixa e tendências operacionais do ativo.",
    beneficio: "Os números chegam prontos para análise, não para triagem.",
  },
  {
    num: "05",
    bg: "bg-[#F3EEFF]",
    dominio: "jurídico",
    funcao: "Análise Jurídica",
    descricao:
      "Identifica riscos legais, lacunas de documentação e indica quando NDA, SHA ou LOI se aplicam.",
    beneficio: "O escritório sabe exatamente o que pedir ao jurídico externo.",
  },
  {
    num: "06",
    bg: "bg-[#EDFAF4]",
    dominio: "crédito estruturado",
    funcao: "Crédito e Estruturação",
    descricao:
      "Ranqueia por viabilidade as operações estruturadas aplicáveis ao ativo: CRI, CRA, debêntures e securitização.",
    beneficio: "As alternativas de estruturação aparecem no relatório sem depender de consulta avulsa.",
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
      "Avalia a prontidão do ativo para o mercado e gera um roadmap de preparação quando necessário.",
    beneficio: "Ativos que não estão prontos recebem um diagnóstico de onde estão, não uma recusa.",
  },
  {
    num: "09",
    bg: "bg-[#ECF8FF]",
    dominio: "consistência",
    funcao: "Consistency Engine",
    descricao:
      "Cruza as leituras de todos os módulos durante o pipeline, identifica divergências entre fontes e força reconciliação antes do fechamento.",
    beneficio: "Contradições entre módulos são resolvidas dentro do sistema, não no relatório.",
  },
  {
    num: "10",
    bg: "bg-lp-accent-soft",
    dominio: "revisão final",
    funcao: "Quality Reviewer",
    descricao:
      "Revisão final do dossiê antes da entrega: confere coerência narrativa, completude técnica e consistência entre todos os outputs.",
    beneficio: "Nenhum relatório chega ao cliente sem passar por uma checagem crítica de fechamento.",
  },
];

const comparativo = [
  { dim: "Tempo por análise completa",     trad: "10–15 dias úteis",               otto: "até 90 min" },
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
    preco: "R$ 3.500",
    complemento: "/ análise",
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
    preco: "R$ 18.000",
    complemento: "/ mês + setup",
    desc: "Para escritórios com fluxo constante. Análises ilimitadas dentro da capacidade mensal.",
    features: [
      "Até 20 análises por mês",
      "Onboarding e configuração assistidos",
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
    href: "mailto:mandor@rr7x.com.br?subject=Proposta%20Corporativo",
    roi: null as string | null,
  },
];

const depoimentos = [
  {
    texto:
      "Testamos o Mandor em dois deals que eram candidatos ao No-Go de início. Em menos de uma hora tinha análise financeira e mapa jurídico de ambos. Um descartamos mesmo. O outro revelou uma estrutura de crédito que ninguém tinha visto. Hoje é um mandato ativo.",
    nome: "Ricardo C.",
    cargo: "Sócio",
    empresa: "Boutique M&A · São Paulo",
    initial: "R",
    bg: "bg-lp-accent-soft",
  },
  {
    texto:
      "Minha função mudou de forma concreta. Antes eu passava dois dias organizando material para uma reunião. Agora esse trabalho já chega feito. Entro para fazer o que exige julgamento real, que é o que eu deveria estar fazendo desde o início.",
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
    a: "Mandor opera com criptografia em trânsito (TLS 1.3) e em repouso (AES-256). Nenhum dado é compartilhado entre escritórios. Cada análise fica isolada em ambiente dedicado ao escritório contratante.",
  },
  {
    q: "A Mandor está em conformidade com a LGPD?",
    a: "Sim. Mandor opera exclusivamente com documentos financeiros e societários dos ativos, sem tratar dados pessoais de terceiros. O escritório continua sendo o controlador dos dados submetidos. Oferecemos DPA para planos Institucional e Corporativo.",
  },
  {
    q: "Quanto tempo leva para começar a operar com a Mandor?",
    a: "O onboarding leva de 1 a 3 dias úteis para os planos Institucional e Corporativo. Para o plano Pontual, a primeira análise pode ser submetida no mesmo dia do contrato.",
  },
  {
    q: "Mandor se integra com ferramentas que já usamos?",
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
    a: "Até 90 minutos após a submissão dos documentos. Para planos Institucional e Corporativo, entrega garantida no mesmo dia mesmo para casos com documentação incompleta.",
  },
];

/* ─── Component ──────────────────────────────────────────────────────────── */

export default function LandingPage() {
  return (
    <div className="bg-lp-canvas text-lp-ink font-sans antialiased">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      <AuthErrorHandler />

      {/* ── Navbar ─────────────────────────────────────────────────────────── */}
      <SiteHeader />

      {/* ── Hero ───────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden lp-hero-bg">
        {/* Grid pattern */}
        <div className="absolute inset-0 hero-grid pointer-events-none" aria-hidden="true" />
        {/* Glow orb 1 · top-right */}
        <div
          className="absolute pointer-events-none animate-glow-breathe"
          aria-hidden="true"
          style={{
            top: "-15%", right: "5%",
            width: 650, height: 650,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(22,85,232,0.1) 0%, transparent 68%)",
            filter: "blur(40px)",
          }}
        />
        {/* Glow orb 2 · bottom-left */}
        <div
          className="absolute pointer-events-none"
          aria-hidden="true"
          style={{
            bottom: "-5%", left: "2%",
            width: 420, height: 420,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(55,138,221,0.07) 0%, transparent 70%)",
            filter: "blur(50px)",
            animation: "glow-breathe 5s ease-in-out infinite reverse",
          }}
        />

        <div className="max-w-[1280px] mx-auto px-6 pt-20 pb-16 lg:pt-28 lg:pb-24">
          <div className="grid lg:grid-cols-[1fr_1.05fr] gap-12 lg:gap-16 items-center">

            {/* ── Left: copy ── */}
            <div>
              {/* Badge */}
              <div className="animate-fade-up inline-flex items-center gap-2 border border-lp-border-strong bg-lp-canvas text-lp-ink-2 text-[11px] font-medium px-3.5 py-1.5 rounded-full mb-7 tracking-widest uppercase" style={{ animationDelay: "0ms" }}>
                <span className="w-1.5 h-1.5 rounded-full flex-shrink-0 animate-pulse" style={{ background: "#1655E8" }} />
                O padrão de análise para M&amp;A · Crédito · Captação
              </div>

              {/* Headline */}
              <h1 className="animate-fade-up font-display text-[42px] sm:text-[50px] lg:text-[56px] leading-[1.06] tracking-tight text-lp-ink mb-5" style={{ animationDelay: "90ms" }}>
                Seu escritório recebe mais deals do que consegue analisar de verdade.{" "}
                <em style={{ fontStyle: "italic" }}>Quantos você está deixando passar?</em>
              </h1>

              {/* Use case pills */}
              <div className="animate-fade-up flex flex-wrap items-center gap-2 mb-6" style={{ animationDelay: "200ms" }}>
                {["M&A", "Crédito Estruturado", "Preparação para Mercado"].map((label) => (
                  <span
                    key={label}
                    className="text-[11px] font-medium px-3 py-1 rounded-full border border-lp-border bg-lp-fog text-lp-ink-2 transition-colors hover:border-lp-border-strong hover:bg-white"
                  >
                    {label}
                  </span>
                ))}
              </div>

              {/* Subline */}
              <p className="animate-fade-up text-[15.5px] text-lp-ink-2 leading-relaxed max-w-[530px] mb-8" style={{ animationDelay: "280ms" }}>
                Uma rede cognitiva de inteligências especialistas lê cada deal como uma
                mesa de M&amp;A e crédito leria, e devolve uma análise institucional,
                rastreável e auditável. Em até 90 minutos.
              </p>

              {/* CTAs */}
              <div className="animate-fade-up flex flex-col sm:flex-row gap-3 mb-4" style={{ animationDelay: "360ms" }}>
                <Link
                  href="/auth/signup"
                  className="lp-btn-primary inline-flex items-center justify-center gap-2 text-[14px] font-medium text-white px-6 py-3.5 rounded-[10px]"
                  style={{ background: "#1655E8" }}
                >
                  Solicitar acesso
                  <span aria-hidden>→</span>
                </Link>
                <a
                  href="#comparativo"
                  className="lp-btn-secondary inline-flex items-center justify-center text-[14px] font-medium text-lp-ink border border-lp-border-strong px-6 py-3.5 rounded-[10px] hover:bg-lp-fog"
                >
                  Ver comparativo
                </a>
              </div>
              <p className="animate-fade-up text-[12px] text-lp-ink-3" style={{ animationDelay: "420ms" }}>
                Reservamos uma conversa inicial para entender o contexto do escritório
              </p>
              <div className="animate-fade-up mt-5 flex flex-wrap gap-2.5" style={{ animationDelay: "480ms" }}>
                {["Ancorado em documento e fonte", "Rastreável em due diligence"].map((s) => (
                  <span key={s} className="lp-stamp">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M20 6 9 17l-5-5" />
                    </svg>
                    {s}
                  </span>
                ))}
              </div>
            </div>

            {/* ── Right: product mockup ── */}
            <div className="animate-blur-reveal hidden lg:block relative" aria-hidden="true" style={{ animationDelay: "150ms" }}>
              {/* Main panel */}
              <div
                className="relative rounded-[20px] overflow-hidden lp-card-shadow"
                style={{
                  background: "#F8F9FB",
                  border: "1px solid rgba(0,0,0,0.07)",
                }}
              >
                {/* Panel header */}
                <div className="flex items-center justify-between px-5 py-3.5 border-b border-lp-border bg-lp-canvas">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ background: "#1655E8" }} />
                    <span className="text-[11px] font-medium text-lp-ink-2 tracking-wide">Pipeline · Grupo Meridian S.A.</span>
                  </div>
                  <span className="text-[10px] font-medium px-2 py-0.5 rounded-full" style={{ background: "#EDFAF4", color: "#14753B" }}>
                    Concluído
                  </span>
                </div>

                {/* DRS score row */}
                <div className="px-5 py-4 border-b border-lp-border bg-lp-canvas">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-medium text-lp-ink-3 uppercase tracking-widest">Deal Readiness Score</span>
                    <span className="text-[11px] font-semibold" style={{ color: "#1655E8" }}>8.2 / 10</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-lp-fog overflow-hidden">
                    <div className="h-full rounded-full transition-all" style={{ width: "82%", background: "linear-gradient(90deg,#1655E8,#378ADD)" }} />
                  </div>
                </div>

                {/* Modules grid */}
                <div className="px-5 py-4 grid grid-cols-3 gap-2.5">
                  {[
                    { label: "Estratégia & DRS",      status: "done",    time: "4 min" },
                    { label: "Viabilidade de Mercado", status: "done",    time: "6 min" },
                    { label: "Tese de M&A",           status: "done",    time: "7 min" },
                    { label: "Diagnóstico Financeiro", status: "done",    time: "5 min" },
                    { label: "Compliance & Riscos",   status: "done",    time: "6 min" },
                    { label: "Originação & Fontes",   status: "running", time: "..." },
                    { label: "Estrutura Jurídica",    status: "queue",   time: "--" },
                    { label: "Projeção & Cenários",   status: "queue",   time: "--" },
                    { label: "Relatório Final",        status: "queue",   time: "--" },
                  ].map((m) => (
                    <div
                      key={m.label}
                      className="rounded-[10px] p-2.5"
                      style={{
                        background: m.status === "done" ? "#F0FDF6" : m.status === "running" ? "#EEF3FF" : "#F8F9FB",
                        border: `1px solid ${m.status === "done" ? "#D1FAE5" : m.status === "running" ? "#C7D7FA" : "#E5E7EB"}`,
                      }}
                    >
                      <div className="flex items-center gap-1 mb-1.5">
                        <span
                          className="text-[9px]"
                          style={{
                            color: m.status === "done" ? "#14753B" : m.status === "running" ? "#1655E8" : "#9CA3AF",
                          }}
                        >
                          {m.status === "done" ? "✓" : m.status === "running" ? "↻" : "○"}
                        </span>
                        <span className="text-[9px] font-medium text-lp-ink-3 uppercase tracking-widest">
                          {m.status === "done" ? "ok" : m.status === "running" ? "rodando" : "fila"}
                        </span>
                      </div>
                      <p className="text-[10px] font-medium text-lp-ink leading-tight mb-1">{m.label}</p>
                      <p className="text-[9px] text-lp-ink-3">{m.time}</p>
                    </div>
                  ))}
                </div>

                {/* Footer bar */}
                <div className="px-5 py-3 border-t border-lp-border bg-lp-canvas flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: "#1655E8" }} />
                    <span className="text-[10px] text-lp-ink-2">Originação em execução…</span>
                  </div>
                  <span className="text-[10px] text-lp-ink-3">7 de 10 módulos · ~14 min restantes</span>
                </div>
              </div>

              {/* Floating card: resultado */}
              <div
                className="animate-float absolute -bottom-5 -left-8 w-[210px] bg-lp-canvas rounded-[14px] p-4 lp-card-shadow"
                style={{ border: "1px solid rgba(0,0,0,0.07)", animationDelay: "0.5s" }}
              >
                <p className="text-[10px] font-medium text-lp-ink-3 uppercase tracking-widest mb-2">Valuation estimado</p>
                <p className="font-display text-[28px] leading-none text-lp-ink mb-0.5">R$ 48M</p>
                <p className="text-[10px] text-lp-ink-3">EV/EBITDA 7.2× · Múltiplo setorial</p>
              </div>

              {/* Floating card: material */}
              <div
                className="animate-float-slow absolute -top-5 -right-4 w-[190px] bg-lp-canvas rounded-[14px] p-3.5 lp-card-shadow"
                style={{ border: "1px solid rgba(0,0,0,0.07)" }}
              >
                <p className="text-[10px] font-medium text-lp-ink-3 uppercase tracking-widest mb-2">Outputs gerados</p>
                {["Blind Teaser", "Pitchbook", "CIM"].map((doc) => (
                  <div key={doc} className="flex items-center gap-1.5 py-1">
                    <span className="text-[9px]" style={{ color: "#14753B" }}>✓</span>
                    <span className="text-[11px] text-lp-ink">{doc}</span>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ── Metrics bar ────────────────────────────────────────────────────── */}
      <section className="border-y border-lp-border bg-lp-fog">
        <div className="max-w-[1280px] mx-auto px-6 py-8">
          <dl className="stagger-reveal grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            {[
              { value: "até 90 min", label: "análise completa"          },
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

      {/* ── Módulos em destaque ────────────────────────────────────────────── */}
      <section className="max-w-[1280px] mx-auto px-6 pt-16 lg:pt-20">
        <p className="lp-eyebrow mb-7">módulos em destaque</p>
        <div className="grid md:grid-cols-2 gap-5">
          {[
            {
              tag: "adequação tributária",
              title: "Reforma Tributária",
              desc: "Diagnóstico de adequação à EC 132/2023 e à LC 214/2025 dentro da própria análise: o risco fiscal que trava M&A, crédito e captação, ancorado em artigo de lei.",
              href: "/reforma-tributaria",
            },
            {
              tag: "originação",
              title: "Invest Match",
              desc: "Da análise à tese, da tese ao investidor certo: um motor de matching de cinco camadas que transforma originação em processo.",
              href: "/invest-match",
            },
          ].map((m) => (
            <Link
              key={m.title}
              href={m.href}
              className="card-hover lp-doc-card rounded-[18px] p-6 lg:p-7 flex flex-col group"
            >
              <p className="lp-eyebrow mb-3">{m.tag}</p>
              <h2 className="font-display text-[24px] sm:text-[27px] leading-tight text-lp-ink mb-2">{m.title}</h2>
              <p className="text-[14px] text-lp-ink-2 leading-relaxed mb-5 flex-1">{m.desc}</p>
              <span className="inline-flex items-center gap-1.5 text-[13px] font-medium" style={{ color: "#1655E8" }}>
                Conhecer o módulo
                <span aria-hidden className="transition-transform group-hover:translate-x-0.5">→</span>
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* ── Problema: Tempo ────────────────────────────────────────────────── */}
      <section className="max-w-[1280px] mx-auto px-6 py-20 lg:py-28">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          <div className="reveal-left">
            <p className="text-[11px] font-medium text-lp-accent uppercase tracking-widest mb-4">o gargalo operacional</p>
            <h2 className="font-display text-[36px] sm:text-[46px] leading-[1.08] tracking-tight text-lp-ink mb-5">
              Cada análise consome
              <br />
              entre{" "}
              <em style={{ fontStyle: "italic" }}>10 e 15 dias úteis.</em>
            </h2>
            <p className="text-[15.5px] text-lp-ink-2 leading-relaxed mb-6">
              Com 40 deals por mês e ciclos de 10 a 15 dias cada, o time está
              permanentemente em modo operacional. A triagem consome o tempo que
              deveria ir para mandatos.
            </p>
            <p className="text-[15px] text-lp-ink-3 leading-relaxed border-l-2 border-lp-border-strong pl-4">
              30 dos 40 deals que chegam por mês saem sem análise real. Cada um deles
              foi uma oportunidade de receita que o escritório não conseguiu avaliar.
            </p>
          </div>

          <div className="reveal-right card-hover bg-lp-fog rounded-[20px] p-8 border border-lp-border">
            <div className="grid grid-cols-[1fr_auto_1fr] gap-4 items-center text-center">
              <div>
                <p className="text-[11px] font-medium text-lp-ink-3 uppercase tracking-wider mb-3">modelo tradicional</p>
                <p className="font-display text-[52px] leading-none text-lp-ink">10–15</p>
                <p className="text-[13px] text-lp-ink-3 mt-1">dias úteis</p>
                <p className="text-[11.5px] text-lp-ink-4 mt-1">por análise completa</p>
              </div>
              <div className="font-display text-[28px] text-lp-ink-4">×</div>
              <div>
                <p className="text-[11px] font-medium text-lp-accent uppercase tracking-wider mb-3">Mandor</p>
                <p className="font-display text-[52px] leading-none text-lp-ink">40</p>
                <p className="text-[13px] text-lp-ink-3 mt-1">minutos</p>
                <p className="text-[11.5px] text-lp-ink-4 mt-1">10 módulos em paralelo</p>
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
              em uma operação{" "}
              <em style={{ fontStyle: "italic" }}>estruturada.</em>
            </h2>
          </div>
          <div className="stagger-reveal grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              {
                value: "R$ 15k–30k",
                label: "custo mensal",
                desc: "de um analista júnior em CLT, encargos e bônus incluídos.",
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
        <h2 className="reveal font-display text-[44px] sm:text-[58px] lg:text-[72px] leading-[1.04] tracking-tight text-lp-ink max-w-[900px] mb-10">
          A pergunta não é
          <br />
          se Mandor vale.
          <br />
          É{" "}
          <em style={{ fontStyle: "italic" }}>quanto custa esperar.</em>
        </h2>
        <div className="grid sm:grid-cols-2 gap-4 max-w-[720px]">
          <div className="border-l-2 border-lp-border-strong pl-5">
            <p className="text-[15.5px] text-lp-ink-2 leading-relaxed">
              Cada semana sem Mandor são 10 deals que entram e saem sem análise real.
            </p>
          </div>
          <div className="border-l-2 pl-5" style={{ borderColor: "#1655E8" }}>
            <p className="text-[15.5px] text-lp-ink leading-relaxed font-medium">
              Cada mês são mandatos fechados pelo concorrente que respondeu primeiro.
            </p>
          </div>
        </div>
      </section>

      {/* ── O método ───────────────────────────────────────────────────────── */}
      <section className="bg-lp-fog border-y border-lp-border">
        <div className="max-w-[1280px] mx-auto px-6 py-20 lg:py-28">
          <div className="max-w-[640px] mb-14">
            <p className="lp-eyebrow mb-4">o método</p>
            <h2 className="font-display text-[36px] sm:text-[46px] leading-[1.08] tracking-tight text-lp-ink mb-5">
              Uma rede cognitiva
              <br />
              que{" "}
              <em style={{ fontStyle: "italic" }}>potencializa quem decide.</em>
            </h2>
            <p className="text-[15.5px] text-lp-ink-2 leading-relaxed mb-5">
              A Mandor potencializa o trabalho do profissional: estrutura a informação,
              cruza fontes e entrega mais capacidade analítica para a equipe que decide,
              sempre com a trilha de auditoria de cada conclusão.
            </p>
            {/* 3 use cases */}
            <div className="flex flex-col gap-2 mb-5">
              {[
                { label: "M&A",                    desc: "Diagnóstico, valuation, tese de aquisição e material de originação." },
                { label: "Crédito Estruturado",    desc: "Análise de viabilidade e ranking de estruturas aplicáveis ao ativo." },
                { label: "Preparação para Mercado",desc: "Deal Readiness Score, Blind Teaser e Sell-Side Pitchbook white-label." },
              ].map((u) => (
                <div key={u.label} className="flex items-start gap-3">
                  <span className="flex-shrink-0 mt-0.5 text-[11px] font-bold" style={{ color: "#1655E8" }}>→</span>
                  <p className="text-[14px] text-lp-ink-2 leading-snug">
                    <span className="font-semibold text-lp-ink">{u.label}:</span>{" "}{u.desc}
                  </p>
                </div>
              ))}
            </div>
            <p className="text-[14.5px] text-lp-ink-3 leading-relaxed border-l-2 border-lp-border-strong pl-4">
              A decisão final pertence ao profissional. Mandor entrega o diagnóstico e sai de cena.
            </p>
          </div>
          <div className="stagger-reveal grid sm:grid-cols-3 gap-5">
            {[
              {
                num: "01",
                title: "Velocidade real",
                body: "Até 90 minutos da submissão ao diagnóstico completo. Para mandatos urgentes, isso muda o resultado da negociação.",
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
              <div key={f.num} className="card-hover bg-lp-canvas rounded-[18px] p-6 border border-lp-border lp-card-shadow-sm">
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
              O assessor submete os documentos do ativo. Mandor orquestra os 10 módulos
              em paralelo e entrega o diagnóstico completo em até 90 minutos: DRS, valuation,
              mapa jurídico, estruturação e Blind Teaser.
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
                www.mandor.com.br/dashboard/analise/MRD-2025-041
              </div>
            </div>

            {/* App content */}
            <div className="bg-lp-canvas">
              {/* App nav */}
              <div className="border-b border-lp-border px-5 py-3 flex items-center justify-between">
                <div className="flex items-center gap-5">
                  <div className="flex items-center gap-1.5">
                    <img src="/logo/mandor-simbolo.svg" alt="Mandor" className="h-5 w-auto" />
                    <span className="text-[12px] font-medium text-lp-ink">Mandor</span>
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
                    { name: "Diagnóstico Financeiro",  status: "executando",  time: "·",     done: false },
                    { name: "Análise Jurídica",        status: "na fila",     time: "·",     done: null  },
                    { name: "Crédito e Estruturação",  status: "na fila",     time: "·",     done: null  },
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
              <br />× <em style={{ fontStyle: "italic" }}>Mandor.</em>
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
                    Mandor
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

        <div className="stagger-reveal grid md:grid-cols-4 gap-6 mb-8">
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
              title: "10 módulos em paralelo",
              body: "Cada módulo processa o ativo no seu domínio. Financeiro, jurídico, mercado e valuation, todos simultâneos.",
            },
            {
              num: "04",
              tag: "saída",
              title: "Saída padronizada",
              body: "Blind Teaser e Sell-Side Pitchbook gerados com a identidade do escritório. Mandor sai de cena no documento final.",
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
          Mandor sai de cena no documento final.
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
                Com o mesmo time, o escritório passa de 10 análises mensais para mais de 40.
                A triagem manual deixa de ser uma barreira e a capacidade cresce sem custo adicional.
              </p>
              <div className="bg-lp-ink rounded-[16px] p-6">
                <p className="font-display text-[44px] leading-none text-white mb-1">R$ 6M–12M</p>
                <p className="text-[12px] font-medium uppercase tracking-widest mb-3" style={{ color: "#7A92BE" }}>
                  receita incremental anual
                </p>
                <p className="text-[13.5px] leading-relaxed" style={{ color: "#C8D4EC" }}>
                  O crescimento acontece com a estrutura que o escritório já tem.
                </p>
              </div>
            </div>

            <div className="space-y-4">
              {[
                {
                  header: "sem Mandor",
                  dark: false,
                  items: [
                    "40 deals recebidos/mês",
                    "10 analisados com profundidade real",
                    "4 mandatos fechados/mês",
                    "30 deals descartados por falta de análise",
                    "Receita mensal R$ 1M–2M",
                  ],
                },
                {
                  header: "com Mandor",
                  dark: true,
                  items: [
                    "40 deals com diagnóstico completo",
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
          <p className="lp-eyebrow justify-center mb-4">a rede cognitiva</p>
          <h2 className="font-display text-[36px] sm:text-[46px] leading-[1.08] tracking-tight text-lp-ink mb-4">
            Dez inteligências em rede.
            <br />
            <em style={{ fontStyle: "italic" }}>Um único pipeline.</em>
          </h2>
          <p className="text-[15px] text-lp-ink-2 leading-relaxed">
            Cada inteligência analisa o ativo no seu domínio. Os resultados são
            consolidados em um único dossiê técnico, coeso, rastreável e pronto para o mercado.
          </p>
        </div>

        <div className="stagger-reveal grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {inteligencias.map((a) => (
            <article key={a.num} className="card-hover bg-lp-canvas rounded-[18px] p-5 border border-lp-border lp-card-shadow-sm">
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

      {/* ── Mandor potencializa ──────────────────────────────────────────────── */}
      <section className="bg-lp-fog border-y border-lp-border">
        <div className="max-w-[1280px] mx-auto px-6 py-20 lg:py-28">
          <div className="max-w-[540px] mb-12">
            <p className="text-[11px] font-medium text-lp-accent uppercase tracking-widest mb-4">posicionamento</p>
            <h2 className="font-display text-[36px] sm:text-[46px] leading-[1.08] tracking-tight text-lp-ink mb-4">
              Mandor potencializa.
              <br />
              <em style={{ fontStyle: "italic" }}>Nunca substitui.</em>
            </h2>
            <p className="text-[15.5px] text-lp-ink-2">
              A decisão final pertence ao profissional. O julgamento especializado permanece intacto.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-5">
            {[
              {
                header: "Mandor faz",
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
                header: "Fora do escopo",
                accent: false,
                items: [
                  "Assinaturas e formalização",
                  "Validade e parecer jurídico",
                  "Responsabilidade técnica",
                  "Decisão final sobre o deal",
                  "Representação do cliente",
                  "Substituição do profissional",
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

        <div className="stagger-reveal grid md:grid-cols-3 gap-5">
          {depoimentos.map((d) => (
            <figure key={d.nome} className="card-hover bg-lp-canvas rounded-[20px] p-6 border border-lp-border lp-card-shadow-sm flex flex-col">
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

      {/* ── Segurança ──────────────────────────────────────────────────────── */}
      <section id="seguranca" className="bg-lp-fog border-y border-lp-border">
        <div className="max-w-[1280px] mx-auto px-6 py-20 lg:py-28">
          <div className="text-center max-w-[600px] mx-auto mb-14">
            <p className="stagger-reveal text-[11px] font-medium text-lp-accent uppercase tracking-widest mb-4">segurança &amp; privacidade</p>
            <h2 className="stagger-reveal font-display text-[36px] sm:text-[44px] leading-[1.1] tracking-tight text-lp-ink">
              Seus dados de deal{" "}
              <em style={{ fontStyle: "italic" }}>protegidos como deveriam ser.</em>
            </h2>
            <p className="stagger-reveal text-[15px] text-lp-ink-2 mt-4 leading-relaxed">
              Construímos a Mandor pensando em isolamento, LGPD e controle desde o primeiro dia.
              Você decide quem entra, o que vê e quando sai.
            </p>
          </div>

          {/* Cards grid */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-10">
            {[
              {
                icon: (
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <ellipse cx="12" cy="5" rx="9" ry="3" /><path d="M3 5v14c0 1.7 4 3 9 3s9-1.3 9-3V5" /><path d="M3 12c0 1.7 4 3 9 3s9-1.3 9-3" />
                  </svg>
                ),
                iconBg: "#EEF3FF",
                iconColor: "#1655E8",
                title: "Seus dados são só seus",
                body: "Cada escritório opera em ambiente isolado. Nenhum cliente, parceiro ou outro escritório enxerga sua operação ou seus deals.",
                tag: "Multi-tenancy + RLS",
              },
              {
                icon: (
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  </svg>
                ),
                iconBg: "#EDFAF4",
                iconColor: "#16A34A",
                title: "100% LGPD",
                body: "Tratamos dados conforme a Lei nº 13.709/2018. Você pode exportar, corrigir ou excluir tudo a qualquer momento.",
                tag: "LGPD nº 13.709/2018",
              },
              {
                icon: (
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                ),
                iconBg: "#F3EEFF",
                iconColor: "#7C3AED",
                title: "Acesso protegido de ponta a ponta",
                body: "Senhas criptografadas, 2FA disponível e bloqueio automático de tentativas suspeitas de login.",
                tag: "TLS + 2FA + JWT",
              },
              {
                icon: (
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
                  </svg>
                ),
                iconBg: "#FEF8ED",
                iconColor: "#D97706",
                title: "Você decide quem vê o quê",
                body: "Permissões por usuário e por área: equipe interna, analistas ou clientes, cada um acessa apenas o necessário.",
                tag: "RBAC + permissões granulares",
              },
              {
                icon: (
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
                  </svg>
                ),
                iconBg: "#FFF0F0",
                iconColor: "#DC2626",
                title: "Dados nunca repassados a terceiros",
                body: "Seus documentos e relatórios de deal não passam por plataformas externas de analytics, publicidade ou rastreamento.",
                tag: "Sem telemetria externa",
              },
              {
                icon: (
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><polyline points="10 9 9 9 8 9" />
                  </svg>
                ),
                iconBg: "#F0FFF4",
                iconColor: "#059669",
                title: "Backup, auditoria e portabilidade",
                body: "Histórico completo de quem acessou o quê, backups automáticos e exportação dos seus dados quando quiser.",
                tag: "Logs + exports + backups",
              },
            ].map((card) => (
              <div
                key={card.title}
                className="card-hover bg-lp-canvas border border-lp-border rounded-[16px] p-6 flex flex-col"
              >
                <div
                  className="w-11 h-11 rounded-[12px] flex items-center justify-center mb-5 flex-shrink-0"
                  style={{ background: card.iconBg, color: card.iconColor }}
                >
                  {card.icon}
                </div>
                <h3 className="text-[15px] font-semibold text-lp-ink mb-2">{card.title}</h3>
                <p className="text-[13.5px] text-lp-ink-2 leading-relaxed flex-1">{card.body}</p>
                <p className="mt-4 text-[11.5px] font-mono text-lp-ink-3 bg-lp-fog border border-lp-border rounded-md px-2.5 py-1 self-start">
                  {card.tag}
                </p>
              </div>
            ))}
          </div>

          {/* Trust bar */}
          <div className="border border-lp-border rounded-[14px] bg-lp-canvas px-6 py-4">
            <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
              {[
                "Criptografia em repouso",
                "TLS 1.3 em trânsito",
                "Documentos criptografados",
                "Política de Privacidade pública",
                "Sem venda de dados",
              ].map((item) => (
                <span key={item} className="flex items-center gap-1.5 text-[12px] text-lp-ink-2">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-ok flex-shrink-0">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
                  </svg>
                  {item}
                </span>
              ))}
            </div>
            <div className="text-center mt-4 pt-4 border-t border-lp-border">
              <p className="text-[14px] font-semibold text-lp-accent mb-1">Você mantém controle total.</p>
              <Link href="/privacidade" className="text-[13px] text-lp-ink-2 hover:text-lp-accent transition-colors">
                Leia nossa Política de Privacidade →
              </Link>
            </div>
          </div>
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
              Contratação direta, sem taxa de adesão ou setup oculto. O retorno estimado aparece já no primeiro mês.
            </p>
          </div>

          <div className="stagger-reveal grid md:grid-cols-3 gap-5 max-w-[960px] mx-auto">
            {planos.map((p) => (
              <div
                key={p.nome}
                className={`card-hover relative rounded-[20px] p-7 flex flex-col ${
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
            className="reveal font-display text-[44px] sm:text-[60px] lg:text-[72px] leading-[1.04] tracking-tight mb-6"
            style={{ color: "#EEF3FF" }}
          >
            Para conhecer
            <br />
            <em style={{ fontStyle: "italic", color: "#93B4F8" }}>Mandor.</em>
          </h2>
          <p className="reveal text-[16px] leading-relaxed max-w-[520px] mx-auto mb-10" style={{ color: "#7A92BE", transitionDelay: "100ms" }}>
            M&A, crédito estruturado ou preparação para mercado: solicite acesso e
            reservamos uma conversa inicial para entender o contexto do escritório.
          </p>
          <div className="reveal flex flex-col sm:flex-row gap-3 justify-center" style={{ transitionDelay: "200ms" }}>
            <Link
              href="/auth/signup"
              className="lp-btn-primary inline-flex items-center justify-center gap-2 text-[14px] font-medium text-white px-7 py-3.5 rounded-[11px]"
              style={{ background: "#1655E8" }}
            >
              Solicitar acesso
              <span aria-hidden>→</span>
            </Link>
            <a
              href="mailto:mandor@rr7x.com.br?subject=Quero%20conhecer%20Mandor"
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
      <SiteFooter />

      <WhatsAppFloat />
    </div>
  );
}
