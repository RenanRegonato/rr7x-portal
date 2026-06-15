import type { Metadata } from "next";
import { Newsreader, Hanken_Grotesk, Courier_Prime } from "next/font/google";
import "./globals.css";
import ScrollObserver from "@/components/ScrollObserver";

// Mandor Brand Book v1 — sistema tipográfico.
// Newsreader: serifa editorial (manchetes, corpo, pull quotes).
// Hanken Grotesk: sans funcional (CTAs, labels, navegação).
// Courier Prime: monospace documental (eyebrows, metadados, IDs, timestamps).
const newsreader = Newsreader({
  weight: ["300", "400", "500", "600"],
  style: ["normal", "italic"],
  subsets: ["latin"],
  variable: "--newsreader",
});

const hanken = Hanken_Grotesk({
  weight: ["400", "500", "600"],
  subsets: ["latin"],
  variable: "--hanken",
});

const courierPrime = Courier_Prime({
  weight: ["400", "700"],
  style: ["normal", "italic"],
  subsets: ["latin"],
  variable: "--courier",
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
    "Inteligência institucional para M&A e crédito estruturado: diagnóstico financeiro completo, rastreável e auditável, em até 90 minutos. DRS, DRE normalizada, EBITDA ajustado, valuation, análise de M&A, estruturação de crédito, adequação à Reforma Tributária, material de originação e o Mapa Inteligente do Mercado.",
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
  authors: [{ name: "Mandor" }],
  creator: "Mandor",
  publisher: "Mandor",
  openGraph: {
    type: "website",
    locale: "pt_BR",
    url: SITE_URL,
    siteName: SITE_NAME,
    title: `${SITE_NAME} · Deal Intelligence para M&A e Crédito Estruturado`,
    description:
      "Inteligência institucional para M&A e crédito. Diagnóstico completo, rastreável e auditável, em até 90 minutos.",
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
      legalName: "Mandor",
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
          name: "Plano Essential",
          description: "Parecer institucional completo: diligência, documentos de captação e Mapa do Mercado (consulta)",
          availability: "https://schema.org/InStock",
          url: `${SITE_URL}/auth/signup`,
        },
        {
          "@type": "Offer",
          name: "Plano Professional",
          description: "Reforma Tributária, Invest Match, Mapa completo e aprendizados do escritório",
          availability: "https://schema.org/InStock",
          url: `${SITE_URL}/auth/signup`,
        },
        {
          "@type": "Offer",
          name: "Plano Enterprise",
          description: "Rede de capital, API, SSO e governança avançada (recursos de rede em evolução)",
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
        {/* Meta Pixel */}
        <script
          dangerouslySetInnerHTML={{
            __html: `!function(f,b,e,v,n,t,s)
{if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};
if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];
s.parentNode.insertBefore(t,s)}(window,document,'script',
'https://connect.facebook.net/en_US/fbevents.js');
fbq('init', '962882463397887');
fbq('track', 'PageView');`,
          }}
        />
        {/* End Meta Pixel */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schemaOrg) }}
        />
      </head>
      <body
        className={`${newsreader.variable} ${hanken.variable} ${courierPrime.variable} min-h-full bg-bg text-ink font-sans antialiased`}
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
        {/* Meta Pixel (noscript) */}
        <noscript>
          <img
            height="1"
            width="1"
            style={{ display: "none" }}
            alt=""
            src="https://www.facebook.com/tr?id=962882463397887&ev=PageView&noscript=1"
          />
        </noscript>
        {/* End Meta Pixel (noscript) */}
        <ScrollObserver />
        {children}
      </body>
    </html>
  );
}
