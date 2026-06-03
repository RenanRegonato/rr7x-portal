"use client";

import Link from "next/link";
import { useState } from "react";

// Cabeçalho institucional compartilhado pela home e pelas páginas de marketing
// (/reforma-tributaria, /invest-match). Links absolutos a partir de "/" para
// funcionarem de qualquer página. No mobile, abre um menu (hambúrguer).
const LINKS = [
  { href: "/#inteligencias",     label: "A rede"             },
  { href: "/reforma-tributaria", label: "Reforma Tributária" },
  { href: "/invest-match",       label: "Invest Match"       },
  { href: "/#planos",            label: "Planos"             },
  { href: "/blog",               label: "Blog"               },
];

export default function SiteHeader() {
  const [open, setOpen] = useState(false);

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

        {/* Desktop nav */}
        <ul className="hidden md:flex items-center gap-1 text-[13.5px] text-lp-ink-2">
          {LINKS.map((l) => (
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
            style={{ background: "#8C6F45" }}
          >
            Solicitar acesso
          </Link>

          {/* Hambúrguer (mobile) */}
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="md:hidden flex items-center justify-center w-10 h-10 -mr-2 rounded-lg text-lp-ink hover:bg-lp-fog transition-colors"
            aria-label={open ? "Fechar menu" : "Abrir menu"}
            aria-expanded={open}
            aria-controls="mobile-menu"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              {open ? (
                <>
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </>
              ) : (
                <>
                  <line x1="3" y1="6" x2="21" y2="6" />
                  <line x1="3" y1="12" x2="21" y2="12" />
                  <line x1="3" y1="18" x2="21" y2="18" />
                </>
              )}
            </svg>
          </button>
        </div>
      </nav>

      {/* Menu mobile */}
      {open && (
        <div id="mobile-menu" className="md:hidden border-t border-lp-border bg-lp-canvas">
          <ul className="px-6 py-3">
            {LINKS.map((l) => (
              <li key={l.label}>
                <Link
                  href={l.href}
                  onClick={() => setOpen(false)}
                  className="block py-3 text-[15px] text-lp-ink border-b border-lp-border-subtle last:border-0"
                >
                  {l.label}
                </Link>
              </li>
            ))}
            <li>
              <Link
                href="/auth/login"
                onClick={() => setOpen(false)}
                className="block py-3 text-[15px] font-medium"
                style={{ color: "#8C6F45" }}
              >
                Entrar
              </Link>
            </li>
          </ul>
        </div>
      )}
    </header>
  );
}
