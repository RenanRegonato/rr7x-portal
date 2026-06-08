import type { Metadata } from "next";
import Link from "next/link";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import WhatsAppFloat from "@/components/WhatsAppFloat";

const SITE = "https://www.mandor.com.br";

export const metadata: Metadata = {
  title: "Invest Match · Originação de Deals e Matching de Investidores",
  description:
    "Da análise do ativo à tese, da tese ao investidor certo. O Invest Match usa um motor de matching de cinco camadas para transformar originação de M&A e crédito estruturado em processo.",
  alternates: { canonical: "/invest-match" },
  keywords: [
    "originação de deals",
    "matching de investidores",
    "tese de investimento",
    "originação M&A",
    "deal flow",
    "captação",
    "crédito estruturado",
    "investidores",
    "fundos",
    "family office",
    "motor de matching",
  ],
  openGraph: {
    title: "Invest Match · Originação de Deals e Matching de Investidores | Mandor",
    description:
      "Da análise à tese, da tese ao investidor certo: motor de matching de cinco camadas que transforma originação em processo.",
    url: "/invest-match",
    type: "website",
    locale: "pt_BR",
  },
};

const faqs = [
  {
    q: "O que é o Invest Match?",
    a: "É o módulo de originação do Mandor. A partir da análise de um ativo, ele gera a tese de investimento e aciona um motor de matching que conecta o deal aos investidores ou compradores de perfil compatível, transformando originação em um processo estruturado em vez de depender de agenda e relacionamento pontual.",
  },
  {
    q: "Como o matching funciona?",
    a: "Um motor de cinco camadas avalia a aderência entre a tese do ativo e o perfil de cada investidor (mandato, apetite de risco, ticket, setor e estágio), produzindo um score de compatibilidade. Acima de um corte, o match é aprovado automaticamente; abaixo dele, segue para curadoria antes de ser apresentado.",
  },
  {
    q: "O que é originação reversa?",
    a: "Além de buscar investidores para um ativo, o Invest Match faz o caminho inverso: dado um investidor e seu mandato, busca entre as teses ativas aquelas que mais aderem ao seu perfil, gerando oportunidades qualificadas de forma proativa.",
  },
  {
    q: "A tese sai da própria análise?",
    a: "Sim. A tese de investimento é construída a partir do diagnóstico da análise do ativo, então o material de originação chega coerente com os números e os riscos já levantados, sem retrabalho.",
  },
];

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebPage",
      "@id": `${SITE}/invest-match`,
      url: `${SITE}/invest-match`,
      name: "Invest Match · Originação de Deals e Matching de Investidores | Mandor",
      description:
        "Da análise do ativo à tese, da tese ao investidor certo, com um motor de matching de cinco camadas.",
      inLanguage: "pt-BR",
    },
    {
      "@type": "Service",
      name: "Invest Match · Originação e matching de investidores",
      serviceType: "Originação de deals e matching investidor-tese para M&A e crédito",
      provider: { "@type": "Organization", name: "Mandor", url: SITE },
      areaServed: "BR",
      description:
        "Motor de matching de cinco camadas que conecta a tese de um ativo ao investidor ou comprador de perfil compatível.",
    },
    {
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Início", item: SITE },
        { "@type": "ListItem", position: 2, name: "Invest Match", item: `${SITE}/invest-match` },
      ],
    },
    {
      "@type": "FAQPage",
      mainEntity: faqs.map((f) => ({
        "@type": "Question",
        name: f.q,
        acceptedAnswer: { "@type": "Answer", text: f.a },
      })),
    },
  ],
};

