'use client'

import Link from "next/link";
import { useState } from "react";

export default function ContatoPage() {
  const [form, setForm] = useState({ nome: "", email: "", escritorio: "", assunto: "", mensagem: "", website: "" });
  const [enviado, setEnviado] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState("");

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setEnviando(true);
    setErro("");
    try {
      const res = await fetch("/api/contato", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        setEnviado(true);
        setForm({ nome: "", email: "", escritorio: "", assunto: "", mensagem: "", website: "" });
      } else {
        const d = await res.json().catch(() => ({}));
        setErro(d.error ?? "Não foi possível enviar. Tente novamente.");
      }
    } catch {
      setErro("Falha de conexão. Tente novamente.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="bg-lp-canvas text-lp-ink font-sans antialiased min-h-screen">
      {/* Navbar */}
      <header
        className="sticky top-0 z-50 border-b border-lp-border"
        style={{ background: "rgba(255,255,255,0.92)", backdropFilter: "blur(12px)" }}
      >
        <nav className="max-w-[1280px] mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center">
            <img src="/logo/mandor-horizontal.svg" alt="Mandor" className="h-7 w-auto" />
          </Link>
          <div className="flex items-center gap-2">
            <Link href="/auth/login" className="hidden sm:block text-[13px] text-lp-ink-2 hover:text-lp-ink px-4 py-2 transition-colors">
              Entrar
            </Link>
            <Link href="/auth/signup" className="text-[13px] font-medium text-white px-4 py-2 rounded-[9px] hover:opacity-90" style={{ background: "#8C6F45" }}>
              Solicitar acesso
            </Link>
          </div>
        </nav>
      </header>

      {/* Header */}
      <section className="border-b border-lp-border bg-lp-fog">
        <div className="max-w-[1280px] mx-auto px-6 py-14 lg:py-20">
          <p className="text-[11.5px] font-medium text-lp-accent uppercase tracking-widest mb-4">Fale conosco</p>
          <h1 className="font-display text-[40px] sm:text-[52px] leading-[1.1] tracking-tight text-lp-ink mb-4">
            Como podemos
            <br />
            <em style={{ fontStyle: "italic" }}>ajudar?</em>
          </h1>
          <p className="text-[15.5px] text-lp-ink-2 max-w-[480px] leading-relaxed">
            Tire dúvidas, solicite demonstração ou converse com nossa equipe sobre como a Mandor se encaixa no fluxo do seu escritório.
          </p>
        </div>
      </section>

      {/* Content */}
      <main className="max-w-[1280px] mx-auto px-6 py-14 lg:py-20">
        <div className="grid lg:grid-cols-[1fr_420px] gap-16">

          {/* Form */}
          <div>
            {enviado ? (
              <div className="bg-surface border border-border rounded-[16px] p-10 text-center max-w-[480px]">
                <div className="w-12 h-12 rounded-full bg-ok/10 grid place-items-center mx-auto mb-4">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-ok">
                    <path d="M20 6L9 17l-5-5" />
                  </svg>
                </div>
                <h2 className="font-display text-[22px] font-medium mb-2">Mensagem enviada!</h2>
                <p className="text-lp-ink-2 text-[14px] mb-6">
                  Recebemos sua mensagem e retornaremos em até 1 dia útil.
                </p>
                <button
                  onClick={() => setEnviado(false)}
                  className="text-[13px] text-lp-accent hover:underline font-medium"
                >
                  Enviar outra mensagem
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5 max-w-[560px]">
                {/* Honeypot anti-spam (oculto para humanos) */}
                <input
                  type="text"
                  name="website"
                  value={form.website}
                  onChange={handleChange}
                  tabIndex={-1}
                  autoComplete="off"
                  aria-hidden="true"
                  style={{ position: "absolute", left: "-9999px", width: 1, height: 1, opacity: 0 }}
                />
                <div className="grid sm:grid-cols-2 gap-5">
                  <Field label="Nome completo" name="nome" placeholder="Seu nome" value={form.nome} onChange={handleChange} required />
                  <Field label="Email profissional" name="email" type="email" placeholder="seu@escritorio.com.br" value={form.email} onChange={handleChange} required />
                </div>
                <Field label="Escritório / empresa" name="escritorio" placeholder="Nome do escritório ou empresa" value={form.escritorio} onChange={handleChange} />
                <div>
                  <label className="block text-[12px] font-medium text-lp-ink-2 mb-1.5">Assunto</label>
                  <select
                    name="assunto"
                    value={form.assunto}
                    onChange={handleChange}
                    className="w-full border border-lp-border rounded-[10px] px-3 py-2.5 text-[13px] bg-lp-canvas outline-none transition-shadow focus:border-lp-accent focus:shadow-[0_0_0_3px_oklch(0.93_0.04_240)] text-lp-ink"
                  >
                    <option value="">Selecione o assunto…</option>
                    <option value="Quero conhecer a Mandor: Solicitar demonstração">Solicitar demonstração</option>
                    <option value="Dúvida sobre planos e preços">Dúvida sobre planos e preços</option>
                    <option value="Suporte técnico">Suporte técnico</option>
                    <option value="Parceria ou integração">Parceria ou integração</option>
                    <option value="Privacidade e dados">Privacidade e dados</option>
                    <option value="Outro assunto">Outro</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[12px] font-medium text-lp-ink-2 mb-1.5">Mensagem</label>
                  <textarea
                    name="mensagem"
                    value={form.mensagem}
                    onChange={handleChange}
                    required
                    rows={5}
                    placeholder="Descreva como podemos ajudar…"
                    className="w-full border border-lp-border rounded-[10px] px-3 py-2.5 text-[13px] bg-lp-canvas outline-none transition-shadow focus:border-lp-accent focus:shadow-[0_0_0_3px_oklch(0.93_0.04_240)] placeholder:text-lp-ink-3 resize-none"
                  />
                </div>
                {erro && (
                  <p className="text-[13px] text-[oklch(0.55_0.18_25)]">{erro}</p>
                )}
                <button
                  type="submit"
                  disabled={enviando}
                  className="w-full text-[13px] font-semibold text-white py-3 rounded-[10px] hover:opacity-90 transition disabled:opacity-60"
                  style={{ background: "#8C6F45" }}
                >
                  {enviando ? "Enviando…" : "Enviar mensagem →"}
                </button>
                <p className="text-[11.5px] text-lp-ink-3 text-center">
                  Respondemos em até 1 dia útil · Sem spam · Dados protegidos conforme{" "}
                  <Link href="/privacidade" className="underline hover:text-lp-ink">nossa política</Link>
                </p>
              </form>
            )}
          </div>

          {/* Sidebar info */}
          <div className="space-y-8 lg:pt-2">
            <ContactCard
              icon={
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                  <path d="M22 6l-10 7L2 6" />
                </svg>
              }
              title="Email direto"
              content="mandor@rr7x.com.br"
              href="mailto:mandor@rr7x.com.br"
            />
            <ContactCard
              icon={
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 8v4l3 3" />
                </svg>
              }
              title="Tempo de resposta"
              content="Até 1 dia útil para todas as mensagens"
            />
            <ContactCard
              icon={
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
              }
              title="Demonstração"
              content="Agende uma conversa para entender como a Mandor se encaixa no fluxo do seu escritório."
              href="/auth/signup"
              cta="Solicitar acesso →"
            />

            <div className="bg-lp-fog border border-lp-border rounded-[14px] p-6">
              <p className="text-[12px] font-semibold text-lp-ink-3 uppercase tracking-wider mb-4">Links úteis</p>
              <ul className="space-y-2.5">
                {[
                  { label: "Política de Privacidade", href: "/privacidade" },
                  { label: "Termos de Uso", href: "/termos" },
                  { label: "Blog · M&A e Deal Intelligence", href: "/blog" },
                  { label: "Criar conta", href: "/auth/signup" },
                ].map((l) => (
                  <li key={l.label}>
                    <Link href={l.href} className="text-[13px] text-lp-ink-2 hover:text-lp-accent transition-colors flex items-center gap-1.5">
                      <span className="text-lp-ink-3">→</span> {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-lp-border mt-4">
        <div className="max-w-[1280px] mx-auto px-6 py-10 flex flex-col sm:flex-row items-center justify-between gap-4">
          <Link href="/">
            <img src="/logo/mandor-horizontal.svg" alt="Mandor" className="h-6 w-auto opacity-60 hover:opacity-100 transition-opacity" />
          </Link>
          <div className="flex items-center gap-6 text-[12px] text-lp-ink-3">
            <Link href="/privacidade" className="hover:text-lp-ink transition-colors">Privacidade</Link>
            <Link href="/termos" className="hover:text-lp-ink transition-colors">Termos de Uso</Link>
            <Link href="/contato" className="hover:text-lp-ink transition-colors">Contato</Link>
          </div>
          <p className="text-[12px] text-lp-ink-3">© {new Date().getFullYear()} RR7x Capital Hub</p>
        </div>
      </footer>
    </div>
  );
}

function Field({
  label, name, placeholder, value, onChange, type = "text", required = false,
}: {
  label: string; name: string; placeholder: string; value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  type?: string; required?: boolean;
}) {
  return (
    <div>
      <label className="block text-[12px] font-medium text-lp-ink-2 mb-1.5">{label}</label>
      <input
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        required={required}
        placeholder={placeholder}
        className="w-full border border-lp-border rounded-[10px] px-3 py-2.5 text-[13px] bg-lp-canvas outline-none transition-shadow focus:border-lp-accent focus:shadow-[0_0_0_3px_oklch(0.93_0.04_240)] placeholder:text-lp-ink-3"
      />
    </div>
  );
}

function ContactCard({
  icon, title, content, href, cta,
}: {
  icon: React.ReactNode; title: string; content: string; href?: string; cta?: string;
}) {
  return (
    <div className="flex gap-4">
      <div className="w-10 h-10 rounded-[10px] bg-lp-fog border border-lp-border flex items-center justify-center flex-shrink-0 text-lp-accent">
        {icon}
      </div>
      <div>
        <p className="text-[13px] font-semibold text-lp-ink mb-0.5">{title}</p>
        {href && !cta ? (
          <a href={href} className="text-[13px] text-lp-accent hover:underline">{content}</a>
        ) : (
          <p className="text-[13px] text-lp-ink-2">{content}</p>
        )}
        {cta && href && (
          <Link href={href} className="text-[12.5px] text-lp-accent hover:underline font-medium mt-1 inline-block">{cta}</Link>
        )}
      </div>
    </div>
  );
}
