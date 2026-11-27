/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: { 950: '#0A0A0B', 900: '#111214', 850: '#16171A', 800: '#1C1E22', 700: '#26292E', 600: '#33373D', 500: '#4A4F57' },
        bone: { DEFAULT: '#F2F3F5', 2: '#C4C8CF', 3: '#9EA4AD' },
        volt: { DEFAULT: '#D7FF3C', dim: '#B8DB2E', ink: '#10140A' },
        warn: '#FF8A5C',
      },
      fontFamily: {
        display: ['"Archivo Variable"', 'Archivo', 'system-ui', 'sans-serif'],
        sans: ['"Archivo Variable"', 'Archivo', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono Variable"', 'ui-monospace', 'monospace'],
      },
      borderRadius: { xl2: '1.25rem' },
    },
  },
  plugins: [],
};
