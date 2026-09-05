export type ThemeColors = {
  background: string;
  surface: {
    DEFAULT: string;
    elevated: string;
  };
  border: string;
  muted: string;
  faint: string;
  foreground: string;
  inverse: string;
  danger: string;
  success: string;
  accent: {
    cyan: string;
    purple: string;
    amber: string;
    green: string;
  };
  difficulty: {
    beginner: string;
    intermediate: string;
    advanced: string;
  };
  tabBar: string;
};

export type ThemeFonts = {
  title: string;
  display: string;
  subtitle: string;
  sans: string;
};

export const colors: ThemeColors;
export const fonts: ThemeFonts;
