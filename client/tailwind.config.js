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
          50:  '#e6ecf5',
          100: '#bfcfe6',
          200: '#96b0d6',
          300: '#6d91c6',
          400: '#3d6aae',
          500: '#1e4d8c',
          600: '#173d71',
          700: '#112e57',
          800: '#0b1f3c',
          900: '#0c2f5c',   /* Primary INDIGO — brand kit */
        },
        gold: {
          300: '#e5ce7f',
          400: '#d3b55b',
          500: '#c19f3c',   /* Primary GOLD — brand kit */
          600: '#9e8130',
          700: '#7d6424',
        },
      },
    },
  },
  plugins: [],
};
