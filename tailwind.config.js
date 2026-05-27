/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./App.tsx', './src/**/*.{ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#ECFEFF',
          500: '#0891B2',
          700: '#0E7490'
        }
      }
    }
  },
  plugins: []
};
