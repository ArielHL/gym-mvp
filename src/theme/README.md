# Theme

Look-and-feel is centralized. Change colors and font **names** in one file; the rest of the app follows.

**Rule:** `tokens.js` is the only place for design values. `fontAssets.ts` only maps font files.

## Files

| File | Role |
|---|---|
| `src/theme/tokens.js` | Design values: hex colors + font family names (CommonJS) |
| `src/theme/tokens.d.ts` | TypeScript types for `tokens.js` |
| `src/theme/index.ts` | App adapters: `withAlpha`, `fontStyle`, `calendarTheme`, `difficultyColor` |
| `src/theme/fontAssets.ts` | Metro-only `require()` map for `.ttf` / `.otf` files |
| `tailwind.config.js` | Reads `tokens.js`; does not store hex |

Import from `@/theme` in app code. Do not hardcode hex or `fontFamily` in screens.

## Colors

Current palette in `tokens.js`:

| Token | Value | NativeWind | StyleSheet |
|---|---|---|---|
| `background` | `#0A0A0A` | `bg-background` | `colors.background` |
| `surface.DEFAULT` | `#141414` | `bg-surface` | `colors.surface.DEFAULT` |
| `surface.elevated` | `#1A1A1A` | `bg-surface-elevated` | `colors.surface.elevated` |
| `border` | `#222222` | `border-border` | `colors.border` |
| `muted` | `#666666` | `text-muted` | `colors.muted` |
| `faint` | `#333333` | `text-faint` | `colors.faint` |
| `foreground` | `#FFFFFF` | `text-foreground` | `colors.foreground` |
| `inverse` | `#000000` | `text-inverse` | `colors.inverse` |
| `danger` | `#F87171` | `text-danger` / `bg-danger` | `colors.danger` |
| `success` | `#22C55E` | `text-success` / `bg-success` | `colors.success` |
| `accent.cyan` | `#22D3EE` | `text-accent-cyan` / `bg-accent-cyan` | `colors.accent.cyan` |
| `accent.purple` | `#A855F7` | `text-accent-purple` | `colors.accent.purple` |
| `accent.amber` | `#F59E0B` | `text-accent-amber` | `colors.accent.amber` |
| `difficulty.beginner` | `#22D3EE` | `bg-difficulty-beginner` | `difficultyColor("beginner")` |
| `difficulty.intermediate` | `#F59E0B` | `bg-difficulty-intermediate` | `difficultyColor("intermediate")` |
| `difficulty.advanced` | `#A855F7` | `bg-difficulty-advanced` | `difficultyColor("advanced")` |
| `tabBar` | `#0E0E0E` | `bg-tabBar` | `colors.tabBar` |

Prefer semantic classes (`text-accent-cyan`, `text-muted`) over default Tailwind palettes (`text-cyan-300`, `text-gray-400`).

### Overlays

Do not invent `#22D3EE44`. Use `withAlpha`:

```ts
import { colors, withAlpha } from "@/theme";

withAlpha(colors.accent.cyan, "44"); // 00–FF
withAlpha(colors.accent.cyan, 0.25); // 0–1
```

Only `#RRGGBB` is accepted. Shorthand (`#fff`) throws.

## Fonts

Files live in `assets/fonts/`. Names live in `tokens.js`. The file map lives in `fontAssets.ts`.

| Role | File | Token | NativeWind |
|---|---|---|---|
| Titles / logo | `Oi-Regular.ttf` | `fonts.title` / `fonts.display` | `font-title` / `font-display` |
| Subtitles + body | `Manrope.ttf` | `fonts.subtitle` / `fonts.sans` | `font-subtitle` / `font-sans` |

`src/components/ui/Text.tsx` defaults to Manrope (`variant="body"`). Page headings use `variant="title"` (Oi). Do not map `font-black` to Oi.

`src/app/_layout.tsx` loads `fontAssets` before render.

React Native does not support font fallbacks. Each `fontFamily` entry is a single loaded name. `Manrope.ttf` is variable, so `fontWeight` may not change the cut on native.

## Adapters (`@/theme`)

```ts
import {
  colors,
  fonts,
  fontAssets,
  fontStyle,
  withAlpha,
  calendarTheme,
  calendarSelectedMark,
  difficultyColor,
} from "@/theme";
```

| Export | Use |
|---|---|
| `colors` / `fonts` | Design values |
| `fontAssets` | `useFonts` in root layout |
| `fontStyle.title` / `.display` | Oi |
| `fontStyle.subtitle` / `.sans` / `.body` | Manrope |
| `withAlpha(hex, alpha)` | 8-digit hex overlays |
| `calendarTheme` | `react-native-calendars` `theme` prop |
| `calendarSelectedMark()` | selected day mark (`selectedColor`, `selectedTextColor`) |
| `difficultyColor(level)` | beginner / intermediate / advanced, else accent cyan |

## Usage

NativeWind:

```tsx
<View className="flex-1 bg-background">
  <Text className="font-title text-foreground">Title</Text>
  <Text className="text-muted">Subtitle</Text>
  <Pressable className="bg-accent-cyan">
    <Text className="text-inverse">Book</Text>
  </Pressable>
</View>
```

StyleSheet / native props:

```tsx
import { colors, difficultyColor } from "@/theme";

<ActivityIndicator color={colors.accent.cyan} />
<StatusBar backgroundColor={colors.background} />
<Text style={{ color: difficultyColor(item.difficulty_level) }} />
```

## Client brand swap

1. Edit hex + font names in `src/theme/tokens.js`.
2. If using custom fonts, add files under `assets/fonts/` and `require()` them in `fontAssets.ts`.
3. Do not paste new hex into screens.

Google logo fills in `GoogleIcon.tsx` stay hardcoded on purpose.