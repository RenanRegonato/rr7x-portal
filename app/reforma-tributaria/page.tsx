import type { Metadata } from "next";
import Link from "next/link";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import WhatsAppFloat from "@/components/WhatsAppFloat";

const SITE = "https://www.mandor.com.br";

export const metadata: Metadata = {
  title: "Reforma Tributária para M&A, Crédito e Captação",
  description:
    "Diagnóstico de adequação à Reforma Tributária (EC 132/2023 e LC 214/2025) dentro da análise do deal: o risco fiscal que trava M&A, crédito e captação, ancorado em artigo de lei e rastreável na due diligence.",
  alternates: { canonical: "/reforma-tributaria" },
  keywords: [
    "reforma tributária",
    "LC 214/2025",
    "EC 132/2023",
    "adequação tributária",
    "IBS",
    "CBS",
    "Imposto Seletivo",
    "split payment",
    "due diligence tributária",
    "M&A",
    "crédito estruturado",
    "valuation",
    "IVA dual",
  ],
  openGraph: {
    title: "Reforma Tributária para M&A, Crédito e Captação | Mandor",
    description:
      "Adequação à Reforma Tributária (EC 132/2023 e LC 214/2025) diagnosticada dentro da análise do deal, ancorada em lei e rastreável na due diligence.",
    url: "/reforma-tributaria",
    type: "website",
    locale: "pt_BR",
  },
};

