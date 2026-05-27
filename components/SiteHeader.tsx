import Link from "next/link";

// Cabeçalho institucional compartilhado pela home e pelas páginas de marketing
// (/reforma-tributaria, /invest-match). Links absolutos a partir de "/" para
// funcionarem de qualquer página. Os módulos apontam para as páginas dedicadas.
export default function SiteHeader() {
  const links = [
    { href: "/#inteligencias",     label: "A rede"             },
    { href: "/reforma-tributaria", label: "Reforma Tributária" },
    { href: "/invest-match",       label: "Invest Match"       },
    { href: "/#planos",            label: "Planos"             },
    { href: "/blog",               label: "Blog"               },
  ];

  return (
    <header
      className="sticky top-0 z-50 border-b border-lp-border"
      style={{ background: "rgba(255,255,255,0.92)", backdropFilter: "blur(12px)" }}
    >
      <nav
        className="max-w-[1280px] mx-auto px-6 h-16 flex items-center justify-between"
        aria-label="Navegação principal"
      >
        <Link href="/" className="flex items-center" aria-label="Mandor, página inicial">
          <img src="/logo/mandor-horizontal.svg" alt="Mandor" height={32} width={104} className="h-8 w-auto" />
        </Link>

        <ul className="hidden md:flex items-center gap-1 text-[13.5px] text-lp-ink-2">
          {links.map((l) => (
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
  );
}
