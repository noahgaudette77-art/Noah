/** @type {import('tailwindcss').Config} */
// Night Session tokens. See DESIGN.md. Spacing follows Tailwind's 4px grid; we use the 8-pt steps.
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        void: '#070708',
        carbon: '#0F0F11',
        graphite: '#18181B',
        slate: '#232327',
        steel: '#3A3A40',
        chalk: '#F3EFE8',
        ash: '#B8B3AA',
        smoke: '#8C877F',
        ember: { DEFAULT: '#FF5B1F', hi: '#FF8A4C', ink: '#170700', deep: '#B83A0B' },
        rim: '#7FA8FF',
        good: '#86D9A8',
        caution: '#FFC85A',
      },
      fontFamily: {
        display: ['"Big Shoulders Display Variable"', '"Arial Narrow"', 'Impact', 'sans-serif'],
        sans: ['"Instrument Sans Variable"', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
      },
      boxShadow: {
        lit: 'inset 0 1px 0 rgba(255,255,255,0.07), 0 1px 0 rgba(0,0,0,0.6), 0 24px 48px -24px rgba(0,0,0,0.9)',
        float: 'inset 0 1px 0 rgba(255,255,255,0.09), 0 32px 80px -16px rgba(0,0,0,0.95)',
        ember: '0 10px 40px -8px rgba(255,91,31,0.55), inset 0 1px 0 rgba(255,255,255,0.35)',
      },
      transitionTimingFunction: { snap: 'cubic-bezier(0.2, 0.9, 0.25, 1)' },
    },
  },
  plugins: [],
};
