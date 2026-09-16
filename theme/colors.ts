/**
 * Centralized color scheme.
 *
 * `palette` holds raw brand values; screens should never import it directly.
 * Use the semantic tokens from `useTheme().colors` so light/dark both work.
 */

export const palette = {
  // Brand
  royalBlue: '#00338D',
  royalBlueBright: '#4D7CC9', // readable version of the brand blue on dark surfaces
  billsRed: '#C60C30',
  billsRedBright: '#E64C63', // readable version of the brand red on dark surfaces

  // Neutrals
  white: '#FFFFFF',
  gray50: '#F7F8FA',
  gray100: '#F3F4F6',
  gray200: '#E5E7EB',
  gray400: '#9CA3AF',
  gray500: '#6B7280',
  gray600: '#4B5563',
  gray900: '#111418',
  darkBg: '#0F1216',
  darkSurface: '#1A1F26',
  darkSurfaceHigh: '#232A33',
  darkBorder: '#2E3641',

  // Status
  success: '#4CAF50',
  successBright: '#66BB6A',
  warning: '#FFC107',
  warningBright: '#FFD54F',
  error: '#D93025',
  errorBright: '#FF6B5E',
} as const;

export interface ThemeColors {
  // Surfaces
  background: string;
  surface: string; // cards, sheets, grouped sections
  surfaceVariant: string; // secondary/nested surfaces, pressed states
  inputBackground: string;
  overlay: string; // modal/sheet backdrop

  // Content
  text: string;
  textSecondary: string;
  textMuted: string;
  onPrimary: string; // text/icons on primary-colored surfaces
  onAccent: string;

  // Lines
  border: string;
  separator: string;

  // Brand & status
  primary: string;
  primaryMuted: string; // tinted background behind primary content
  accent: string;
  error: string;
  success: string;
  warning: string;

  // Navigation chrome
  tabBarBackground: string;
  tabBarInactive: string;

  placeholder: string;
  shadow: string;
}

export const lightColors: ThemeColors = {
  background: palette.white,
  surface: palette.gray50,
  surfaceVariant: palette.gray100,
  inputBackground: palette.gray100,
  overlay: 'rgba(0, 0, 0, 0.5)',

  text: palette.gray900,
  textSecondary: palette.gray600,
  textMuted: palette.gray400,
  onPrimary: palette.white,
  onAccent: palette.white,

  border: palette.gray200,
  separator: palette.gray200,

  primary: palette.royalBlue,
  primaryMuted: 'rgba(0, 51, 141, 0.08)',
  accent: palette.billsRed,
  error: palette.error,
  success: palette.success,
  warning: palette.warning,

  tabBarBackground: palette.white,
  tabBarInactive: palette.gray400,

  placeholder: palette.gray400,
  shadow: '#000000',
};

export const darkColors: ThemeColors = {
  background: palette.darkBg,
  surface: palette.darkSurface,
  surfaceVariant: palette.darkSurfaceHigh,
  inputBackground: palette.darkSurfaceHigh,
  overlay: 'rgba(0, 0, 0, 0.65)',

  text: palette.gray100,
  textSecondary: palette.gray400,
  textMuted: palette.gray500,
  onPrimary: palette.white,
  onAccent: palette.white,

  border: palette.darkBorder,
  separator: palette.darkBorder,

  primary: palette.royalBlue,
  primaryMuted: 'rgba(77, 124, 201, 0.16)',
  accent: palette.billsRedBright,
  error: palette.errorBright,
  success: palette.successBright,
  warning: palette.warningBright,

  tabBarBackground: palette.darkSurface,
  tabBarInactive: palette.gray500,

  placeholder: palette.gray500,
  shadow: '#000000',
};
