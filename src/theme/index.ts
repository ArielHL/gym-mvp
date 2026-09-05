import { colors, fonts } from "./tokens";

export { colors, fonts } from "./tokens";
export { fontAssets } from "./fontAssets";

const HEX_COLOR = /^#[0-9A-Fa-f]{6}$/;
const HEX_ALPHA = /^[0-9A-Fa-f]{2}$/;

export function withAlpha(hex: string, alpha: string | number): string {
  if (!HEX_COLOR.test(hex)) {
    throw new Error(`withAlpha expected #RRGGBB, received: ${hex}`);
  }

  let alphaHex: string;
  if (typeof alpha === "number") {
    if (alpha < 0 || alpha > 1) {
      throw new Error(`withAlpha numeric alpha must be between 0 and 1, received: ${alpha}`);
    }
    alphaHex = Math.round(alpha * 255)
      .toString(16)
      .padStart(2, "0");
  } else if (HEX_ALPHA.test(alpha)) {
    alphaHex = alpha;
  } else {
    throw new Error(`withAlpha expected 00-FF or 0-1, received: ${alpha}`);
  }

  return `${hex}${alphaHex.toUpperCase()}`;
}

function fontFamilyStyle(name: string): { fontFamily: string } | Record<string, never> {
  return name ? { fontFamily: name } : {};
}

export const fontStyle = {
  title: fontFamilyStyle(fonts.title),
  display: fontFamilyStyle(fonts.display),
  subtitle: fontFamilyStyle(fonts.subtitle),
  sans: fontFamilyStyle(fonts.sans),
  body: fontFamilyStyle(fonts.sans),
};

export const calendarTheme = {
  calendarBackground: colors.surface.DEFAULT,
  backgroundColor: colors.surface.DEFAULT,
  dayTextColor: colors.foreground,
  textDisabledColor: colors.faint,
  selectedDayBackgroundColor: colors.accent.cyan,
  selectedDayTextColor: colors.inverse,
  todayTextColor: colors.accent.cyan,
  monthTextColor: colors.foreground,
  arrowColor: colors.accent.cyan,
  textMonthFontWeight: "800" as const,
  textDayFontSize: 14,
  textMonthFontSize: 16,
  textDayFontFamily: fonts.sans || undefined,
  textMonthFontFamily: fonts.sans || undefined,
  textDayHeaderFontFamily: fonts.sans || undefined,
  dotColor: colors.accent.cyan,
  selectedDotColor: colors.inverse,
};

export function calendarSelectedMark() {
  return {
    selected: true,
    selectedColor: colors.accent.cyan,
    selectedTextColor: colors.inverse,
  };
}

export function difficultyColor(level?: string | null): string {
  const key = level?.toLowerCase();
  if (key === "beginner" || key === "intermediate" || key === "advanced") {
    return colors.difficulty[key];
  }
  return colors.accent.cyan;
}
