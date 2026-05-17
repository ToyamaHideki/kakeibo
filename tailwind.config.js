/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        sage: {
          50: '#f2f7f0',
          100: '#deecd8',
          200: '#bdd8b1',
          300: '#96be82',
          400: '#72a358',
          500: '#5a8a43',
          600: '#466d33',
          700: '#38562a',
          800: '#2e4522',
          900: '#263a1d',
        },
        terracotta: {
          50: '#fdf3f0',
          100: '#fce4dd',
          200: '#f8c6ba',
          300: '#f19e85',
          400: '#e67452',
          500: '#d4553a',
          600: '#b23e2a',
          700: '#963222',
          800: '#7a2819',
        },
      },
    },
  },
  plugins: [],
}
