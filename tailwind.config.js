/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./*.html",
    "./assets/js/**/*.js"
  ],
  theme: {
    extend: {
      fontFamily: {
        heading: ['Montserrat', 'system-ui', 'sans-serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        // Direct brand color shortcuts
        'brand-black': '#151515',
        'brand-pink': '#F02AA8',
        'brand-lime': '#B7F52A',
        'brand-ice': '#67DDF2',

        // Nested brand object (for bg-brand-pink, text-brand-ice, etc.)
        brand: {
          charcoal: '#111317',
          navy: '#17243B',
          pink: '#F02AA8',
          ice: '#67DDF2',
          lime: '#B7F52A',
        },

        // Navy palette
        navy: {
          DEFAULT: '#17243B',
          50: '#f0f5fa',
          100: '#dce6f2',
          200: '#bccfe5',
          300: '#94b2d4',
          400: '#648fbe',
          500: '#4372a7',
          600: '#32598b',
          700: '#274670',
          800: '#1f304f',
          900: '#17243B',
          950: '#0b111c',
        },

        // Charcoal palette
        charcoal: {
          DEFAULT: '#111317',
          700: '#232730',
          800: '#1a1d24',
          850: '#15171d',
          900: '#111317',
          950: '#0b0c0e',
        },

        // Ice palette
        ice: {
          DEFAULT: '#67DDF2',
          light: '#bbf2fc',
          hover: '#52d0e7',
          dark: '#23a8c2',
        },

        // Lime palette
        lime: {
          DEFAULT: '#B7F52A',
          light: '#d2f96e',
          hover: '#a6e81e',
          dark: '#85be0b',
        },

        // Pink palette
        pink: {
          DEFAULT: '#F02AA8',
          light: '#fa45b8',
          hover: '#d81691',
          dark: '#b50a74',
        },

        // Neon palette (from programs.html)
        neon: {
          green: '#39ff14',
          lime: '#4ade80',
          cyan: '#00e5ff',
          sky: '#38bdf8',
          pink: '#ff007f',
          magenta: '#ec4899',
        },

        // Dark palette (from programs.html)
        dark: {
          950: '#060709',
          900: '#0d0f14',
          800: '#141820',
          700: '#1e2430',
        },
      },
    },
  },
  plugins: [],
}
