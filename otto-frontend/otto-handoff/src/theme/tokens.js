/**
 * Otto Design Tokens
 * ==================
 *
 * Fonte única da verdade do sistema visual. Importado por:
 *   - tailwind.config.js   → expõe como classes Tailwind
 *   - src/theme/global.css → expõe como CSS custom properties
 *   - componentes pontuais que precisam dos valores em runtime
 *     (ex.: cores derivadas para SVG ou inline-style)
 *
 * Princípios:
 *  - Off-white quente como background base (não branco puro).
 *  - Coral/pêssego como acento — quente, premium, com personalidade.
 *  - Tipografia editorial (Fraunces) para títulos; Inter para UI.
 *  - oklch() em todas as cores — controle perceptual de luminosidade.
 */

// ─────────────────────────────────────────────────────────
// Cores
// ─────────────────────────────────────────────────────────
export const colors = {
  // Backgrounds e superfícies
  bg:               'oklch(0.985 0.005 60)',   // off-white quente — fundo da app
  'bg-tint':        'oklch(0.97 0.012 50)',    // tinted areas (cards internos, panels)
  surface:          'oklch(1 0 0)',             // branco puro — cards principais
  'surface-2':      'oklch(0.975 0.006 60)',   // hover states e inputs
  'surface-hover':  'oklch(0.96 0.01 50)',

  // Bordas
  border:           'oklch(0.92 0.008 60)',
  'border-strong':  'oklch(0.86 0.01 55)',

  // Texto (3 níveis de hierarquia)
  ink:    'oklch(0.22 0.01 50)',  // texto primário
  'ink-2':'oklch(0.45 0.01 50)',  // texto secundário
  'ink-3':'oklch(0.62 0.01 50)',  // texto terciário (placeholders, metadados)

  // Acento — coral/pêssego
  accent: {
    soft:    'oklch(0.93 0.04 40)',    // backgrounds suaves do acento
    DEFAULT: 'oklch(0.78 0.09 35)',    // brand color
    strong:  'oklch(0.66 0.14 32)',    // CTAs principais
    ink:     'oklch(0.32 0.08 35)',    // texto sobre acento suave
  },

  // Semânticas
  ok:   { soft: 'oklch(0.94 0.04 155)',  DEFAULT: 'oklch(0.6 0.1 155)'  },  // verde/financeiro
  warn: { soft: 'oklch(0.95 0.05 80)',   DEFAULT: 'oklch(0.7 0.13 75)'  },  // âmbar/atenção
  info: { soft: 'oklch(0.95 0.025 240)', DEFAULT: 'oklch(0.6 0.08 240)' },  // azul/informativo

  // Tints para thumbs e agent marks (paleta dos 9 especialistas)
  peach: 'oklch(0.93 0.04 40)',   // Otto, Victor (originador)
  sage:  'oklch(0.93 0.03 155)',  // Davi (financeiro), Estela (estrutura)
  sand:  'oklch(0.94 0.03 75)',   // Arthur (M&A), Paulo (preparo)
  sky:   'oklch(0.93 0.03 230)',  // Pedro (mercado), Rafael (revisão)
  lilac: 'oklch(0.93 0.03 300)',  // Clara (jurídico)
  cream: 'oklch(0.95 0.025 90)',  // outputs neutros
};

// ─────────────────────────────────────────────────────────
// Tipografia
// ─────────────────────────────────────────────────────────
export const fontFamily = {
  display: ['Fraunces', 'Times New Roman', 'serif'],   // títulos editoriais
  sans:    ['Inter', 'system-ui', 'sans-serif'],        // UI / corpo
  mono:    ['JetBrains Mono', 'ui-monospace', 'monospace'], // números, IDs, logs
};

// ─────────────────────────────────────────────────────────
// Sombras (tom quente, baseadas em oklch)
// ─────────────────────────────────────────────────────────
export const boxShadow = {
  'soft-sm': '0 1px 2px oklch(0.2 0.01 50 / 0.04)',
  'soft-md': '0 2px 6px oklch(0.2 0.01 50 / 0.05), 0 1px 2px oklch(0.2 0.01 50 / 0.04)',
  'soft-lg': '0 12px 32px oklch(0.2 0.01 50 / 0.07), 0 2px 6px oklch(0.2 0.01 50 / 0.05)',
};

// ─────────────────────────────────────────────────────────
// Border radius scale
// ─────────────────────────────────────────────────────────
export const borderRadius = {
  // mantém defaults do Tailwind, adiciona escala Otto
  'otto-sm': '6px',
  'otto-md': '10px',
  'otto-lg': '14px',
  'otto-xl': '20px',
};

// ─────────────────────────────────────────────────────────
// Animações
// ─────────────────────────────────────────────────────────
export const keyframes = {
  'pulse-ring': {
    '0%':   { transform: 'scale(0.95)', opacity: '0.8' },
    '100%': { transform: 'scale(1.15)', opacity: '0' },
  },
};

export const animation = {
  'pulse-ring': 'pulse-ring 1.4s ease-out infinite',
};

// ─────────────────────────────────────────────────────────
// Spacing scale (apenas referência — Tailwind default cobre)
// ─────────────────────────────────────────────────────────
export const spacing = {
  // Margens e paddings padronizados
  'panel': '22px',      // padding interno de painéis
  'screen-x': '32px',   // gutter horizontal de telas
  'screen-y': '28px',   // gutter vertical de telas
};
