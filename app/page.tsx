import type { Metadata } from "next";
import Link from "next/link";
import AuthErrorHandler from "@/components/AuthErrorHandler";
import WhatsAppFloat from "@/components/WhatsAppFloat";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import { PLANOS_VITRINE } from "@/lib/planos-vitrine";

export const metadata: Metadata = {
  title: "Mandor | Due diligence e análise de M&A e crédito estruturado",
  description:
    "No mercado privado, o tempo no deal errado não volta. O Mandor entrega o parecer institucional de M&A e crédito, rastreável e auditável, em até 90 minutos.",
  alternates: { canonical: "/" },
  openGraph: {
    title: "No mercado privado, o tempo no deal errado não volta.",
    description:
      "O Mandor entrega o parecer institucional de M&A e crédito, rastreável e auditável, em até 90 minutos.",
    url: "/",
  },
  twitter: {
    card: "summary_large_image",
    title: "No mercado privado, o tempo no deal errado não volta.",
    description:
      "O Mandor entrega o parecer institucional de M&A e crédito, em até 90 minutos.",
    images: ["/opengraph-image"],
  },
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
      name: "O Mandor está em conformidade com a LGPD?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Sim. Mandor opera exclusivamente com documentos financeiros e societários dos ativos, sem tratar dados pessoais de terceiros. O escritório continua sendo o controlador dos dados submetidos. Oferecemos DPA para os planos Professional e Enterprise.",
      },
    },
    {
      "@type": "Question",
      name: "Quanto tempo leva para começar a operar com o Mandor?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "O onboarding leva de 1 a 3 dias úteis para os planos Professional e Enterprise. No Essential, a primeira análise pode ser submetida no mesmo dia do contrato.",
      },
    },
    {
      "@type": "Question",
      name: "Mandor se integra com ferramentas que já usamos?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Atualmente exporta em PDF, Word e formato editável compatível com Office. Integração via API e conectores para CRMs estão no roadmap. No plano Enterprise, avaliamos integrações customizadas mediante escopo.",
      },
    },
    {
      "@type": "Question",
      name: "Como funciona o cancelamento?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Os planos mensais podem ser cancelados a qualquer momento com 30 dias de aviso, sem fidelidade mínima. O plano Enterprise segue o contrato negociado.",
      },
    },
    {
      "@type": "Question",
      name: "Qual suporte está disponível?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Todos os planos têm suporte por e-mail com resposta em até 24h úteis. O plano Professional inclui suporte prioritário. O plano Enterprise inclui gestor de conta dedicado e SLA customizado.",
      },
    },
    {
      "@type": "Question",
      name: "Quanto tempo leva para receber a análise?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Até 90 minutos após a submissão dos documentos. Para os planos Professional e Enterprise, entrega garantida no mesmo dia mesmo para casos com documentação incompleta.",
      },
    },
  ],
};

/* ─── Data ───────────────────────────────────────────────────────────────── */

