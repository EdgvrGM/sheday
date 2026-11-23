import { DefaultTheme, type Theme } from 'expo-router';

export const Colors = {
  primary: '#C2185B',
  primaryDark: '#8E0F43',
  primarySoft: '#FCE4EC',
  text: '#1F1A1C',
  textSecondary: '#6E6468',
  background: '#FFFFFF',
  surface: '#F7F3F4',
  border: '#E8DFE2',
  success: '#2E7D32',
  successSoft: '#E8F5E9',
  warning: '#B26A00',
  warningSoft: '#FFF3E0',
  danger: '#C62828',
  dangerSoft: '#FFEBEE',
  info: '#1565C0',
  infoSoft: '#E3F2FD',
  white: '#FFFFFF',
} as const;

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const Radius = {
  sm: 8,
  md: 12,
  lg: 16,
  pill: 999,
} as const;

/** Ancho máximo del contenido en web/tablet para que no se estire. */
export const MaxContentWidth = 1100;

export const NavigationTheme: Theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: Colors.primary,
    background: Colors.background,
    card: Colors.background,
    text: Colors.text,
    border: Colors.border,
  },
};