export default function InvestMatchPage() {
  return (
    <div className="bg-lp-canvas text-lp-ink font-sans antialiased">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <SiteHeader />

      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden border-b border-lp-border">
        <div aria-hidden className="absolute pointer-events-none animate-float-slow" style={{ top: "-24%", right: "-8%", width: 760, height: 760, borderRadius: "50%", background: "radial-gradient(circle, rgba(140,111,69,0.10) 0%, transparent 62%)", filter: "blur(30px)" }} />
        <div aria-hidden className="absolute inset-0 hero-grid pointer-events-none" />
        <div className="max-w-[1180px] mx-auto px-6 pt-16 pb-20 lg:pt-28 lg:pb-24 relative">
          <nav aria-label="Trilha" className="animate-fade-up text-[12px] text-lp-ink-3 mb-6">
            <Link href="/" className="hover:text-lp-accent">Início</Link>
            <span className="mx-2">/</span>
            <span className="text-lp-ink-2">Invest Match</span>
          </nav>
          <p className="lp-eyebrow mb-5 animate-fade-up" style={{ animationDelay: "60ms" }}>módulo · originação</p>
          <h1 className="animate-fade-up font-display tracking-tight text-lp-ink max-w-[900px] mb-6" style={{ fontSize: "clamp(40px, 6vw, 72px)", lineHeight: 1.04, animationDelay: "140ms" }}>
            Da análise à tese, da tese ao investidor certo.
          </h1>
          <p className="animate-fade-up text-[17px] text-lp-ink-2 leading-relaxed max-w-[640px] mb-8" style={{ animationDelay: "300ms" }}>
            O Invest Match é o módulo de originação do Mandor. A partir da análise do ativo,
            gera a tese e aciona um motor de matching de cinco camadas que conecta o deal ao
            investidor ou comprador de perfil compatível. Originação deixa de depender de agenda
            e vira processo.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 mb-6">
            <Link href="/auth/signup" className="lp-btn-primary inline-flex items-center justify-center gap-2 text-[14px] font-medium text-white px-6 py-3.5 rounded-[10px]" style={{ background: "#8C6F45" }}>
              Solicitar acesso <span aria-hidden>→</span>
            </Link>
            <Link href="/#planos" className="lp-btn-secondary inline-flex items-center justify-center text-[14px] font-medium text-lp-ink border border-lp-border-strong px-6 py-3.5 rounded-[10px] hover:bg-lp-fog">
              Ver planos
            </Link>
          </div>
          <span className="lp-stamp">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5" /></svg>
            Originação como processo · matching de 5 camadas
          </span>
        </div>
      </section>

      {/* ── Como funciona ─────────────────────────────────────────────────── */}
      <section className="max-w-[1280px] mx-auto px-6 py-20 lg:py-24">
        <div className="reveal-blur max-w-[640px] mb-12">
          <p className="lp-eyebrow mb-4">como funciona</p>
          <h2 className="font-display tracking-tight text-lp-ink" style={{ fontSize: "clamp(28px, 3.8vw, 48px)", lineHeight: 1.1 }}>
            Do ativo analisado ao investidor certo.
          </h2>
        </div>
        <div className="reveal grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {[
            { n: "01", t: "Tese a partir da análise", d: "A tese de investimento é construída sobre o diagnóstico do ativo, coerente com números e riscos já levantados." },
            { n: "02", t: "Matching de 5 camadas", d: "Mandato, apetite de risco, ticket, setor e estágio são cruzados com o perfil de cada investidor." },
            { n: "03", t: "Score e curadoria", d: "Acima do corte, aprovação automática; abaixo, curadoria antes de apresentar ao investidor." },
            { n: "04", t: "Originação reversa", d: "Dado um investidor, busca entre as teses ativas as que mais aderem ao seu mandato." },
          ].map((s) => (
            <div key={s.n} className="lp-doc-card rounded-[16px] p-6 lp-card-shadow-sm">
              <p className="font-display text-[13px] text-lp-ink-4 mb-3">{s.n}</p>
              <h3 className="text-[15px] font-semibold text-lp-ink mb-2 leading-snug">{s.t}</h3>
              <p className="text-[13.5px] text-lp-ink-3 leading-relaxed">{s.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── O que você recebe ─────────────────────────────────────────────── */}
      <section className="bg-lp-fog border-y border-lp-border">
        <div className="max-w-[1280px] mx-auto px-6 py-20 lg:py-24">
          <div className="grid lg:grid-cols-2 gap-14 items-center">
            <div aria-hidden="true" className="reveal-blur order-2 lg:order-1">
              <div className="rounded-[20px] overflow-hidden lp-card-shadow bg-lp-canvas border border-lp-border animate-float-slow">
                <div className="flex items-center justify-between px-5 py-3.5 border-b border-lp-border">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ background: "#8C6F45" }} />
                    <span className="text-[11px] font-medium text-lp-ink-2 tracking-wide">Tese · Indústria Química · R$ 280M</span>
                  </div>
                  <span className="text-[10px] font-medium text-lp-ink-3">5 camadas</span>
                </div>
                <div className="px-5 py-4 space-y-2.5">
                  {[
                    { n: "Fundo de Crédito Estruturado", t: "compatível com a tese", sc: 91, st: "aprovado", c: "#067647", b: "#ECFDF3" },
                    { n: "Family Office · SP", t: "apetite e ticket aderentes", sc: 84, st: "curadoria", c: "#65502E", b: "#E8E2D6" },
                    { n: "Gestora de Special Sits", t: "perfil de risco aderente", sc: 76, st: "curadoria", c: "#65502E", b: "#E8E2D6" },
                  ].map((m) => (
                    <div key={m.n} className="flex items-center justify-between gap-3 rounded-[10px] border border-lp-border px-3 py-2.5">
                      <div className="min-w-0">
                        <p className="text-[12px] font-medium text-lp-ink leading-tight truncate">{m.n}</p>
                        <p className="text-[10.5px] text-lp-ink-3 truncate">{m.t}</p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="font-display text-[18px] leading-none text-lp-ink">{m.sc}</span>
                        <span className="text-[9px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full" style={{ background: m.b, color: m.c }}>{m.st}</span>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="px-5 py-3 border-t border-lp-border">
                  <span className="text-[10px] text-lp-ink-3">Compatibilidade · originação reversa disponível</span>
                </div>
              </div>
            </div>
            <div className="reveal-left order-1 lg:order-2">
              <p className="lp-eyebrow mb-4">o que você recebe</p>
              <h2 className="font-display tracking-tight text-lp-ink mb-6" style={{ fontSize: "clamp(28px, 3.8vw, 46px)", lineHeight: 1.1 }}>
                Deal flow qualificado, não lista de contatos.
              </h2>
              <ul className="space-y-3">
                {[
                  "Tese de investimento gerada a partir da análise do ativo",
                  "Matches com score de compatibilidade e justificativa",
                  "Aprovação automática acima do corte, curadoria abaixo",
                  "Originação reversa de teses para um investidor",
                  "Pipeline de relacionamento por status, do lead ao fechamento",
                ].map((i) => (
                  <li key={i} className="flex items-start gap-2.5 text-[14.5px] text-lp-ink-2">
                    <span className="flex-shrink-0 mt-0.5 text-[12px] font-bold" style={{ color: "#8C6F45" }}>✓</span>
                    {i}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ── FAQ ───────────────────────────────────────────────────────────── */}
      <section className="max-w-[760px] mx-auto px-6 py-20 lg:py-24">
        <p className="lp-eyebrow mb-4 reveal">dúvidas frequentes</p>
        <h2 className="reveal-blur font-display tracking-tight text-lp-ink mb-8" style={{ fontSize: "clamp(28px, 3.6vw, 44px)", lineHeight: 1.12 }}>
          Originação com o Invest Match.
        </h2>
        <div className="reveal divide-y divide-lp-border">
          {faqs.map((f) => (
            <details key={f.q} className="group py-5">
              <summary className="flex items-center justify-between gap-4 text-[15.5px] font-semibold text-lp-ink select-none list-none cursor-pointer">
                {f.q}
                <span className="text-lp-ink-3 flex-shrink-0 text-[18px] font-light group-open:rotate-45 transition-transform">+</span>
              </summary>
              <p className="mt-3 text-[14px] text-lp-ink-2 leading-relaxed">{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* ── CTA ───────────────────────────────────────────────────────────── */}
      <section className="lp-dark-section">
        <div className="max-w-[1280px] mx-auto px-6 py-20 lg:py-24 text-center">
          <h2 className="reveal font-display tracking-tight mb-5" style={{ color: "#EDE9E5", fontSize: "clamp(32px, 4.6vw, 56px)", lineHeight: 1.06 }}>
            Transforme análise em deal flow.
          </h2>
          <p className="text-[15.5px] leading-relaxed max-w-[520px] mx-auto mb-9" style={{ color: "#B5B0A6" }}>
            Solicite acesso e veja como a originação vira processo, do ativo analisado ao
            investidor certo.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/auth/signup" className="lp-btn-primary inline-flex items-center justify-center gap-2 text-[14px] font-medium text-white px-7 py-3.5 rounded-[11px]" style={{ background: "#8C6F45" }}>
              Solicitar acesso <span aria-hidden>→</span>
            </Link>
            <Link href="/reforma-tributaria" className="inline-flex items-center justify-center text-[14px] font-medium px-7 py-3.5 rounded-[11px] lp-dark-btn">
              Conhecer a Reforma Tributária
            </Link>
          </div>
        </div>
      </section>

      <SiteFooter />
      <WhatsAppFloat />
    </div>
  );
}
