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
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https://*.supabase.co https://stripe.com",
      "font-src 'self' data:",
      "connect-src 'self' https://*.supabase.co https://api.anthropic.com https://api.stripe.com https://api.resend.com",
      "frame-src https://js.stripe.com https://hooks.stripe.com",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
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
