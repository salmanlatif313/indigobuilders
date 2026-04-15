/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"IBM Plex Sans Arabic"', '"IBM Plex Sans"', 'sans-serif'],
      },
      colors: {
        brand: {
          50:  '#e8edf5',
          100: '#c5d0e0',
          200: '#a2b3cb',
          300: '#7f96b6',
          400: '#4a6a94',
          500: '#1a3a6a',
          600: '#152f57',
          700: '#102444',
          800: '#0c1b33',
          900: '#0f2040',   /* Primary INDIGO navy — matches brand kit */
        },
        gold: {
          300: '#e8c96a',
          400: '#d4b04a',
          500: '#c9a028',   /* Primary GOLD — matches brand kit */
          600: '#a8841f',
          700: '#876818',
        },
      },
    },
  },
  plugins: [],
};
