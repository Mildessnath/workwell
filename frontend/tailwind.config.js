import forms from '@tailwindcss/forms';

/** Design tokens copied from the Stitch "Bold Playful Radial Orbit" config. */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        canvas: '#F6F3FF',
        ink: '#1E1633',
        muted: '#62587D',
        electric: '#6C3CE9',
        lilac: '#D8CCFF',
        'lilac-soft': '#ECE6FF',
        butter: '#FFE066',
        'butter-ink': '#7A4E00',
        coral: '#FF7B93',
        'coral-soft': '#FFD6DE',
        'coral-ink': '#941736',
        mint: '#8EF0C4',
        'mint-soft': '#D5FBE9',
        'mint-ink': '#0B5D3B',
        sky: '#99DDFF',
        'sky-soft': '#DCF4FF',
        'sky-ink': '#0A557A',
        orange: '#FFEDD5',
        'orange-ink': '#9A3412',
      },
      fontFamily: {
        display: ['Fredoka', 'system-ui', 'sans-serif'],
        sans: ['Nunito', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
    },
  },
  plugins: [forms],
};
