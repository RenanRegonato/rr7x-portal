import type { Metadata } from "next";
import Link from "next/link";
import AuthErrorHandler from "@/components/AuthErrorHandler";
import HeroVideo from "@/components/HeroVideo";

export const metadata: Metadata = {
  title: "Otto by RR7x — A nova geração operacional para escritórios de M&A e estruturação",
  description:
    "Rede neural operacional com 9 inteligências em paralelo. Otto processa, analisa e estrutura operações de M&A em até 40 minutos — com compliance documentado, valuation sustentado e material pronto para o mercado.",
  alternates: { canonical: "/" },
};

/* ─── Data ───────────────────────────────────────────────────────────────── */

const agentes = [
  {
    initial: "O",
    bg: "bg-lp-accent-soft",
    bloco: "i · estratégia",
    nome: "Otto Orquestra",
    tag: "orquestração · drs",
    role: "Calcula o DRS, mapeia riscos materiais e define a estratégia do pipeline.",
  },
  {
    initial: "P",
    bg: "bg-[#ECF8FF]",
    bloco: "i · estratégia",
    nome: "Pedro Panorama",
    tag: "mercado",
    role: "Viabilidade econômica, cenário setorial e parecer Go / No-Go.",
  },
  {
    initial: "A",
    bg: "bg-[#FEF8ED]",
    bloco: "i · estratégia",
    nome: "Arthur Aquisição",
    tag: "m&a · valuation",
    role: "Valuation, tese de M&A e estratégia de negociação.",
  },
  {
    initial: "D",
    bg: "bg-[#EDFAF4]",
    bloco: "ii · diagnóstico",
    nome: "Davi Diagnóstico",
    tag: "finanças",
    role: "Saúde financeira, EBITDA, fluxo de caixa e diagnóstico operacional.",
  },
  {
    initial: "C",
    bg: "bg-[#F3EEFF]",
    bloco: "ii · diagnóstico",
    nome: "Clara Cláusula",
    tag: "jurídico",
    role: "Riscos legais e documentação necessária — NDA, SHA e LOI.",
  },
  {
    initial: "E",
    bg: "bg-[#EDFAF4]",
    bloco: "ii · diagnóstico",
    nome: "Estela Estrutura",
    tag: "crédito estruturado",
    role: "Ranking de operações estruturadas aplicáveis ao ativo.",
  },
  {
    initial: "V",
    bg: "bg-[#FEF0F4]",
    bloco: "iii · execução",
    nome: "Victor Valor",
    tag: "originação",
    role: "Posicionamento de venda e mapeamento do pipeline de compradores.",
  },
  {
    initial: "P",
    bg: "bg-[#FEF8ED]",
    bloco: "iii · execução",
    nome: "Paulo Preparo",
    tag: "maturidade",
    role: "Veredicto de maturidade do deal e roadmap de preparação para mercado.",
  },
  {
    initial: "R",
    bg: "bg-[#ECF8FF]",
    bloco: "iii · execução",
    nome: "Rodrigo Relatório",
    tag: "consolidação",
    role: "Revisão cruzada entre inteligências e consolidação final de qualidade.",
  },
];

const comparativo = [
  { dim: "Tempo por análise completa",      trad: "10–15 dias úteis",              otto: "até 40 min" },
  { dim: "Capacidade mensal",               trad: "Baixa escala",                  otto: "40+ deals analisáveis" },
  { dim: "Organização do material",         trad: "Descentralizada por pessoa",    otto: "Fluxo estruturado e centralizado" },
  { dim: "Visibilidade sobre riscos",       trad: "Dependente da análise",         otto: "Cruzamento automático" },
  { dim: "Crescimento da capacidade",       trad: "Mais contratações = mais custo",otto: "Escala sem custo proporcional" },
  { dim: "Padrão dos materiais",            trad: "Variável por analista",         otto: "Institucional em todos os deals" },
  { dim: "Tempo de resposta ao cliente",    trad: "2 a 3 dias",                    otto: "No mesmo dia" },
  { dim: "Deals com análise profunda/mês",  trad: "10 de 40",                      otto: "38 a 40 de 40" },
];

