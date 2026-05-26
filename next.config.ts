import type { NextConfig } from "next";

const securityHeaders = [
  // Prevent MIME-type sniffing
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  // Deny framing to prevent clickjacking
  { key: 'X-Frame-Options', value: 'DENY' },
  // Enable legacy XSS filter in older browsers
  { key: 'X-XSS-Protection', value: '1; mode=block' },
  // Force HTTPS for 1 year, include subdomains
  { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains; preload' },
  // Limit referrer info sent to third parties
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  // Disable unused browser features
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=()' },
  // Content Security Policy
  // - 'unsafe-inline' kept for Next.js inline styles/scripts; tighten with nonces in a future sprint
  // - Supabase, Stripe and Anthropic domains explicitly allowed
  // - Google Tag Manager + Google Analytics (GA4) domains allowed for site analytics
  // - Meta Pixel (connect.facebook.net / facebook.com) and Google Ads
  //   (googleadservices.com / *.doubleclick.net) allowed for marketing tags via GTM
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com https://www.googletagmanager.com https://connect.facebook.net https://www.googleadservices.com https://googleads.g.doubleclick.net",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https://*.supabase.co https://stripe.com https://www.googletagmanager.com https://www.google-analytics.com https://*.google-analytics.com https://*.g.doubleclick.net https://www.facebook.com https://www.googleadservices.com https://www.google.com",
      "font-src 'self' data:",
      "connect-src 'self' https://*.supabase.co https://api.anthropic.com https://api.stripe.com https://api.resend.com https://www.googletagmanager.com https://www.google-analytics.com https://*.google-analytics.com https://*.analytics.google.com https://*.g.doubleclick.net https://www.facebook.com https://www.googleadservices.com https://www.google.com",
      "frame-src https://js.stripe.com https://hooks.stripe.com https://www.googletagmanager.com https://td.doubleclick.net https://*.g.doubleclick.net https://www.facebook.com",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self' https://www.facebook.com",
      "upgrade-insecure-requests",
    ].join('; '),
  },
]

const nextConfig: NextConfig = {
  // Pacotes server-only que devem ficar como CJS externo (sem bundling).
  // voyageai e @mistralai/mistralai são ESM com imports sem extensão que o Webpack do
  // Next.js não resolve. pdf-parse, mammoth e xlsx são puros runtime Node com bindings
  // não-bundláveis. inngest entra junto pra não tentar bundlar handlers do worker.
  serverExternalPackages: [
    '@mistralai/mistralai',
    'pdf-parse',
    'mammoth',
    'xlsx',
    'inngest',
  ],
  async headers() {
    return [
      {
        source: '/:path*',
        headers: securityHeaders,
      },
    ]
  },
};

export default nextConfig;
