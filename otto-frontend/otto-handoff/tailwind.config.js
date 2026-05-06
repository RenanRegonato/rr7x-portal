/** @type {import('tailwindcss').Config} */
import { colors, fontFamily, boxShadow, keyframes, animation, borderRadius } from './src/theme/tokens.js';

export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors,
      fontFamily,
      boxShadow,
      keyframes,
      animation,
      borderRadius,
    },
  },
  plugins: [],
};