const inteligencias = [
  { num: "01", dominio: "orquestração",       funcao: "Estratégia e DRS",        descricao: "Calcula o Deal Readiness Score, mapeia riscos materiais e define a sequência antes que qualquer outra inteligência execute." },
  { num: "02", dominio: "mercado",            funcao: "Viabilidade de Mercado",  descricao: "Lê o cenário setorial, projeta demanda e emite um parecer Go/No-Go com base em dados macro e microeconômicos." },
  { num: "03", dominio: "m&a · valuation",    funcao: "Tese de M&A e Valuation", descricao: "Constrói a tese de aquisição, calcula valuation por múltiplos e DCF e estrutura a estratégia de negociação." },
  { num: "04", dominio: "finanças",           funcao: "Diagnóstico Financeiro",  descricao: "Analisa EBITDA ajustado, endividamento, fluxo de caixa e tendências operacionais do ativo." },
  { num: "05", dominio: "jurídico",           funcao: "Análise Jurídica",        descricao: "Identifica riscos legais, lacunas de documentação e indica quando NDA, SHA ou LOI se aplicam." },
  { num: "06", dominio: "crédito",            funcao: "Crédito e Estruturação",  descricao: "Ranqueia por viabilidade as estruturas aplicáveis ao ativo: CRI, CRA, debêntures e securitização." },
  { num: "07", dominio: "originação",         funcao: "Pipeline de Compradores", descricao: "Define o posicionamento do ativo e mapeia o perfil ideal de compradores e investidores." },
  { num: "08", dominio: "maturidade",         funcao: "Maturidade do Deal",      descricao: "Avalia a prontidão do ativo para o mercado e gera um roadmap de preparação quando necessário." },
  { num: "09", dominio: "consistência",       funcao: "Consistency Engine",      descricao: "Cruza as leituras de todas as inteligências, identifica divergências entre fontes e força reconciliação." },
  { num: "10", dominio: "revisão final",      funcao: "Quality Reviewer",        descricao: "Confere coerência, completude técnica e consistência de todo o dossiê antes da entrega." },
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

// Planos vêm da fonte única (lib/planos-vitrine), em Essential/Professional/
// Enterprise. Preços não são publicados aqui (Fase 5 — quando validados);
// CTA leva ao cadastro / proposta.
const PLANO_TAG: Record<string, string> = {
  essential:    "parecer · decisão",
  professional: "originação · inteligência",
  enterprise:   "rede · escala corporativa",
};
const planos = PLANOS_VITRINE.map((p) => ({
  nome:        p.nome,
  tag:         PLANO_TAG[p.id] ?? p.volume,
  preco:       "Sob consulta",
  complemento: "",
  desc:        p.posicionamento,
  features:    p.features,
  destaque:    p.destaque,
  cta:         p.destaque ? "Começar agora" : "Solicitar proposta",
  href:        "/auth/signup",
  roi:         null as string | null,
}));

const depoimentos = [
  {
    texto:
      "Testamos o Mandor em dois deals que eram candidatos ao No-Go de início. Em menos de uma hora tinha análise financeira e mapa jurídico de ambos. Um descartamos mesmo. O outro revelou uma estrutura de crédito que ninguém tinha visto. Hoje é um mandato ativo.",
    nome: "Ricardo C.",
    cargo: "Sócio",
    empresa: "Boutique M&A · São Paulo",
  },
  {
    texto:
      "Minha função mudou de forma concreta. Antes eu passava dois dias organizando material para uma reunião. Agora esse trabalho já chega feito. Entro para fazer o que exige julgamento real, que é o que eu deveria estar fazendo desde o início.",
    nome: "Camila D.",
    cargo: "Analista Sênior",
    empresa: "Escritório de Estruturação · Rio de Janeiro",
  },
  {
    texto:
      "O que mais me surpreendeu não foi a velocidade. Foi a consistência. Todo relatório sai com o mesmo padrão técnico. Para uma estrutura que analisa mais de 20 ativos por mês, isso muda completamente a forma de operar.",
    nome: "Felipe M.",
    cargo: "Gestor de Crédito",
    empresa: "Fundo de Crédito Estruturado · Belo Horizonte",
  },
];

const faqs = [
  {
    q: "Como os dados dos deals são protegidos?",
    a: "Mandor opera com criptografia em trânsito (TLS 1.3) e em repouso (AES-256). Nenhum dado é compartilhado entre escritórios. Cada análise fica isolada em ambiente dedicado ao escritório contratante.",
  },
  {
    q: "O Mandor está em conformidade com a LGPD?",
    a: "Sim. Mandor opera exclusivamente com documentos financeiros e societários dos ativos, sem tratar dados pessoais de terceiros. O escritório continua sendo o controlador dos dados submetidos. Oferecemos DPA para os planos Professional e Enterprise.",
  },
  {
    q: "Quanto tempo leva para começar a operar com o Mandor?",
    a: "O onboarding leva de 1 a 3 dias úteis para os planos Professional e Enterprise. No Essential, a primeira análise pode ser submetida no mesmo dia do contrato.",
  },
  {
    q: "Mandor se integra com ferramentas que já usamos?",
    a: "Atualmente exporta em PDF, Word e formato editável compatível com Office. Integração via API e conectores para CRMs estão no roadmap. No plano Enterprise, avaliamos integrações customizadas mediante escopo.",
  },
  {
    q: "Como funciona o cancelamento?",
    a: "Os planos mensais podem ser cancelados a qualquer momento com 30 dias de aviso, sem fidelidade mínima. O plano Enterprise segue o contrato negociado.",
  },
  {
    q: "Qual suporte está disponível?",
    a: "Todos os planos têm suporte por e-mail com resposta em até 24h úteis. O plano Professional inclui suporte prioritário. O plano Enterprise inclui gestor de conta dedicado e SLA customizado.",
  },
  {
    q: "Quanto tempo leva para receber a análise?",
    a: "Até 90 minutos após a submissão dos documentos. Para os planos Professional e Enterprise, entrega garantida no mesmo dia mesmo para casos com documentação incompleta.",
  },
];

const modulos = [
  { k: "01", t: "Reforma Tributária", d: "Adequação à EC 132/2023 e à LC 214/2025 dentro da análise. O risco fiscal que decide o deal, ancorado em lei e rastreável na due diligence.", href: "/reforma-tributaria" },
  { k: "02", t: "Invest Match",       d: "Da análise à tese, da tese ao investidor certo. Um motor de matching de cinco camadas que transforma originação em processo.", href: "/invest-match" },
  { k: "03", t: "Mapa Inteligente do Mercado", d: "O atlas do capital privado brasileiro. Gestoras, bancos, FIDCs e securitizadoras, como se conectam e, a partir de um deal, para quem levá-lo. Sobre dado público.", href: "/mapa-inteligente" },
];

/* ─── Component ──────────────────────────────────────────────────────────── */

export default function LandingPage() {
  return (
    <div className="bg-lp-canvas text-lp-ink font-sans antialiased">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
      <AuthErrorHandler />
      <SiteHeader />

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden">
        <div aria-hidden className="absolute pointer-events-none animate-float-slow" style={{ top: "-22%", right: "-8%", width: 820, height: 820, borderRadius: "50%", background: "radial-gradient(circle, rgba(140,111,69,0.10) 0%, transparent 62%)", filter: "blur(30px)" }} />
        <div aria-hidden className="absolute pointer-events-none animate-glow-breathe" style={{ bottom: "-30%", left: "-10%", width: 640, height: 640, borderRadius: "50%", background: "radial-gradient(circle, rgba(168,138,101,0.08) 0%, transparent 66%)", filter: "blur(40px)" }} />
        <div aria-hidden className="absolute inset-0 hero-grid pointer-events-none" />

        <div className="relative max-w-[1180px] mx-auto px-6 pt-24 pb-20 lg:pt-36 lg:pb-28">
          <p className="animate-fade-up text-[12px] font-medium tracking-[0.22em] uppercase text-lp-ink-3 mb-8" style={{ animationDelay: "40ms" }}>
            Inteligência institucional para o mercado privado
          </p>
          <h1 className="font-display tracking-tight text-lp-ink" style={{ fontSize: "clamp(42px, 6.6vw, 84px)", lineHeight: 1.03 }}>
            <span className="block animate-fade-up" style={{ animationDelay: "120ms" }}>Os três Sinais de Fricção</span>
            <span className="block animate-fade-up" style={{ animationDelay: "240ms" }}>que travam seu escritório.</span>
            <span className="block animate-fade-up" style={{ animationDelay: "360ms" }}>Resolvidos em um só sistema.</span>
          </h1>
          <p className="animate-fade-up text-[18px] lg:text-[20px] text-lp-ink-2 leading-relaxed max-w-[600px] mt-9" style={{ animationDelay: "520ms" }}>
            Conhecimento preso na operação do sócio. Oportunidades que não escalam por dependência humana.
            Crescimento que ultrapassa a capacidade de execução. O Mandor converte esses pontos de fricção em estrutura operacional contínua.
          </p>
          <div className="animate-fade-up flex flex-col sm:flex-row items-start sm:items-center gap-5 mt-11" style={{ animationDelay: "640ms" }}>
            <Link href="/auth/signup" className="lp-btn-primary inline-flex items-center gap-2 text-[15px] font-medium text-white px-7 py-4 rounded-full" style={{ background: "#8C6F45" }}>
              Solicitar acesso <span aria-hidden>→</span>
            </Link>
            <a href="#gargalos" className="group inline-flex items-center gap-2 text-[15px] font-medium text-lp-ink">
              Ver as soluções
              <span aria-hidden className="transition-transform group-hover:translate-x-1">→</span>
            </a>
          </div>
        </div>
      </section>

      {/* ── Faixa de credibilidade ───────────────────────────────────────── */}
      <section className="border-y border-lp-border">
        <div className="max-w-[1180px] mx-auto px-6 py-7 flex flex-wrap items-center justify-center gap-x-10 gap-y-3 text-[13px] text-lp-ink-3">
          {["M&A", "Crédito estruturado", "Preparação para o mercado", "Adequação tributária", "Originação"].map((t, i) => (
            <span key={t} className="reveal flex items-center gap-3" style={{ transitionDelay: `${i * 60}ms` }}>
              {i > 0 && <span className="w-1 h-1 rounded-full bg-lp-ink-4" />}
              {t}
            </span>
          ))}
        </div>
      </section>

      {/* ── Gargalos → Soluções ───────────────────────────────────────────── */}
      <section id="gargalos" className="max-w-[1180px] mx-auto px-6 py-28 lg:py-40 scroll-mt-20">
        <p className="reveal text-[12px] font-medium tracking-[0.22em] uppercase text-lp-ink-3 mb-7">como o Mandor resolve</p>
        <div className="reveal grid md:grid-cols-3 gap-8 lg:gap-10">
          {[
            {
              num: "01",
              sinalFriccao: "Inteligência fica nas pessoas, não na instituição",
              problema: "Conhecimento sai do escritório quando um sócio sai. Novos profissionais começam do zero.",
              solucao: "Aprendizados do Escritório",
              descricao: "Converte experiência em patrimônio intelectual. Cada operação analisada fortalece a inteligência da empresa.",
            },
            {
              num: "02",
              sinalFriccao: "Conexão entre oportunidades e interessados depende da agenda",
              problema: "Muitas oportunidades morrem porque o comprador/investidor certo não foi encontrado. O processo é manual.",
              solucao: "Invest Match",
              descricao: "Transforma originação em processo. Identifica compradores e investidores aderentes. Prioriza por probabilidade de interesse.",
            },
            {
              num: "03",
              sinalFriccao: "Volume cresce mais rápido que a capacidade",
              problema: "Mercado gera mais oportunidades do que as equipes conseguem analisar a fundo. Gargalo operacional.",
              solucao: "Rede Cognitiva",
              descricao: "Análise padronizada e escalável. O mesmo critério aplicado na primeira análise vale na centésima.",
            },
          ].map((g) => (
            <div key={g.num} className="reveal">
              <span className="text-[12px] font-medium tracking-[0.22em] uppercase text-lp-ink-3 mb-4 block">Sinal de Fricção {g.num}</span>
              <h3 className="font-display tracking-tight text-lp-ink mb-4" style={{ fontSize: "clamp(22px, 2.8vw, 32px)", lineHeight: 1.1 }}>
                {g.sinalFriccao}
              </h3>
              <p className="text-[14px] text-lp-ink-3 leading-relaxed mb-6">
                {g.problema}
              </p>
              <div className="border-t border-lp-border pt-6">
                <p className="text-[12px] font-semibold uppercase tracking-widest text-lp-ink-3 mb-2">Solução</p>
                <h4 className="font-semibold text-[16px] text-lp-ink mb-2" style={{ color: "#8C6F45" }}>
                  {g.solucao}
                </h4>
                <p className="text-[13.5px] text-lp-ink-2 leading-relaxed">
                  {g.descricao}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>


      {/* ── Módulos (linhas editoriais) ──────────────────────────────────── */}
      <section className="border-t border-lp-border">
        <div className="max-w-[1180px] mx-auto px-6">
          <p className="reveal text-[12px] font-medium tracking-[0.22em] uppercase text-lp-ink-3 pt-16">módulos em destaque</p>
          {modulos.map((m) => (
            <Link key={m.k} href={m.href} className="reveal group block border-b border-lp-border py-14 lg:py-20 transition-colors hover:bg-lp-fog/60">
              <div className="grid lg:grid-cols-[120px_1fr_auto] gap-6 lg:gap-12 items-baseline">
                <span className="font-display text-[20px] text-lp-ink-4">{m.k}</span>
                <div>
                  <h3 className="font-display tracking-tight text-lp-ink mb-4" style={{ fontSize: "clamp(28px, 3.6vw, 44px)", lineHeight: 1.08 }}>{m.t}</h3>
                  <p className="text-[16px] text-lp-ink-2 leading-relaxed max-w-[640px]">{m.d}</p>
                </div>
                <span className="inline-flex items-center gap-2 text-[14px] font-medium" style={{ color: "#8C6F45" }}>
                  Conhecer
                  <span aria-hidden className="transition-transform group-hover:translate-x-1.5">→</span>
                </span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* ── Verticais de negócio ────────────────────────────────────────── */}
      <section className="border-t border-lp-border">
        <div className="max-w-[1180px] mx-auto px-6">
          <p className="reveal text-[12px] font-medium tracking-[0.22em] uppercase text-lp-ink-3 pt-16">para quem serve</p>
          {[
            {
              k: "01",
              titulo: "M&A e Aquisições",
              subtitulo: "Boutiques de M&A, investidores, grupos econômicos",
              descricao: "Da prospecção ao fechamento. Diagnóstico financeiro, valuation, mapa jurídico, posicionamento do ativo e pipeline de compradores. Parecer institucional que move negociação.",
              destaques: ["Valuation por múltiplos e DCF", "Tese e posicionamento do ativo", "Mapa de riscos e remediações", "Pipeline de compradores qualificados"],
              href: "#",
            },
            {
              k: "02",
              titulo: "FIDC e Securitização",
              subtitulo: "Administradoras, gestoras de crédito, originadoras",
              descricao: "Estrutura aprovável. Análise de lastro, avaliação de risco de sacado/cedente, adequação de tranches, parecer de governança. Documentação completa para CVM.",
              destaques: ["Análise de recebíveis e concentração", "Viabilidade de tranches e pricing", "Parecer de adequação ANBIMA", "Documentação CVM pronta"],
              href: "#",
            },
            {
              k: "03",
              titulo: "Securitização (CRI / CRA)",
              subtitulo: "Originadoras, banco de investimento, estruturadores",
              descricao: "Cessão fiduciária validada. Análise de fluxos, avaliação de imóvel/direitos, estrutura de cotas, pricing justo. Due diligence que satisfaz investidor.",
              destaques: ["Due diligence de ativos (imóvel/direitos)", "Pricing e modelagem de fluxos", "Análise de risco da operação", "Parecer técnico para investors"],
              href: "#",
            },
            {
              k: "04",
              titulo: "Preparação de Ativo para Mercado",
              subtitulo: "Grupos econômicos, PE, gestoras de investimento",
              descricao: "Ativo pronto para venda. Diagnóstico 360º (financeiro, jurídico, tributário, operacional), roadmap de remediações, documentação de venda. Maximize o valuation.",
              destaques: ["Diagnóstico operacional completo", "Identificação de oportunidades de valor", "Roadmap de remediações prioritárias", "Documentação pronta para data room"],
              href: "#",
            },
          ].map((v) => (
            <div key={v.k} className="reveal border-b border-lp-border py-14 lg:py-20">
              <div className="grid lg:grid-cols-[120px_1fr] gap-6 lg:gap-12">
                <span className="font-display text-[20px] text-lp-ink-4">{v.k}</span>
                <div>
                  <h3 className="font-display tracking-tight text-lp-ink mb-2" style={{ fontSize: "clamp(28px, 3.6vw, 44px)", lineHeight: 1.08 }}>
                    {v.titulo}
                  </h3>
                  <p className="text-[13px] text-lp-ink-3 uppercase tracking-widest mb-4">{v.subtitulo}</p>
                  <p className="text-[16px] text-lp-ink-2 leading-relaxed max-w-[640px] mb-6">
                    {v.descricao}
                  </p>
                  <ul className="grid sm:grid-cols-2 gap-3 mb-6">
                    {v.destaques.map((d) => (
                      <li key={d} className="flex items-start gap-2.5 text-[14px] text-lp-ink-2">
                        <span className="flex-shrink-0 mt-0.5 text-[12px] font-bold" style={{ color: "#8C6F45" }}>✓</span>
                        {d}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Vislumbre do dossiê ──────────────────────────────────────────── */}
      <section className="bg-lp-fog border-y border-lp-border">
        <div className="max-w-[1180px] mx-auto px-6 py-28 lg:py-36">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div className="reveal-left">
              <p className="text-[12px] font-medium tracking-[0.22em] uppercase text-lp-ink-3 mb-6">o dossiê</p>
              <h2 className="font-display tracking-tight text-lp-ink mb-6" style={{ fontSize: "clamp(28px, 3.6vw, 46px)", lineHeight: 1.1 }}>
                Um único documento, <span style={{ fontStyle: "italic" }}>defensável na mesa.</span>
              </h2>
              <p className="text-[16px] text-lp-ink-2 leading-relaxed max-w-[460px] mb-8">
                Diagnóstico financeiro, risco, estruturação e originação consolidados. Cada
                número volta ao documento de origem, com fonte e página. Material gerado com a
                identidade do escritório.
              </p>
              <ul className="space-y-3 text-[14.5px] text-lp-ink-2">
                {["Deal Readiness Score calculado automaticamente", "Cada conclusão ancorada em fonte e página", "Saída em PDF, Word ou template do escritório"].map((i) => (
                  <li key={i} className="flex items-start gap-2.5">
                    <span className="flex-shrink-0 mt-0.5 text-[12px] font-bold" style={{ color: "#8C6F45" }}>✓</span>{i}
                  </li>
                ))}
              </ul>
            </div>
            <div className="reveal-blur">
              <div className="rounded-[18px] overflow-hidden border border-lp-border lp-card-shadow bg-lp-canvas animate-float-slow">
                <div className="flex items-center justify-between px-5 py-3.5 border-b border-lp-border">
                  <span className="text-[11px] font-medium text-lp-ink-2 tracking-wide">Dossiê · Grupo Meridian S.A.</span>
                  <span className="text-[10px] font-medium px-2 py-0.5 rounded-full" style={{ background: "#E8E2D6", color: "#65502E" }}>concluído</span>
                </div>
                <div className="px-5 py-5">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-medium text-lp-ink-3 uppercase tracking-widest">Deal Readiness Score</span>
                    <span className="font-display text-[20px] text-lp-ink">8.2</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-lp-fog overflow-hidden mb-5">
                    <div className="h-full rounded-full" style={{ width: "82%", background: "linear-gradient(90deg,#8C6F45,#A88A65)" }} />
                  </div>
                  {["Diagnóstico financeiro", "Tese e valuation", "Estruturação de crédito", "Adequação tributária"].map((r) => (
                    <div key={r} className="flex items-center justify-between py-2 border-t border-lp-border-subtle text-[13px]">
                      <span className="text-lp-ink">{r}</span>
                      <span className="text-[11px]" style={{ color: "#65502E" }}>pronto</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Comparativo ──────────────────────────────────────────────────── */}
      <section id="comparativo" className="max-w-[1180px] mx-auto px-6 py-28 lg:py-36 scroll-mt-20">
        <p className="reveal text-[12px] font-medium tracking-[0.22em] uppercase text-lp-ink-3 mb-6">comparativo</p>
        <h2 className="reveal-blur font-display tracking-tight text-lp-ink mb-5" style={{ fontSize: "clamp(28px, 4vw, 52px)", lineHeight: 1.1 }}>
          Modelo tradicional <span style={{ fontStyle: "italic" }}>× Mandor.</span>
        </h2>
        <p className="reveal text-[16px] text-lp-ink-2 leading-relaxed max-w-[600px] mb-14">
          A conta não é sobre velocidade. É sobre quantos bons deals você deixa passar enquanto analisa um.
        </p>
        <div className="reveal">
          {/* Cabeçalho de colunas (desktop). No mobile, cada valor leva rótulo inline. */}
          <div className="hidden md:grid md:grid-cols-[1.2fr_1fr_1fr] md:gap-6 border-t border-lp-border-strong pt-3 pb-1">
            <span />
            <span className="text-[11px] uppercase tracking-widest text-lp-ink-3">Tradicional</span>
            <span className="text-[11px] uppercase tracking-widest font-medium" style={{ color: "#8C6F45" }}>Mandor</span>
          </div>
          {comparativo.map((row) => (
            <div key={row.dim} className="grid grid-cols-1 md:grid-cols-[1.2fr_1fr_1fr] gap-1.5 md:gap-6 border-t border-lp-border py-5 md:items-baseline">
              <span className="text-[14px] text-lp-ink font-medium mb-1 md:mb-0">{row.dim}</span>
              <span className="text-[13.5px] text-lp-ink-3 flex items-baseline justify-between md:block">
                <span className="md:hidden text-[11px] uppercase tracking-widest text-lp-ink-4 mr-3">Tradicional</span>
                <span>{row.trad}</span>
              </span>
              <span className="text-[13.5px] font-medium flex items-baseline justify-between md:block" style={{ color: "#8C6F45" }}>
                <span className="md:hidden text-[11px] uppercase tracking-widest text-lp-ink-4 mr-3">Mandor</span>
                <span>{row.otto}</span>
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* ── Depoimentos ──────────────────────────────────────────────────── */}
      <section className="bg-lp-fog border-y border-lp-border">
        <div className="max-w-[1180px] mx-auto px-6 py-28 lg:py-36">
          <p className="reveal text-[12px] font-medium tracking-[0.22em] uppercase text-lp-ink-3 mb-14">quem opera com o Mandor</p>
          <div className="grid md:grid-cols-3 gap-x-12 gap-y-12">
            {depoimentos.map((d) => (
              <figure key={d.nome} className="reveal">
                <blockquote className="font-display text-lp-ink leading-snug mb-6" style={{ fontSize: "clamp(18px, 1.6vw, 22px)" }}>
                  &ldquo;{d.texto}&rdquo;
                </blockquote>
                <figcaption className="text-[13px] text-lp-ink-3 border-t border-lp-border pt-4">
                  <span className="font-semibold text-lp-ink">{d.nome}</span> · {d.cargo} · {d.empresa}
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      {/* ── Segurança (faixa enxuta) ─────────────────────────────────────── */}
      <section id="seguranca" className="max-w-[1180px] mx-auto px-6 py-24 lg:py-28 scroll-mt-20">
        <div className="grid lg:grid-cols-[1fr_1.4fr] gap-12 items-start">
          <div className="reveal-left">
            <p className="text-[12px] font-medium tracking-[0.22em] uppercase text-lp-ink-3 mb-6">segurança</p>
            <h2 className="font-display tracking-tight text-lp-ink" style={{ fontSize: "clamp(26px, 3.2vw, 40px)", lineHeight: 1.12 }}>
              Seus dados de deal, <span style={{ fontStyle: "italic" }}>isolados e seus.</span>
            </h2>
            <Link href="/privacidade" className="inline-flex items-center gap-2 text-[14px] font-medium mt-6" style={{ color: "#8C6F45" }}>
              Política de Privacidade <span aria-hidden>→</span>
            </Link>
          </div>
          <div className="reveal grid sm:grid-cols-2 gap-x-10 gap-y-7">
            {[
              { t: "Ambiente isolado por escritório", d: "Multi-tenancy com RLS. Nenhum dado é compartilhado entre escritórios." },
              { t: "100% LGPD", d: "Lei nº 13.709/2018. Exporte, corrija ou exclua tudo a qualquer momento." },
              { t: "Criptografia ponta a ponta", d: "TLS 1.3 em trânsito, AES-256 em repouso, 2FA disponível." },
              { t: "Sem venda de dados", d: "Documentos não passam por analytics, publicidade ou rastreamento externo." },
            ].map((c) => (
              <div key={c.t} className="border-t border-lp-border pt-5">
                <h3 className="text-[15px] font-semibold text-lp-ink mb-2">{c.t}</h3>
                <p className="text-[13.5px] text-lp-ink-3 leading-relaxed">{c.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Planos ───────────────────────────────────────────────────────── */}
      <section id="planos" className="bg-lp-fog border-y border-lp-border scroll-mt-20">
        <div className="max-w-[1180px] mx-auto px-6 py-28 lg:py-36">
          <p className="reveal text-[12px] font-medium tracking-[0.22em] uppercase text-lp-ink-3 mb-6">planos</p>
          <h2 className="reveal-blur font-display tracking-tight text-lp-ink mb-5" style={{ fontSize: "clamp(28px, 4vw, 52px)", lineHeight: 1.1 }}>
            Três modelos de <span style={{ fontStyle: "italic" }}>contratação.</span>
          </h2>
          <p className="reveal text-[16px] text-lp-ink-2 leading-relaxed max-w-[600px] mb-14">
            Do parecer que decide um deal à rede que origina os próximos. Comece onde dói mais.
          </p>
          <div className="reveal grid md:grid-cols-3 gap-5">
            {planos.map((p) => (
              <div key={p.nome} className={`rounded-[18px] p-7 flex flex-col bg-lp-canvas ${p.destaque ? "border-2 lp-card-shadow" : "border border-lp-border"}`} style={p.destaque ? { borderColor: "#8C6F45" } : {}}>
                <p className="text-[10px] font-medium text-lp-ink-4 uppercase tracking-widest mb-2">{p.tag}</p>
                <p className="text-[15px] font-semibold text-lp-ink mb-1">{p.nome}</p>
                <div className="flex items-baseline gap-1 mb-2">
                  <span className="font-display text-[28px] text-lp-ink leading-none">{p.preco}</span>
                  {p.complemento && <span className="text-[12px] text-lp-ink-3">{p.complemento}</span>}
                </div>
                <p className="text-[12.5px] text-lp-ink-3 leading-relaxed mb-1">{p.desc}</p>
                {p.roi && <p className="text-[11px] font-medium mb-2" style={{ color: "#65502E" }}>{p.roi}</p>}
                <ul className="space-y-2.5 flex-1 my-6">
                  {p.features.map((f) => (
                    <li key={f} className="flex items-start gap-2.5 text-[13px] text-lp-ink-2">
                      <span className="flex-shrink-0 mt-0.5 text-[11px] font-bold" style={{ color: "#8C6F45" }}>✓</span>{f}
                    </li>
                  ))}
                </ul>
                <Link href={p.href} className={`w-full text-center py-3 rounded-[10px] text-[13px] font-medium transition ${p.destaque ? "text-white hover:opacity-90" : "border border-lp-border-strong text-lp-ink hover:bg-lp-fog"}`} style={p.destaque ? { background: "#8C6F45" } : {}}>
                  {p.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ──────────────────────────────────────────────────────────── */}
      <section className="max-w-[760px] mx-auto px-6 py-28 lg:py-36">
        <p className="reveal text-[12px] font-medium tracking-[0.22em] uppercase text-lp-ink-3 mb-6">dúvidas frequentes</p>
        <h2 className="reveal-blur font-display tracking-tight text-lp-ink mb-10" style={{ fontSize: "clamp(28px, 4vw, 48px)", lineHeight: 1.1 }}>
          Antes de decidir.
        </h2>
        <div className="reveal divide-y divide-lp-border border-t border-lp-border">
          {faqs.map((f) => (
            <details key={f.q} className="group py-5">
              <summary className="flex items-center justify-between gap-4 text-[15.5px] font-medium text-lp-ink select-none list-none cursor-pointer">
                {f.q}
                <span className="text-lp-ink-3 flex-shrink-0 text-[18px] font-light group-open:rotate-45 transition-transform">+</span>
              </summary>
              <p className="mt-3 text-[14px] text-lp-ink-2 leading-relaxed">{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* ── Fecho ────────────────────────────────────────────────────────── */}
      <section className="lp-dark-section">
        <div className="max-w-[1180px] mx-auto px-6 py-32 lg:py-44 text-center">
          <h2 className="reveal font-display tracking-tight" style={{ fontSize: "clamp(34px, 5.4vw, 68px)", lineHeight: 1.05, color: "#EDE9E5" }}>
            Cada semana no ritmo de hoje é um bom deal que o mercado fecha <span className="text-shimmer">sem você.</span>
          </h2>
          <p className="reveal text-[16px] leading-relaxed max-w-[560px] mx-auto mt-7" style={{ color: "#B5B0A6", transitionDelay: "80ms" }}>
            M&amp;A, crédito estruturado ou preparação para o mercado. Solicite acesso e
            reservamos uma conversa para entender o contexto do seu escritório.
          </p>
          <div className="reveal mt-11 flex flex-col sm:flex-row gap-3 justify-center" style={{ transitionDelay: "160ms" }}>
            <Link href="/auth/signup" className="lp-btn-primary inline-flex items-center justify-center gap-2 text-[15px] font-medium text-white px-8 py-4 rounded-full" style={{ background: "#8C6F45" }}>
              Solicitar acesso <span aria-hidden>→</span>
            </Link>
            <a href="mailto:contato@mandor.com.br?subject=Quero%20conhecer%20Mandor" className="inline-flex items-center justify-center text-[15px] font-medium px-8 py-4 rounded-full lp-dark-btn">
              Falar com nossa equipe
            </a>
          </div>
        </div>
      </section>

      <SiteFooter />
      <WhatsAppFloat />
    </div>
  );
}
