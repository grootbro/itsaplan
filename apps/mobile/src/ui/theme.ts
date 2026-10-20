import { useMemo } from 'react';
import { useColorScheme } from 'react-native';
import { usePreferences } from '@/lib/preferences-context';
import { darkColors, lightColors, type Palette } from './palettes';
export type { Palette } from './palettes';

export function useTheme() {
  const { preferences } = usePreferences();
  const system = useColorScheme();
  const dark =
    preferences.theme === 'dark' || (preferences.theme === 'system' && system === 'dark');
  return { colors: dark ? darkColors : lightColors, dark };
}
export function useColors() {
  return useTheme().colors;
}
export function useThemedStyles<T>(create: (colors: Palette) => T): T {
  const colors = useColors();
  return useMemo(() => create(colors), [colors, create]);
}
export const space = { xs: 6, sm: 10, md: 16, lg: 22, xl: 28 };
