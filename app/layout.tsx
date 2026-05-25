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

const SITE_URL = "https://www.mandor.com.br";
const SITE_NAME = "Mandor";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME} · Deal Intelligence para M&A e Crédito Estruturado`,
    template: `%s | ${SITE_NAME}`,
  },
  description:
    "10 especialistas em IA executando em paralelo. Diagnóstico financeiro completo de ativos em até 90 minutos: DRS, DRE normalizada, EBITDA ajustado, valuation, análise de M&A, estruturação de crédito, contratos, blind teaser e pitchbook.",
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
    title: `${SITE_NAME} · Deal Intelligence para M&A e Crédito Estruturado`,
    description:
      "10 especialistas em IA em paralelo. Diagnóstico completo de ativos em até 90 minutos.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Mandor · Deal Intelligence",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE_NAME} · Deal Intelligence`,
    description: "10 especialistas em IA. Diagnóstico completo em até 90 minutos.",
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
    google: "71BOEBv7282QZv_040m2hVCdzHZkm65UMh3vh-WzHFA",
  },
};

const schemaOrg = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": `${SITE_URL}/#organization`,
      name: "Mandor",
      legalName: "RR7x Capital Hub",
      url: SITE_URL,
      logo: {
        "@type": "ImageObject",
        url: `${SITE_URL}/logo/mandor-horizontal.svg`,
        width: 600,
        height: 120,
      },
      image: `${SITE_URL}/opengraph-image`,
      description:
        "Plataforma de Deal Intelligence para escritórios de M&A, crédito estruturado e preparação de ativos para o mercado.",
      email: "mandor@rr7x.com.br",
      areaServed: {
        "@type": "Country",
        name: "Brasil",
      },
      founder: {
        "@type": "Person",
        name: "Renan Regonato",
      },
      parentOrganization: {
        "@type": "Organization",
        name: "RR7x Capital Hub",
      },
      contactPoint: {
        "@type": "ContactPoint",
        email: "mandor@rr7x.com.br",
        contactType: "customer support",
        availableLanguage: ["Portuguese"],
      },
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
      name: "Mandor · Deal Intelligence",
      applicationCategory: "BusinessApplication",
      applicationSubCategory: "Financial Analysis Software",
      operatingSystem: "Web",
      url: SITE_URL,
      description:
        "Plataforma de análise para M&A, crédito estruturado e preparação de ativos. Dez inteligências em paralelo entregam diagnóstico financeiro, valuation, Pitchbook e Blind Teaser em até 90 minutos.",
      softwareVersion: "1.0",
      publisher: { "@id": `${SITE_URL}/#organization` },
      featureList: [
        "Deal Readiness Score automatizado",
        "Diagnóstico financeiro com EBITDA ajustado",
        "Valuation por múltiplos e DCF",
        "Análise jurídica e mapa de riscos",
        "Estruturação de crédito (CRI, CRA, debêntures, securitização)",
        "Pipeline de compradores e originação",
        "Blind Teaser e Sell-Side Pitchbook white-label",
        "Exportação em PDF, Word e templates customizados",
        "Multi-tenancy com isolamento por escritório",
        "Conformidade LGPD",
      ],
      offers: [
        {
          "@type": "Offer",
          name: "Plano Pontual",
          description: "Análise avulsa sob demanda, sem fidelidade",
          price: "3500.00",
          priceCurrency: "BRL",
          availability: "https://schema.org/InStock",
          url: `${SITE_URL}/auth/signup`,
        },
        {
          "@type": "Offer",
          name: "Plano Institucional",
          description: "Até 20 análises mensais com onboarding assistido",
          price: "18000.00",
          priceCurrency: "BRL",
          availability: "https://schema.org/InStock",
          url: `${SITE_URL}/auth/signup`,
        },
        {
          "@type": "Offer",
          name: "Plano Corporativo",
          description:
            "Volume customizado para redes, fundos e estruturas com alto fluxo",
          priceCurrency: "BRL",
          availability: "https://schema.org/InStock",
          url: "mailto:mandor@rr7x.com.br",
        },
      ],
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
        {/* Google Tag Manager */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','GTM-5H453CLF');`,
          }}
        />
        {/* End Google Tag Manager */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schemaOrg) }}
        />
      </head>
      <body
        className={`${inter.variable} ${dmSerifDisplay.variable} ${jetbrainsMono.variable} min-h-full bg-bg text-ink font-sans antialiased`}
      >
        {/* Google Tag Manager (noscript) */}
        <noscript>
          <iframe
            src="https://www.googletagmanager.com/ns.html?id=GTM-5H453CLF"
            height="0"
            width="0"
            style={{ display: "none", visibility: "hidden" }}
            title="Google Tag Manager"
          />
        </noscript>
        {/* End Google Tag Manager (noscript) */}
        <ScrollObserver />
        {children}
      </body>
    </html>
  );
}