const planos = [
  {
    num: "i",
    nome: "Pontual",
    tag: "avulso · por análise",
    preco: "R$ 2.500",
    complemento: "– 5.000 / análise",
    desc: "Para escritórios com demanda esporádica. Compra de créditos sob demanda, sem comprometimento mensal.",
    features: [
      "Pipeline completo por análise",
      "Pitchbook e Teaser white-label",
      "Saída institucional padronizada",
      "Sem fidelidade contratual",
    ],
    destaque: false,
    cta: "Solicitar proposta",
    href: "/auth/signup",
  },
  {
    num: "ii",
    nome: "Institucional",
    tag: "recorrente · mensal",
    preco: "R$ 8.000",
    complemento: "– 15.000 / mês",
    desc: "Para escritórios com pipeline contínuo. Análises ilimitadas, equipe completa e calibração com aprendizados do escritório.",
    features: [
      "Análises ilimitadas no período",
      "Equipe completa do escritório",
      "Calibração com aprendizados do escritório",
      "Acesso a novos nós da rede na release",
    ],
    destaque: true,
    cta: "Solicitar proposta",
    href: "/auth/signup",
  },
  {
    num: "iii",
    nome: "Corporativo",
    tag: "enterprise · anual sob medida",
    preco: "R$ 25.000",
    complemento: "– 50.000 / mês",
    desc: "Para grupos, holdings e operações de grande porte. Plataforma calibrada e integração com fluxo interno do escritório.",
    features: [
      "Calibração de prompts customizada",
      "Treinamento da equipe",
      "Integração com fluxo interno",
      "Suporte institucional dedicado",
    ],
    destaque: false,
    cta: "Consultar valores",
    href: "mailto:gestor@renanregonato.com.br?subject=Enterprise%20Otto%20by%20RR7x",
  },
];

