declare module '@expo/vector-icons' {
  import type { ComponentType } from 'react';
  import type { TextProps } from 'react-native';

  export const MaterialCommunityIcons: ComponentType<TextProps & { name: string; size?: number; color?: string }>;
}