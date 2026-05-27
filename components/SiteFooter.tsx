import Link from "next/link";

// Rodapé institucional compartilhado pela home e pelas páginas de marketing.
// Links absolutos para funcionarem de qualquer página.
export default function SiteFooter() {
  const produto = [
    { label: "A rede cognitiva",    href: "/#inteligencias"     },
    { label: "Reforma Tributária",  href: "/reforma-tributaria" },
    { label: "Invest Match",        href: "/invest-match"       },
    { label: "Como funciona",       href: "/#como-funciona"     },
    { label: "Planos",              href: "/#planos"            },
  ];
  const recursos = [
    { label: "Blog",        href: "/blog"        },
    { label: "Entrar",      href: "/auth/login"  },
    { label: "Criar conta", href: "/auth/signup" },
  ];
  const legal = [
    { label: "Política de Privacidade", href: "/privacidade" },
    { label: "Termos de Uso",           href: "/termos"      },
    { label: "Contato",                 href: "/contato"     },
  ];

  return (
    <footer className="border-t" style={{ background: "#040811", borderColor: "#1E2E4A" }}>
      <div className="max-w-[1280px] mx-auto px-6 py-14">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8 mb-12">
          {/* Brand */}
          <div className="col-span-2">
            <div className="mb-3">
              <img src="/logo/mandor-horizontal-dark.svg" alt="Mandor" className="h-7 w-auto" />
            </div>
            <p className="text-[12px] leading-relaxed mb-3 max-w-[240px]" style={{ color: "#4A6090" }}>
              Inteligência institucional para M&amp;A, crédito estruturado e preparação de deals.
            </p>
            <a href="mailto:mandor@rr7x.com.br" className="text-[12px] hover:underline block" style={{ color: "#7A92BE" }}>
              mandor@rr7x.com.br
            </a>
            <a
              href="https://www.instagram.com/mandor.deals/"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Instagram da Mandor (@mandor.deals)"
              className="inline-flex items-center gap-2 mt-4 text-[12px] hover:underline"
              style={{ color: "#7A92BE" }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
                <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
              </svg>
              @mandor.deals
            </a>
          </div>

          {/* Produto */}
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-widest mb-3" style={{ color: "#4A6090" }}>Produto</p>
            <ul className="space-y-2">
              {produto.map((l) => (
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
              {recursos.map((l) => (
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
              {legal.map((l) => (
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
            &ldquo;O ativo certo, para o comprador certo, no timing certo.&rdquo;
          </p>
        </div>
      </div>
    </footer>
  );
}
