import type { Metadata } from "next";
import { Inter, DM_Serif_Display, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import ScrollObserver from "@/components/ScrollObserver";

const inter = Inter({
  subsets: ["latin"],
  variable: "--inter",
});

const dmSerifDisplay = DM_Serif_Display({
  weight: ["400"],
  style: ["normal", "italic"],
  subsets: ["latin"],
  variable: "--dm-serif-display",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--jetbrains-mono",
});

const SITE_URL = "https://rr7x-portal.vercel.app";
const SITE_NAME = "Otto by RR7x";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME} — Deal Intelligence para M&A e Crédito Estruturado`,
    template: `%s | ${SITE_NAME}`,
  },
  description:
    "9 especialistas em IA executando em paralelo. Diagnóstico financeiro completo de ativos em 90 minutos — DRS, DRE normalizada, EBITDA ajustado, valuation, análise de M&A, estruturação de crédito, contratos, blind teaser e pitchbook.",
  keywords: [
    "M&A",
    "crédito estruturado",
    "deal intelligence",
    "análise financeira",
    "fusões e aquisições",
    "EBITDA",
    "valuation",
    "deal readiness score",
    "DRS",
    "diagnóstico financeiro",
    "assessoria M&A",
    "capital hub",
    "private equity",
  ],
  authors: [{ name: "RR7x Capital Hub" }],
  creator: "RR7x Capital Hub",
  publisher: "RR7x Capital Hub",
  openGraph: {
    type: "website",
    locale: "pt_BR",
    url: SITE_URL,
    siteName: SITE_NAME,
    title: `${SITE_NAME} — Deal Intelligence para M&A e Crédito Estruturado`,
    description:
      "9 especialistas em IA em paralelo. Diagnóstico completo de ativos em 90 minutos.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Otto by RR7x — Deal Intelligence",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE_NAME} — Deal Intelligence`,
    description: "9 especialistas em IA. Diagnóstico completo em 90 minutos.",
    images: ["/og-image.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  alternates: {
    canonical: SITE_URL,
  },
  verification: {
    google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION,
  },
};

const schemaOrg = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": `${SITE_URL}/#organization`,
      name: SITE_NAME,
      url: SITE_URL,
      logo: {
        "@type": "ImageObject",
        url: `${SITE_URL}/logo.png`,
      },
      description:
        "Deal Intelligence para escritórios de M&A e Crédito Estruturado.",
      contactPoint: {
        "@type": "ContactPoint",
        email: "gestor@renanregonato.com.br",
        contactType: "customer service",
        availableLanguage: "Portuguese",
      },
      sameAs: [],
    },
    {
      "@type": "WebSite",
      "@id": `${SITE_URL}/#website`,
      url: SITE_URL,
      name: SITE_NAME,
      publisher: { "@id": `${SITE_URL}/#organization` },
      inLanguage: "pt-BR",
    },
    {
      "@type": "SoftwareApplication",
      "@id": `${SITE_URL}/#software`,
      name: "Otto Deal Intelligence",
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web",
      description:
        "Plataforma de Deal Intelligence com 9 agentes de IA especializados que executam em paralelo para entregar diagnóstico financeiro completo de ativos em 90 minutos.",
      offers: [
        {
          "@type": "Offer",
          name: "Avulso",
          price: "2500",
          priceCurrency: "BRL",
          description: "1 análise completa por análise",
        },
        {
          "@type": "Offer",
          name: "Recorrente",
          price: "8000",
          priceCurrency: "BRL",
          priceSpecification: {
            "@type": "UnitPriceSpecification",
            billingDuration: "P1M",
          },
        },
      ],
      publisher: { "@id": `${SITE_URL}/#organization` },
    },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className="h-full">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schemaOrg) }}
        />
      </head>
      <body
        className={`${inter.variable} ${dmSerifDisplay.variable} ${jetbrainsMono.variable} min-h-full bg-bg text-ink font-sans antialiased`}
      >
        <ScrollObserver />
        {children}
      </body>
    </html>
  );
}
