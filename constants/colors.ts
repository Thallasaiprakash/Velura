export const Colors = {
  // Backgrounds
  bgPrimary: '#07071a',
  bgSecondary: '#0f0f1a',
  bgSurface: 'rgba(167,139,250,0.08)',
  bgSurfaceMid: 'rgba(167,139,250,0.12)',
  bgSurfaceHigh: 'rgba(167,139,250,0.18)',

  // Accents
  primary: '#a78bfa',       // violet
  secondary: '#6366f1',     // indigo
  gold: '#fbbf24',          // gold streak

  // Text
  textPrimary: '#ffffff',
  textMuted: 'rgba(255,255,255,0.5)',
  textUltraMuted: 'rgba(255,255,255,0.25)',

  // Status
  success: '#34d399',
  danger: '#f87171',
  warning: '#fbbf24',

  // Task priorities
  urgent: '#f87171',
  normal: '#a78bfa',
  low: 'rgba(255,255,255,0.3)',

  // Gradients (used as arrays)
  gradientPrimary: ['#a78bfa', '#6366f1'] as const,
  gradientBg: ['#07071a', '#0f0f1a'] as const,

  // Badge colors
  bronze: '#cd7f32',
  silver: '#c0c0c0',
  gold2: '#ffd700',

  // Transparent overlays
  overlay: 'rgba(7,7,26,0.85)',
  overlayLight: 'rgba(167,139,250,0.15)',
} as const;

export type ColorKey = keyof typeof Colors;
