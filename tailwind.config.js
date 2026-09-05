const { colors, fonts } = require('./src/theme/tokens');

const fontFamily = {};
if (fonts.sans) fontFamily.sans = [fonts.sans];
if (fonts.subtitle) fontFamily.subtitle = [fonts.subtitle];
if (fonts.title) fontFamily.title = [fonts.title];
if (fonts.display) fontFamily.display = [fonts.display];

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{ts,tsx}'],
  darkMode: 'class',
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        background: colors.background,
        surface: colors.surface,
        border: colors.border,
        muted: colors.muted,
        faint: colors.faint,
        foreground: colors.foreground,
        inverse: colors.inverse,
        danger: colors.danger,
        success: colors.success,
        accent: colors.accent,
        difficulty: colors.difficulty,
        tabBar: colors.tabBar,
      },
      fontFamily,
    },
  },
  plugins: [],
};