const faqs = [
  {
    q: "O que é o Deal Readiness Score?",
    a: "O DRS é o índice proprietário da Otto que avalia o grau de maturidade de um ativo para processo de M&A ou captação. Vai de 0 a 10 e considera governança, saúde financeira, posicionamento de mercado, estrutura jurídica e readiness documental.",
  },
  {
    q: "Otto substitui os profissionais do escritório?",
    a: "Não — Otto potencializa, nunca substitui. É uma camada de apoio operacional que organiza informação, cruza dados e amplia a capacidade de análise dos profissionais responsáveis pela decisão. A decisão final é sempre humana, técnica e profissional.",
  },
  {
    q: "Como funciona o white-label? O cliente sabe que é Otto?",
    a: "Não. Blind Teaser e Sell-Side Pitchbook são gerados com a identidade do escritório que contratou. Otto sai de cena no documento final.",
  },
  {
    q: "Como é garantida a confidencialidade dos dados?",
    a: "Toda informação é processada em ambiente isolado, sem retenção após a entrega. Os documentos não são usados para treinamento de modelos. Plano Corporativo inclui NDA padrão antes de qualquer acesso.",
  },
  {
    q: "Quanto tempo leva para receber a análise completa?",
    a: "Até 40 minutos após submissão dos documentos do ativo. Para planos Institucional e Corporativo, a entrega é garantida no mesmo dia para casos com documentação incompleta.",
  },
  {
    q: "Quais tipos de ativo Otto analisa?",
    a: "Empresas operacionais (todos os setores), FIIs, CRIs, CRAs, operações de crédito estruturado, joint ventures e plataformas de serviços. Se tem fluxo de caixa e documentação, Otto analisa.",
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
              { href: "#como-funciona",  label: "Como funciona" },
              { href: "#especialistas",  label: "Especialistas" },
              { href: "#comparativo",    label: "Comparativo" },
              { href: "#planos",         label: "Planos" },
              { href: "/blog",           label: "Blog" },
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
            <Link href="/auth/signup" className="text-[13px] font-medium text-white px-4 py-2 rounded-[9px] transition-opacity hover:opacity-90" style={{ background: "#1655E8" }}>
              Solicitar acesso
            </Link>
          </div>
        </nav>
      </header>

      {/* ── Hero ───────────────────────────────────────────────────────────── */}
      <section
        className="relative overflow-hidden"
        style={{ background: "linear-gradient(160deg, #060C1A 0%, #0A1322 50%, #0D1829 100%)" }}
      >
        {/* Neural network video — black removed via screen blend */}
        <HeroVideo />

        {/* Blue radial accent glow */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse 80% 55% at 50% -10%, rgba(22,85,232,0.20) 0%, transparent 70%)",
          }}
          aria-hidden="true"
        />

        <div className="relative z-10 max-w-[1280px] mx-auto px-6 pt-24 pb-20 lg:pt-32 lg:pb-28">
          <div className="max-w-[760px] mx-auto text-center">
            {/* Badge */}
            <div
              className="inline-flex items-center gap-2 text-[11px] font-medium px-3.5 py-1.5 rounded-full mb-8 tracking-widest uppercase"
              style={{
                border: "1px solid rgba(255,255,255,0.10)",
                background: "rgba(255,255,255,0.05)",
                color: "rgba(200,212,236,0.65)",
              }}
            >
              <span
                className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                style={{ background: "#93B4F8" }}
              />
              rede neural operacional · rr7x capital hub
            </div>

            {/* Headline */}
            <h1
              className="font-display text-[52px] sm:text-[64px] lg:text-[76px] leading-[1.04] tracking-tight mb-6"
              style={{ color: "#EEF3FF" }}
            >
              A nova geração operacional
              <br />
              para escritórios de{" "}
              <em style={{ fontStyle: "italic", color: "#93B4F8" }}>M&amp;A.</em>
            </h1>

            {/* Subline */}
            <p
              className="text-[16px] sm:text-[17px] leading-relaxed max-w-[600px] mx-auto mb-10"
              style={{ color: "#7A92BE" }}
            >
              Otto processa, analisa e estrutura operações de M&amp;A em{" "}
              <strong style={{ color: "#C8D4EC", fontWeight: 600 }}>até 40 minutos</strong> — com
              compliance documentado, valuation sustentado e material pronto
              para o mercado.
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
                className="lp-dark-btn inline-flex items-center justify-center text-[14px] font-medium px-7 py-3.5 rounded-[11px]"
              >
                Ver comparativo
              </a>
            </div>
            <p className="text-[12px]" style={{ color: "#3A5080" }}>
              Reservamos uma conversa inicial para entender o contexto do escritório
            </p>
          </div>

          {/* Floating cards — white cards float beautifully on dark background */}
          <div className="hidden lg:block relative mt-16 h-32">
            {/* Left — DRS */}
            <div
              className="absolute left-0 top-0 w-[220px] bg-lp-canvas rounded-[16px] p-4 lp-card-shadow"
              style={{ transform: "translateY(-10px)" }}
              aria-hidden="true"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] font-medium text-lp-ink-3 uppercase tracking-widest">Deal Readiness Score</span>
                <span className="text-[10px] font-medium px-2 py-0.5 rounded-full" style={{ background: "#EDFAF4", color: "#14753B" }}>
                  Pronto
                </span>
              </div>
              <div className="flex items-end gap-1 mb-1">
                <span className="font-display text-[38px] leading-none text-lp-ink">8.2</span>
                <span className="text-[16px] text-lp-ink-3 mb-1">/10</span>
              </div>
              <p className="text-[11px] text-lp-ink-3 mb-2">TechBrasil S.A.</p>
              <div className="h-1.5 rounded-full bg-lp-fog overflow-hidden">
                <div className="h-full rounded-full" style={{ width: "82%", background: "#1655E8" }} />
              </div>
            </div>

            {/* Right — Pipeline */}
            <div
              className="absolute right-0 top-0 w-[252px] bg-lp-canvas rounded-[16px] p-4 lp-card-shadow"
              style={{ transform: "translateY(10px)" }}
              aria-hidden="true"
            >
              <div className="flex items-center gap-2 mb-3">
                <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: "#1655E8" }} />
                <span className="text-[10px] font-medium text-lp-ink-2">Rede neural em execução</span>
              </div>
              {[
                { n: "Davi", r: "EBITDA Ajustado", done: true },
                { n: "Arthur", r: "Tese de M&A", done: true },
                { n: "Victor", r: "Blind Teaser", done: false },
              ].map((a) => (
                <div key={a.n} className="flex items-center gap-2 py-1.5 border-t border-lp-border-subtle">
                  <span className="text-[10px] flex-shrink-0" style={{ color: a.done ? "#14753B" : "#1655E8" }}>
                    {a.done ? "✓" : "↻"}
                  </span>
                  <div>
                    <span className="text-[11px] text-lp-ink font-medium">{a.n}</span>
                    <span className="text-[11px] text-lp-ink-3"> — {a.r}</span>
                  </div>
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
              { value: "40 min",      label: "análise completa" },
              { value: "40+",         label: "deals analisáveis/mês" },
              { value: "4×",          label: "capacidade institucional" },
              { value: "R$ 6M–12M",  label: "receita incremental/ano" },
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
            <p className="text-[11px] font-medium text-lp-accent uppercase tracking-widest mb-4">capítulo i · tempo</p>
            <h2 className="font-display text-[36px] sm:text-[46px] leading-[1.08] tracking-tight text-lp-ink mb-5">
              Cada análise consome
              <br />
              entre{" "}
              <em style={{ fontStyle: "italic" }}>10 e 15 dias úteis.</em>
            </h2>
            <p className="text-[15.5px] text-lp-ink-2 leading-relaxed mb-8">
              Com 10 deals por semana e 10 a 15 dias de análise cada, sua
              equipe nunca sai do modo operacional. O restante da semana é
              gestão de fila — deals sem resposta, clientes esperando,
              mandatos indo para o concorrente que chegou primeiro.
            </p>
          </div>

          {/* Speed comparison visual */}
          <div className="bg-lp-fog rounded-[20px] p-8 border border-lp-border">
            <div className="grid grid-cols-[1fr_auto_1fr] gap-4 items-center text-center">
              <div>
                <p className="text-[11px] font-medium text-lp-ink-3 uppercase tracking-wider mb-3">modelo tradicional</p>
                <p className="font-display text-[52px] leading-none text-lp-ink">10–15</p>
                <p className="text-[13px] text-lp-ink-3 mt-1">dias úteis</p>
                <p className="text-[11.5px] text-lp-ink-4 mt-1">por análise jurídica completa</p>
              </div>
              <div className="font-display text-[28px] text-lp-ink-4">×</div>
              <div>
                <p className="text-[11px] font-medium text-lp-accent uppercase tracking-wider mb-3">Otto</p>
                <p className="font-display text-[52px] leading-none text-lp-ink">40</p>
                <p className="text-[13px] text-lp-ink-3 mt-1">minutos</p>
                <p className="text-[11.5px] text-lp-ink-4 mt-1">rede neural operacional</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Custo invisível ────────────────────────────────────────────────── */}
      <section className="bg-lp-fog border-y border-lp-border">
        <div className="max-w-[1280px] mx-auto px-6 py-20 lg:py-28">
          <div className="max-w-[600px] mb-12">
            <p className="text-[11px] font-medium text-lp-accent uppercase tracking-widest mb-4">capítulo ii · custo invisível</p>
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
                desc: "de um analista júnior em CLT — encargos + bônus de performance.",
                accent: false,
              },
              {
                value: "R$ 2k–8k",
                label: "honorários jurídicos",
                desc: "de advogados externos por análise contratual avulsa.",
                accent: false,
              },
              {
                value: "30 deals",
                label: "descartados/mês",
                desc: "em escritório com 10+ profissionais — sem análise real.",
                accent: false,
              },
              {
                value: "R$ 9M+/ano",
                label: "receita não capturada",
                desc: "por mandatos/mês que passam pelo escritório sem virar receita.",
                accent: true,
              },
            ].map((c) => (
              <div
                key={c.label}
                className={`rounded-[18px] p-6 border ${
                  c.accent
                    ? "bg-lp-ink border-lp-ink"
                    : "bg-lp-canvas border-lp-border lp-card-shadow-sm"
                }`}
              >
                <p
                  className={`font-display text-[30px] leading-none mb-1 ${c.accent ? "text-white" : "text-lp-ink"}`}
                >
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

      {/* ── A pergunta (editorial) ─────────────────────────────────────────── */}
      <section className="max-w-[1280px] mx-auto px-6 py-20 lg:py-28">
        <p className="text-[11px] font-medium text-lp-accent uppercase tracking-widest mb-8">capítulo iii · custo de oportunidade</p>
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
              Cada semana sem Otto são 10 deals que entram e saem sem análise
              real.
            </p>
          </div>
          <div className="border-l-2 pl-5" style={{ borderColor: "#1655E8" }}>
            <p className="text-[15.5px] text-lp-ink leading-relaxed font-medium">
              Cada mês sem Otto são mandatos fechados pelo concorrente que
              respondeu primeiro.
            </p>
          </div>
        </div>
      </section>

      {/* ── A solução ──────────────────────────────────────────────────────── */}
      <section className="bg-lp-fog border-y border-lp-border">
        <div className="max-w-[1280px] mx-auto px-6 py-20 lg:py-28">
          <div className="max-w-[640px] mb-14">
            <p className="text-[11px] font-medium text-lp-accent uppercase tracking-widest mb-4">capítulo iv · a solução</p>
            <h2 className="font-display text-[36px] sm:text-[46px] leading-[1.08] tracking-tight text-lp-ink mb-5">
              Uma rede neural operacional
              <br />
              que{" "}
              <em style={{ fontStyle: "italic" }}>potencializa assessores.</em>
            </h2>
            <p className="text-[15.5px] text-lp-ink-2 leading-relaxed mb-4">
              Otto processa, analisa e estrutura operações de M&amp;A em até 40
              minutos — com compliance documentado, valuation sustentado e
              material pronto para o mercado.
            </p>
            <p className="text-[14.5px] text-lp-ink-3 leading-relaxed border-l-2 border-lp-border-strong pl-4">
              Otto não substitui profissionais. É camada de apoio operacional — organiza
              informação, cruza dados e amplia a capacidade de análise dos profissionais
              responsáveis pela decisão.
            </p>
          </div>
          <div className="grid sm:grid-cols-3 gap-5">
            {[
              {
                num: "01",
                title: "Velocidade real",
                body: "Até 40 minutos da submissão ao diagnóstico completo. Para mandatos urgentes, isso muda o resultado final.",
              },
              {
                num: "02",
                title: "Escala sem custo",
                body: "40+ deals analisáveis por mês com a mesma equipe. Escala sem contratação adicional, sem aumento de custo fixo.",
              },
              {
                num: "03",
                title: "Padrão institucional",
                body: "Material gerado com a identidade do escritório. Otto sai de cena no documento final.",
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

      {/* ── Comparativo ────────────────────────────────────────────────────── */}
      <section id="comparativo" className="max-w-[1280px] mx-auto px-6 py-20 lg:py-28">
        <div className="max-w-[540px] mb-12">
          <p className="text-[11px] font-medium text-lp-accent uppercase tracking-widest mb-4">capítulo v · comparativo</p>
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
      </section>

      {/* ── Pipeline ───────────────────────────────────────────────────────── */}
      <section id="como-funciona" className="bg-lp-fog border-y border-lp-border">
        <div className="max-w-[1280px] mx-auto px-6 py-20 lg:py-28">
          <div className="max-w-[540px] mb-12">
            <p className="text-[11px] font-medium text-lp-accent uppercase tracking-widest mb-4">capítulo vi · pipeline</p>
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
                num: "01 · intake",
                title: "Cadastro do ativo",
                body: "O assessor cadastra o deal e anexa documentos. Drive Intake lê e resume cada documento para preparar o pipeline.",
              },
              {
                num: "02 · orquestração",
                title: "Orquestração",
                body: "Otto Orquestra calcula o DRS, mapeia riscos materiais e define a estratégia que guiará a próxima fase.",
              },
              {
                num: "03 · análise",
                title: "Análise especializada",
                body: "Os nós da rede executam em paralelo. Cada um produz a sua leitura no domínio próprio.",
              },
              {
                num: "04 · saída",
                title: "Saída padronizada",
                body: "Blind Teaser e Sell-Side Pitchbook são gerados com a identidade do escritório que contratou.",
              },
            ].map((s) => (
              <div key={s.num} className="bg-lp-canvas rounded-[18px] p-6 border border-lp-border lp-card-shadow-sm">
                <p className="text-[10.5px] font-medium text-lp-ink-4 uppercase tracking-widest mb-3">{s.num}</p>
                <div className="h-px bg-lp-ink mb-4 w-8" />
                <h3 className="text-[15px] font-semibold text-lp-ink mb-2.5 leading-snug">{s.title}</h3>
                <p className="text-[13px] text-lp-ink-3 leading-relaxed">{s.body}</p>
              </div>
            ))}
          </div>

          <p className="font-display text-[20px] italic text-lp-ink-2 border-t border-lp-border pt-6">
            Otto sai de cena no documento final.
          </p>
        </div>
      </section>

      {/* ── Ganho operacional (R$6M–12M) ───────────────────────────────────── */}
      <section className="max-w-[1280px] mx-auto px-6 py-20 lg:py-28">
        <div className="grid lg:grid-cols-2 gap-16 items-start">
          <div>
            <p className="text-[11px] font-medium text-lp-accent uppercase tracking-widest mb-4">capítulo vii · ganho operacional</p>
            <h2 className="font-display text-[36px] sm:text-[46px] leading-[1.08] tracking-tight text-lp-ink mb-5">
              A mesma equipe.
              <br />
              <em style={{ fontStyle: "italic" }}>Quatro vezes mais capacidade.</em>
            </h2>
            <p className="text-[15.5px] text-lp-ink-2 leading-relaxed mb-8">
              Mesma entrada, 4× mais análise. +30 análises profundas por mês.
              Zero triagem manual. Sem contratação adicional.
            </p>
            <div className="bg-lp-ink rounded-[16px] p-6 text-white">
              <p className="font-display text-[44px] leading-none text-white mb-1">R$ 6M–12M</p>
              <p className="text-[12px] font-medium uppercase tracking-widest mb-3" style={{ color: "#7A92BE" }}>
                receita incremental anual
              </p>
              <p className="text-[13.5px] leading-relaxed" style={{ color: "#C8D4EC" }}>
                Sem contratar. Sem aumentar custo fixo. Com a mesma equipe que
                você já tem.
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
                  col.dark
                    ? "border-lp-accent-strong bg-lp-accent-soft"
                    : "border-lp-border bg-lp-fog"
                }`}
              >
                <p
                  className={`text-[11px] font-semibold uppercase tracking-wider mb-3 ${col.dark ? "text-lp-accent" : "text-lp-ink-3"}`}
                >
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
      </section>

      {/* ── Especialistas ──────────────────────────────────────────────────── */}
      <section id="especialistas" className="bg-lp-fog border-y border-lp-border">
        <div className="max-w-[1280px] mx-auto px-6 py-20 lg:py-28">
          <div className="text-center max-w-[600px] mx-auto mb-14">
            <p className="text-[11px] font-medium text-lp-accent uppercase tracking-widest mb-4">capítulo ix · rede neural</p>
            <h2 className="font-display text-[36px] sm:text-[46px] leading-[1.08] tracking-tight text-lp-ink mb-4">
              Nove inteligências em rede.
              <br />
              <em style={{ fontStyle: "italic" }}>Um único pipeline.</em>
            </h2>
            <p className="text-[15px] text-lp-ink-2 leading-relaxed">
              Cada inteligência atravessa o ativo com a precisão do seu domínio. As
              leituras se cruzam. O resultado é um relatório institucional padronizado.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {agentes.map((a) => (
              <article key={a.nome} className="bg-lp-canvas rounded-[18px] p-5 border border-lp-border lp-card-shadow-sm">
                <div className="flex items-center gap-2.5 mb-3">
                  <div className={`w-9 h-9 rounded-[10px] ${a.bg} grid place-items-center font-display font-normal text-[16px] text-lp-ink flex-shrink-0`}>
                    {a.initial}
                  </div>
                  <span className="text-[10px] font-medium text-lp-ink-4 uppercase tracking-widest">{a.tag}</span>
                </div>
                <p className="text-[13px] font-semibold text-lp-ink leading-snug mb-1.5">{a.nome}</p>
                <p className="text-[12.5px] text-lp-ink-3 leading-relaxed">{a.role}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ── Otto potencializa ──────────────────────────────────────────────── */}
      <section className="max-w-[1280px] mx-auto px-6 py-20 lg:py-28">
        <div className="max-w-[540px] mb-12">
          <p className="text-[11px] font-medium text-lp-accent uppercase tracking-widest mb-4">capítulo x · posicionamento</p>
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
              header: "Otto apoia",
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
                col.accent
                  ? "bg-lp-ink border-lp-ink"
                  : "bg-lp-canvas border-lp-border"
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
      </section>

      {/* ── Planos ─────────────────────────────────────────────────────────── */}
      <section id="planos" className="bg-lp-fog border-y border-lp-border">
        <div className="max-w-[1280px] mx-auto px-6 py-20 lg:py-28">
          <div className="text-center max-w-[540px] mx-auto mb-14">
            <p className="text-[11px] font-medium text-lp-accent uppercase tracking-widest mb-4">capítulo xi · contratação</p>
            <h2 className="font-display text-[36px] sm:text-[46px] leading-[1.08] tracking-tight text-lp-ink mb-4">
              Três modelos
              <br />
              de{" "}
              <em style={{ fontStyle: "italic" }}>contratação.</em>
            </h2>
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
                    <span className="text-[12px] text-lp-ink-3">{p.complemento}</span>
                  </div>
                  <p className="text-[12.5px] text-lp-ink-3 mt-2 leading-relaxed">{p.desc}</p>
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
          <p className="text-[11px] font-medium text-lp-accent uppercase tracking-widest mb-4">perguntas frequentes</p>
          <h2 className="font-display text-[36px] sm:text-[44px] leading-[1.1] tracking-tight text-lp-ink">
            Dúvidas{" "}
            <em style={{ fontStyle: "italic" }}>respondidas.</em>
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
          <p className="text-[11px] font-medium uppercase tracking-widest mb-6" style={{ color: "#4A6090" }}>
            capítulo xii · próximo passo
          </p>
          <h2
            className="font-display text-[44px] sm:text-[60px] lg:text-[72px] leading-[1.04] tracking-tight mb-6"
            style={{ color: "#EEF3FF" }}
          >
            Para conhecer
            <br />
            <em style={{ fontStyle: "italic", color: "#93B4F8" }}>Otto.</em>
          </h2>
          <p className="text-[16px] leading-relaxed max-w-[500px] mx-auto mb-10" style={{ color: "#7A92BE" }}>
            Solicite acesso à plataforma. Reservamos uma conversa inicial para
            entender o contexto do escritório antes de qualquer demonstração.
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
          <p className="text-[12px] mt-5" style={{ color: "#334560" }}>
            1.426 transações de M&amp;A no Brasil em 2024 · Fonte: TTR / Kroll Brazil M&amp;A Report
          </p>
        </div>
      </section>

      {/* ── Footer ─────────────────────────────────────────────────────────── */}
      <footer className="border-t" style={{ background: "#040811", borderColor: "#1E2E4A" }}>
        <div className="max-w-[1280px] mx-auto px-6 py-12">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
            <div className="col-span-2 md:col-span-1">
              <div className="flex items-center gap-2.5 mb-3">
                <div className="w-7 h-7 rounded-lg bg-lp-accent grid place-items-center font-display italic font-normal text-[15px] text-white">o</div>
                <span className="font-display text-[19px] tracking-tight" style={{ color: "#EEF3FF" }}>Otto</span>
                <span className="text-[11px] tracking-wide uppercase" style={{ color: "#4A6090" }}>by RR7x</span>
              </div>
              <p className="text-[12px] leading-relaxed mb-3" style={{ color: "#4A6090" }}>
                Rede neural operacional para escritórios de M&amp;A e estruturação.
              </p>
              <a href="mailto:gestor@renanregonato.com.br" className="text-[12px] hover:underline" style={{ color: "#7A92BE" }}>
                gestor@renanregonato.com.br
              </a>
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-widest mb-3" style={{ color: "#4A6090" }}>Produto</p>
              <ul className="space-y-2">
                {[
                  { label: "Como funciona", href: "#como-funciona" },
                  { label: "Comparativo",   href: "#comparativo" },
                  { label: "Especialistas", href: "#especialistas" },
                  { label: "Planos",        href: "#planos" },
                ].map((l) => (
                  <li key={l.label}>
                    <Link href={l.href} className="text-[13px] hover:underline" style={{ color: "#6B82A8" }}>{l.label}</Link>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-widest mb-3" style={{ color: "#4A6090" }}>Recursos</p>
              <ul className="space-y-2">
                {[
                  { label: "Blog",   href: "/blog" },
                  { label: "Entrar", href: "/auth/login" },
                ].map((l) => (
                  <li key={l.label}>
                    <Link href={l.href} className="text-[13px] hover:underline" style={{ color: "#6B82A8" }}>{l.label}</Link>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-widest mb-3" style={{ color: "#4A6090" }}>RR7x Capital Hub</p>
              <ul className="space-y-2">
                <li>
                  <a href="mailto:gestor@renanregonato.com.br" className="text-[13px] hover:underline" style={{ color: "#6B82A8" }}>Contato</a>
                </li>
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
