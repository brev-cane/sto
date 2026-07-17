import { TextStyle } from 'react-native';

/**
 * Centralized typography scale.
 *
 * Use the presets (`typography.h1`, `typography.body`, ...) in styles so text
 * stays consistent across screens. Sizes/weights live here only.
 */

export const fontSize = {
  xs: 11,
  sm: 13,
  md: 15,
  lg: 17,
  xl: 20,
  xxl: 24,
  xxxl: 30,
} as const;

export const fontWeight = {
  regular: '400' as TextStyle['fontWeight'],
  medium: '500' as TextStyle['fontWeight'],
  semibold: '600' as TextStyle['fontWeight'],
  bold: '700' as TextStyle['fontWeight'],
};

export interface Typography {
  h1: TextStyle;
  h2: TextStyle;
  h3: TextStyle;
  title: TextStyle;
  subtitle: TextStyle;
  body: TextStyle;
  bodySmall: TextStyle;
  caption: TextStyle;
  button: TextStyle;
  label: TextStyle;
}

export const typography: Typography = {
  h1: { fontSize: fontSize.xxxl, lineHeight: 36, fontWeight: fontWeight.bold },
  h2: { fontSize: fontSize.xxl, lineHeight: 30, fontWeight: fontWeight.bold },
  h3: { fontSize: fontSize.xl, lineHeight: 26, fontWeight: fontWeight.semibold },
  title: { fontSize: fontSize.lg, lineHeight: 24, fontWeight: fontWeight.semibold },
  subtitle: { fontSize: fontSize.md, lineHeight: 22, fontWeight: fontWeight.medium },
  body: { fontSize: fontSize.md, lineHeight: 22, fontWeight: fontWeight.regular },
  bodySmall: { fontSize: fontSize.sm, lineHeight: 18, fontWeight: fontWeight.regular },
  caption: { fontSize: fontSize.xs, lineHeight: 16, fontWeight: fontWeight.regular },
  button: { fontSize: fontSize.md, lineHeight: 20, fontWeight: fontWeight.semibold },
  label: { fontSize: fontSize.sm, lineHeight: 18, fontWeight: fontWeight.medium },
};
