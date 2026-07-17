import {
  DarkTheme as NavDarkTheme,
  DefaultTheme as NavLightTheme,
  Theme as NavigationTheme,
} from '@react-navigation/native';
import { useMemo } from 'react';
import { useColorScheme } from 'react-native';
import { darkColors, lightColors, ThemeColors } from './colors';
import { typography, Typography } from './typography';

export { darkColors, lightColors, palette } from './colors';
export type { ThemeColors } from './colors';
export { fontSize, fontWeight, typography } from './typography';
export type { Typography } from './typography';

export interface Theme {
  isDark: boolean;
  colors: ThemeColors;
  typography: Typography;
}

export const lightTheme: Theme = { isDark: false, colors: lightColors, typography };
export const darkTheme: Theme = { isDark: true, colors: darkColors, typography };

/** Current theme, following the system light/dark setting. */
export function useTheme(): Theme {
  const scheme = useColorScheme();
  return scheme === 'dark' ? darkTheme : lightTheme;
}

/**
 * Build a StyleSheet from the current theme:
 *   const styles = useThemedStyles(makeStyles);
 * where `makeStyles = (theme: Theme) => StyleSheet.create({...})`.
 */
export function useThemedStyles<T>(factory: (theme: Theme) => T): T {
  const theme = useTheme();
  return useMemo(() => factory(theme), [theme, factory]);
}

/** React Navigation themes derived from the app palette. */
export const navigationLightTheme: NavigationTheme = {
  ...NavLightTheme,
  colors: {
    ...NavLightTheme.colors,
    primary: lightColors.primary,
    background: lightColors.background,
    card: lightColors.background,
    text: lightColors.text,
    border: lightColors.border,
    notification: lightColors.accent,
  },
};

export const navigationDarkTheme: NavigationTheme = {
  ...NavDarkTheme,
  colors: {
    ...NavDarkTheme.colors,
    primary: darkColors.primary,
    background: darkColors.background,
    card: darkColors.surface,
    text: darkColors.text,
    border: darkColors.border,
    notification: darkColors.accent,
  },
};