const faqs = [
  {
    q: "O que é a adequação à Reforma Tributária na análise de um deal?",
    a: "É o diagnóstico de quanto a empresa ou o ativo está preparado para a Reforma Tributária do consumo (EC 132/2023 e LC 214/2025) e de quais riscos fiscais podem reduzir valor, travar uma due diligence ou inviabilizar a entrada de um investidor ou credor durante a transição de 2026 a 2033.",
  },
  {
    q: "Em que base legal o diagnóstico é ancorado?",
    a: "Na Emenda Constitucional 132/2023 e na Lei Complementar 214/2025, que regulamenta o IBS, a CBS e o Imposto Seletivo. Cada risco apontado é fundamentado em dispositivo legal, o que torna a leitura defensável em uma due diligence, com a ressalva de que pontos dependentes de regulamento infralegal seguem em evolução.",
  },
  {
    q: "Quais riscos tributários costumam decidir um deal?",
    a: "Dependência de benefícios de ICMS que serão extintos até 2033, exposição ao Imposto Seletivo (que agora alcança veículos, mineração, bebidas e fumo), impacto do split payment no fluxo de caixa e nas garantias, empresas do Simples vendendo para o Lucro Real e crédito condicionado ao pagamento ao longo da cadeia.",
  },
  {
    q: "O que a empresa recebe ao final?",
    a: "Um diagnóstico estruturado com score de conformidade, riscos classificados por severidade, pontos críticos para captação e M&A, recomendações e um checklist de adequação, tudo dentro do mesmo dossiê institucional da análise.",
  },
];

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebPage",
      "@id": `${SITE}/reforma-tributaria`,
      url: `${SITE}/reforma-tributaria`,
      name: "Reforma Tributária para M&A, Crédito e Captação | Mandor",
      description:
        "Diagnóstico de adequação à Reforma Tributária (EC 132/2023 e LC 214/2025) dentro da análise do deal.",
      inLanguage: "pt-BR",
    },
    {
      "@type": "Service",
      name: "Adequação à Reforma Tributária · Mandor",
      serviceType: "Diagnóstico de adequação tributária para M&A e crédito estruturado",
      provider: { "@type": "Organization", name: "Mandor", url: SITE },
      areaServed: "BR",
      description:
        "Diagnóstico de adequação à Reforma Tributária do consumo, ancorado na EC 132/2023 e na LC 214/2025, integrado à análise do deal.",
    },
    {
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Início", item: SITE },
        { "@type": "ListItem", position: 2, name: "Reforma Tributária", item: `${SITE}/reforma-tributaria` },
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

export default function ReformaTributariaPage() {
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
            <span className="text-lp-ink-2">Reforma Tributária</span>
          </nav>
          <p className="lp-eyebrow mb-5 animate-fade-up" style={{ animationDelay: "60ms" }}>módulo · adequação tributária</p>
          <h1 className="animate-fade-up font-display tracking-tight text-lp-ink max-w-[900px] mb-6" style={{ fontSize: "clamp(40px, 6vw, 72px)", lineHeight: 1.04, animationDelay: "140ms" }}>
            Adequação à Reforma Tributária para M&amp;A, crédito e captação.
          </h1>
          <p className="animate-fade-up text-[17px] text-lp-ink-2 leading-relaxed max-w-[640px] mb-8" style={{ animationDelay: "300ms" }}>
            A Reforma Tributária do consumo (EC 132/2023 e LC 214/2025) muda a realidade fiscal
            de quase toda empresa que será comprada, vendida ou financiada na transição de 2026
            a 2033. A Mandor diagnostica essa adequação dentro da própria análise do deal: o que
            trava valuation, due diligence e crédito por motivo tributário, ancorado em artigo de lei.
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
            Ancorado na LC 214/2025 · rastreável na due diligence
          </span>
        </div>
      </section>

      {/* ── O que a Mandor diagnostica ────────────────────────────────────── */}
      <section className="max-w-[1280px] mx-auto px-6 py-20 lg:py-24">
        <div className="reveal-blur max-w-[640px] mb-12">
          <p className="lp-eyebrow mb-4">o que decide o deal</p>
          <h2 className="font-display tracking-tight text-lp-ink" style={{ fontSize: "clamp(28px, 3.8vw, 48px)", lineHeight: 1.1 }}>
            O risco fiscal que ninguém precificou ainda.
          </h2>
        </div>
        <div className="reveal grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {[
            { t: "Benefícios de ICMS em extinção", d: "Margem apoiada em incentivo de ICMS que será reduzido de 2029 a 2032 e extinto em 2033. Valuation construído sobre uma muleta temporária." },
            { t: "Imposto Seletivo ampliado", d: "O Imposto Seletivo agora alcança veículos, mineração, bebidas alcoólicas e açucaradas e fumo, por ser monofásico, sem direito a crédito." },
            { t: "Split payment no caixa", d: "Parte do recebível é recolhida ao fisco no momento do pagamento, com efeito direto sobre fluxo de caixa e sobre garantias como a cessão fiduciária de recebíveis." },
            { t: "Simples vendendo B2B", d: "Empresa do Simples que vende para o Lucro Real transfere menos crédito e perde competitividade comercial na cadeia." },
            { t: "Crédito condicionado ao pagamento", d: "No novo IVA dual (IBS e CBS), o crédito do adquirente depende do efetivo recolhimento do tributo ao longo da cadeia." },
            { t: "Contratos longos sem repactuação", d: "Contratos que cruzam a transição de oito anos sem cláusula de repactuação tributária criam exposição não endereçada." },
          ].map((c) => (
            <div key={c.t} className="lp-doc-card rounded-[16px] p-6 lp-card-shadow-sm">
              <h3 className="text-[15px] font-semibold text-lp-ink mb-2 leading-snug">{c.t}</h3>
              <p className="text-[13.5px] text-lp-ink-3 leading-relaxed">{c.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── O que você recebe ─────────────────────────────────────────────── */}
      <section className="bg-lp-fog border-y border-lp-border">
        <div className="max-w-[1280px] mx-auto px-6 py-20 lg:py-24">
          <div className="grid lg:grid-cols-2 gap-14 items-center">
            <div className="reveal-left">
              <p className="lp-eyebrow mb-4">o que você recebe</p>
              <h2 className="font-display tracking-tight text-lp-ink mb-6" style={{ fontSize: "clamp(28px, 3.8vw, 46px)", lineHeight: 1.1 }}>
                Um diagnóstico institucional, dentro do mesmo dossiê.
              </h2>
              <ul className="space-y-3">
                {[
                  "Score de conformidade da empresa à Reforma Tributária",
                  "Riscos classificados por severidade, com fundamento legal",
                  "Pontos críticos para captação, M&A e crédito",
                  "Recomendações priorizadas de adequação",
                  "Checklist de adequação, item a item",
                  "Ressalva institucional sobre regulamentação em evolução",
                ].map((i) => (
                  <li key={i} className="flex items-start gap-2.5 text-[14.5px] text-lp-ink-2">
                    <span className="flex-shrink-0 mt-0.5 text-[12px] font-bold" style={{ color: "#8C6F45" }}>✓</span>
                    {i}
                  </li>
                ))}
              </ul>
            </div>
            <div aria-hidden="true" className="reveal-blur">
              <div className="rounded-[20px] overflow-hidden lp-card-shadow bg-lp-canvas border border-lp-border animate-float-slow">
                <div className="flex items-center justify-between px-5 py-3.5 border-b border-lp-border">
                  <div className="flex items-center gap-2.5">
                    <span className="lp-seal" style={{ width: 36, height: 36, fontSize: 14 }}>M</span>
                    <div>
                      <p className="text-[12px] font-semibold text-lp-ink leading-tight">Diagnóstico de Adequação</p>
                      <p className="text-[10px] text-lp-ink-3">Base normativa: LC 214/2025</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-medium px-2 py-0.5 rounded-full" style={{ background: "#FEF3F2", color: "#B42318" }}>exposição alta</span>
                </div>
                <div className="px-5 py-4 border-b border-lp-border">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-medium text-lp-ink-3 uppercase tracking-widest">Score de conformidade</span>
                    <span className="text-[11px] font-semibold" style={{ color: "#8C6F45" }}>46 / 100</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-lp-fog overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: "46%", background: "linear-gradient(90deg,#8C6F45,#A88A65)" }} />
                  </div>
                </div>
                <div className="px-5 py-4 space-y-2.5">
                  {[
                    { t: "Benefício de ICMS extinto até 2033", s: "crítico", c: "#B42318", b: "#FEF3F2" },
                    { t: "Split payment na cessão de recebíveis", s: "alto", c: "#B54708", b: "#FFFAEB" },
                    { t: "Contratos longos sem repactuação", s: "médio", c: "#65502E", b: "#E8E2D6" },
                  ].map((r) => (
                    <div key={r.t} className="flex items-center justify-between gap-3">
                      <p className="text-[12px] text-lp-ink leading-snug">{r.t}</p>
                      <span className="flex-shrink-0 text-[9px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full" style={{ background: r.b, color: r.c }}>{r.s}</span>
                    </div>
                  ))}
                </div>
                <div className="px-5 py-3 border-t border-lp-border">
                  <span className="text-[10px] text-lp-ink-3">7 riscos · 6 pontos críticos de captação · checklist de 12 itens</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── FAQ ───────────────────────────────────────────────────────────── */}
      <section className="max-w-[760px] mx-auto px-6 py-20 lg:py-24">
        <p className="lp-eyebrow mb-4 reveal">dúvidas frequentes</p>
        <h2 className="reveal-blur font-display tracking-tight text-lp-ink mb-8" style={{ fontSize: "clamp(28px, 3.6vw, 44px)", lineHeight: 1.12 }}>
          Reforma Tributária e o deal.
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
            Descubra a exposição do seu deal.
          </h2>
          <p className="text-[15.5px] leading-relaxed max-w-[520px] mx-auto mb-9" style={{ color: "#B5B0A6" }}>
            Solicite acesso e reservamos uma conversa inicial para entender o contexto do escritório
            e do ativo.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/auth/signup" className="lp-btn-primary inline-flex items-center justify-center gap-2 text-[14px] font-medium text-white px-7 py-3.5 rounded-[11px]" style={{ background: "#8C6F45" }}>
              Solicitar acesso <span aria-hidden>→</span>
            </Link>
            <Link href="/invest-match" className="inline-flex items-center justify-center text-[14px] font-medium px-7 py-3.5 rounded-[11px] lp-dark-btn">
              Conhecer o Invest Match
            </Link>
          </div>
        </div>
      </section>

      <SiteFooter />
      <WhatsAppFloat />
    </div>
  );
}
