/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{ts,tsx}'],
  darkMode: 'class',
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        background: '#0A0A0A',
        surface: {
          DEFAULT: '#141414',
          elevated: '#1A1A1A'
        },
        border: '#222222',
        muted: '#666666',
        accent: {
          cyan: '#22D3EE',
          purple: '#A855F7',
          amber: '#F59E0B'
        },
        brand: {
          50: '#ECFEFF',
          500: '#22D3EE',
          700: '#0E7490'
        }
      }
    }
  },
  plugins: []
};
