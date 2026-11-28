/** @type {import('tailwindcss').Config} */
// IRON ROOM tokens, 1980s gym direction (wood, iron, gym-red racks). See DESIGN.md §2. Legacy names (void, chalk, ember…) are remapped so every
// screen picks up the room's palette; new names (amber, rust, cream, ink…) are the design's own words.
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        soot: '#0D0B09',
        pit: '#1A1714',
        iron: '#2A2622',
        steelline: '#3A342D',
        concrete: '#A39C90',
        chalk: '#F4EFE4',
        amber: { DEFAULT: '#EF5A4A', core: '#FF8A7A', ink: '#FFF4E6', deep: '#A0211A' },
        rust: { DEFAULT: '#9C4A22', hi: '#D9622F' },
        brick: '#7A3B2A',
        cream: '#EDE3CC',
        ink: { DEFAULT: '#1E1A15', faded: '#5E554A' },
        stamp: '#B5482A',
        // legacy names, remapped
        void: '#0D0B09',
        carbon: '#14110E',
        graphite: '#1A1714',
        slate: '#2A2622',
        steel: '#3A342D',
        ash: '#C9C1B4',
        smoke: '#A39C90',
        ember: { DEFAULT: '#EF5A4A', hi: '#FF8A7A', ink: '#FFF4E6', deep: '#A0211A' },
        rim: '#C9C1B4',
        good: '#B9D6A0',
        caution: '#EF5A4A',
      },
      fontFamily: {
        display: ['"Big Shoulders Display Variable"', '"Arial Narrow"', 'Impact', 'sans-serif'],
        stencil: ['"Big Shoulders Stencil Display"', '"Big Shoulders Display Variable"', 'Impact', 'sans-serif'],
        typed: ['"Special Elite"', '"Courier New"', 'monospace'],
        sans: ['"Instrument Sans Variable"', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
      },
      boxShadow: {
        lit: 'inset 0 1px 0 rgba(255,214,160,0.10), inset 0 0 0 1px rgba(255,230,200,0.05), 0 18px 40px -22px rgba(0,0,0,0.95)',
        float: 'inset 0 1px 0 rgba(255,214,160,0.12), 0 32px 80px -16px rgba(0,0,0,0.95)',
        ember: 'inset 0 1px 0 rgba(255,255,255,0.28), inset 0 -3px 0 rgba(0,0,0,0.28), 0 10px 24px -10px rgba(0,0,0,0.9)',
        paper: '0 1px 0 rgba(255,255,255,0.4) inset, 0 18px 30px -18px rgba(0,0,0,0.85), 0 2px 4px rgba(0,0,0,0.5)',
      },
      borderRadius: { plate: '6px', paper: '2px' },
      transitionTimingFunction: { snap: 'cubic-bezier(0.2, 0.9, 0.25, 1)' },
    },
  },
  plugins: [],
};
