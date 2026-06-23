import type { Metadata } from "next";
import Link from "next/link";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import WhatsAppFloat from "@/components/WhatsAppFloat";
import { getMapaPublicStats } from "@/lib/mapa-mercado/queries";

const SITE = "https://www.mandor.com.br";

// Revalida de hora em hora: os números acompanham o ETL (cron semanal) sem
// custo de query por acesso. Página continua estática entre revalidações.
export const revalidate = 3600;

const fmt = (n: number) => n.toLocaleString("pt-BR");

// Fallback conservador caso o banco não responda no build/revalidação — a
// página nunca quebra; só usa números aproximados até a próxima revalidação.
const STATS_FALLBACK = { participantes: 1800, gestoras: 1100, veiculos: 41000, conexoes: 9000 };

export const metadata: Metadata = {
  title: "Mapa Inteligente do Mercado · O atlas do capital privado brasileiro",
  description:
    "Gestoras, administradores, custodiantes, bancos, FIDCs, securitizadoras, family offices e boutiques em um só lugar. Veja como se conectam e, a partir de um deal, para quem levá-lo. Tudo sobre dado público, com fonte rastreável.",
  alternates: { canonical: "/mapa-inteligente" },
  keywords: [
    "mapa do mercado de capitais",
    "gestoras de fundos",
    "FIDC",
    "securitizadoras",
    "administradores fiduciários",
    "carteira de crédito PJ",
    "originação de crédito estruturado",
    "inteligência de mercado",
    "dados CVM",
    "family office",
    "alvos de captação",
  ],
  openGraph: {
    title: "Mapa Inteligente do Mercado · O atlas do capital privado brasileiro | Mandor",
    description:
      "Quem é quem e quem se conecta com quem no mercado privado brasileiro. A partir de um deal, o Mandor aponta para quem levá-lo.",
    url: "/mapa-inteligente",
    type: "website",
    locale: "pt_BR",
  },
};

const faqs = [
  {
    q: "O que é o Mapa Inteligente do Mercado?",
    a: "É o módulo de inteligência de mercado e originação do Mandor. Reúne os participantes do mercado de capitais brasileiro (gestoras, administradores, custodiantes, distribuidores, bancos, FIDCs, securitizadoras, family offices e boutiques), mostra como se conectam e, a partir de um deal, aponta as instituições com afinidade de mandato para captar.",
  },
  {
    q: "De onde vêm os dados?",
    a: "De fontes públicas e oficiais: CVM (Dados Abertos), Banco Central, B3 e Receita Federal, sempre com atribuição de fonte. É um sinal de afinidade de mandato e relevância de mercado, não recomendação de investimento.",
  },
  {
    q: "Como ele ajuda na originação?",
    a: "A partir de um deal já analisado no Mandor, o módulo identifica as gestoras e instituições que já operam aquele mandato (por exemplo, FIDC para crédito estruturado), rankeadas por experiência, e mostra o caminho de relacionamento até elas. Cada alvo pode entrar direto no pipeline do Invest Match.",
  },
  {
    q: "O que é o mapa de conexões?",
    a: "É a malha de relacionamentos do mercado: quem atua com quem nos mesmos veículos (gestora, administrador, custodiante, distribuidor). Um grafo navegável que revela parceiros recorrentes e a porta de entrada para cada instituição.",
  },
];

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebPage",
      "@id": `${SITE}/mapa-inteligente`,
      url: `${SITE}/mapa-inteligente`,
      name: "Mapa Inteligente do Mercado · O atlas do capital privado brasileiro | Mandor",
      description:
        "Quem é quem e quem se conecta com quem no mercado privado brasileiro, sobre dado público e rastreável.",
      inLanguage: "pt-BR",
    },
    {
      "@type": "Service",
      name: "Mapa Inteligente do Mercado · inteligência de mercado e originação",
      serviceType: "Inteligência do mercado de capitais e originação de crédito estruturado",
      provider: { "@type": "Organization", name: "Mandor", url: SITE },
      areaServed: "BR",
      description:
        "Catálogo, grafo de conexões e alvos de captação dos participantes do mercado de capitais brasileiro, sobre dado público (CVM, Banco Central, B3, Receita).",
    },
    {
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Início", item: SITE },
        { "@type": "ListItem", position: 2, name: "Mapa Inteligente do Mercado", item: `${SITE}/mapa-inteligente` },
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

export default async function MapaInteligentePage() {
  const stats = await getMapaPublicStats().catch(() => STATS_FALLBACK);
  const numeros = [
    { v: stats.gestoras,      l: "Gestoras" },
    { v: stats.veiculos,      l: "Fundos e veículos" },
    { v: stats.conexoes,      l: "Conexões mapeadas" },
    { v: stats.participantes, l: "Participantes no total" },
  ];

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
            <span className="text-lp-ink-2">Mapa Inteligente do Mercado</span>
          </nav>
          <p className="lp-eyebrow mb-5 animate-fade-up" style={{ animationDelay: "60ms" }}>módulo · inteligência de mercado</p>
          <h1 className="animate-fade-up font-display tracking-tight text-lp-ink max-w-[900px] mb-6" style={{ fontSize: "clamp(40px, 6vw, 72px)", lineHeight: 1.04, animationDelay: "140ms" }}>
            O mapa de quem move o capital privado.
          </h1>
          <p className="animate-fade-up text-[17px] text-lp-ink-2 leading-relaxed max-w-[660px] mb-8" style={{ animationDelay: "300ms" }}>
            O Mapa Inteligente do Mercado é o módulo de inteligência e originação do Mandor.
            Reúne gestoras, administradores, custodiantes, bancos, FIDCs, securitizadoras,
            family offices e boutiques, revela como se conectam e, a partir de um deal, aponta
            para quem levá-lo. Tudo sobre dado público, com fonte rastreável.
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
            Dado público · CVM, Banco Central, B3 e Receita
          </span>
        </div>
      </section>

      {/* ── A base em números (prova social, ao vivo) ─────────────────────── */}
      <section className="border-b border-lp-border bg-lp-fog">
        <div className="max-w-[1180px] mx-auto px-6 py-12 lg:py-16">
          <p className="lp-eyebrow mb-9 text-center">a base, em números · sobre dado público</p>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-y-9 gap-x-6">
            {numeros.map((n) => (
              <div key={n.l} className="text-center">
                <p className="font-display text-lp-ink leading-none tabular-nums" style={{ fontSize: "clamp(34px, 5vw, 58px)" }}>
                  {fmt(n.v)}
                </p>
                <p className="text-[13px] text-lp-ink-3 mt-2.5">{n.l}</p>
              </div>
            ))}
          </div>
          <p className="text-[11.5px] text-lp-ink-4 text-center mt-9">
            Fontes oficiais: CVM, Banco Central, B3 e Receita Federal. Atualizado continuamente.
          </p>
        </div>
      </section>

      {/* ── De acordo com seu tipo de operação ────────────────────────────── */}
      <section className="border-t border-lp-border">
        <div className="max-w-[1280px] mx-auto px-6">
          <p className="reveal text-[12px] font-medium tracking-[0.22em] uppercase text-lp-ink-3 pt-16">de acordo com seu tipo de operação</p>
          {[
            {
              k: "01",
              titulo: "M&A e Aquisições",
              descricao: "Para uma venda ou compra de empresa, o Mapa mostra os fundos de private equity, grupos econômicos e strategic buyers que atuam naquele setor e tamanho de ticket. Revela quem já investiu naquela vertical, conexões com bancos de investimento e histórico de saídas.",
              foco: ["Fundos de PE por setor e ticket", "Strategic buyers ativos no segmento", "Bancos de investimento parceiros"],
            },
            {
              k: "02",
              titulo: "FIDC e Crédito Estruturado",
              descricao: "Para um fundo de crédito, o Mapa identifica as gestoras que operem aquele tipo de recebível (factoring, crédito ao consumidor, PJ), administradoras fiduciárias especializadas e bancos que distribuem esse segmento. Mostra capacidade de cada gestora e ticket médio alocado.",
              foco: ["Gestoras de crédito por tipo de recebível", "Administradoras fiduciárias especializadas", "Bancos distribuidores de FIDC"],
            },
            {
              k: "03",
              titulo: "Securitização (CRI / CRA)",
              descricao: "Para uma securitização de imóvel ou direitos creditórios, o Mapa aponta distribuidoras autorizadas, investidores qualificados com histórico naquele tipo de ativo, e bancos estruturadores de CRI/CRA. Mostra quem já securitizou imóvel comercial, infraestrutura ou recebíveis similares.",
              foco: ["Distribuidoras autorizadas por especialidade", "Investidores institucionais de CRI/CRA", "Bancos estruturadores precedentes"],
            },
          ].map((v) => (
            <div key={v.k} className="reveal border-b border-lp-border py-14 lg:py-16">
              <div className="grid lg:grid-cols-[120px_1fr] gap-6 lg:gap-12">
                <span className="font-display text-[20px] text-lp-ink-4">{v.k}</span>
                <div>
                  <h3 className="font-display tracking-tight text-lp-ink mb-4" style={{ fontSize: "clamp(26px, 3.2vw, 40px)", lineHeight: 1.08 }}>
                    {v.titulo}
                  </h3>
                  <p className="text-[15px] text-lp-ink-2 leading-relaxed max-w-[640px] mb-6">
                    {v.descricao}
                  </p>
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-widest text-lp-ink-3 mb-3">O Mapa mostra</p>
                    <ul className="space-y-2">
                      {v.foco.map((f) => (
                        <li key={f} className="flex items-start gap-2.5 text-[13.5px] text-lp-ink-2">
                          <span className="flex-shrink-0 mt-0.5 text-[11px] font-bold" style={{ color: "#8C6F45" }}>•</span>
                          {f}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Como funciona ─────────────────────────────────────────────────── */}
      <section className="max-w-[1280px] mx-auto px-6 py-20 lg:py-24">
        <div className="reveal-blur max-w-[660px] mb-12">
          <p className="lp-eyebrow mb-4">como funciona</p>
          <h2 className="font-display tracking-tight text-lp-ink" style={{ fontSize: "clamp(28px, 3.8vw, 48px)", lineHeight: 1.1 }}>
            Do mapa do mercado ao alvo certo do seu deal.
          </h2>
        </div>
        <div className="reveal grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {[
            { n: "01", t: "Catálogo do mercado", d: "Milhares de participantes e veículos, com perfil de atuação, papéis e localização." },
            { n: "02", t: "Busca inteligente", d: "Por nome ou em linguagem natural, com inteligência artificial que entende o conceito." },
            { n: "03", t: "Mapa de conexões", d: "Quem opera com quem nos mesmos veículos, em um grafo navegável do ecossistema." },
            { n: "04", t: "Alvos de captação", d: "A partir de um deal, as gestoras que já operam aquele mandato, prontas para o pipeline." },
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
                    <span className="text-[11px] font-medium text-lp-ink-2 tracking-wide">Alvos de captação · FIDC · R$ 80M</span>
                  </div>
                  <span className="text-[10px] font-medium text-lp-ink-3">por mandato</span>
                </div>
                <div className="px-5 py-4 space-y-2.5">
                  {[
                    { n: "Gestora de Crédito Estruturado", t: "98 veículos no mandato", sc: 92 },
                    { n: "Asset · Recebíveis Multissetorial", t: "76 veículos no mandato", sc: 88 },
                    { n: "Boutique de Special Situations", t: "54 veículos no mandato", sc: 84 },
                  ].map((m) => (
                    <div key={m.n} className="flex items-center justify-between gap-3 rounded-[10px] border border-lp-border px-3 py-2.5">
                      <div className="min-w-0">
                        <p className="text-[12px] font-medium text-lp-ink leading-tight truncate">{m.n}</p>
                        <p className="text-[10.5px] text-lp-ink-3 truncate">{m.t}</p>
                      </div>
                      <span className="font-display text-[18px] leading-none text-lp-ink flex-shrink-0">{m.sc}</span>
                    </div>
                  ))}
                </div>
                <div className="px-5 py-3 border-t border-lp-border">
                  <span className="text-[10px] text-lp-ink-3">Relevância de mercado · não é recomendação de investimento</span>
                </div>
              </div>
            </div>
            <div className="reveal-left order-1 lg:order-2">
              <p className="lp-eyebrow mb-4">o que você recebe</p>
              <h2 className="font-display tracking-tight text-lp-ink mb-6" style={{ fontSize: "clamp(28px, 3.8vw, 46px)", lineHeight: 1.1 }}>
                Inteligência de relacionamento, não lista de contatos.
              </h2>
              <ul className="space-y-3">
                {[
                  "Fichas 360º de participantes: papéis, veículos, conexões e score de mercado",
                  "Indicadores financeiros dos bancos: carteira PJ, ativo, patrimônio líquido",
                  "Busca por nome e busca semântica em linguagem natural",
                  "Mapa de conexões navegável do ecossistema",
                  "Alvos de captação a partir do deal, integrados ao Invest Match",
                  "Atribuição de fonte em tudo, sobre dado público",
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
          O Mapa Inteligente do Mercado.
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
            Saiba para quem levar cada deal.
          </h2>
          <p className="text-[15.5px] leading-relaxed max-w-[540px] mx-auto mb-9" style={{ color: "#B5B0A6" }}>
            Solicite acesso e navegue o mapa do mercado privado brasileiro, do participante
            certo ao caminho de relacionamento até ele.
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
