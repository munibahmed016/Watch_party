// src/constants/colors.ts
//
// Brand system — 1:1 with WatchPartyLive web app (global.css)
//   --p #EE3063 · --s #4A51A1 · grad 135deg
//   Backgrounds #07070E → #24243E (deep near-black navy)
//   Text white @ 93/55/28%
//
// All existing keys preserved so current screens keep working.

const colors = {
  // base
  black: '#000000',
  white: '#FFFFFF',

  // ===== Background system (web --bg .. --bg5) =====
  background: '#07070E',
  backgroundSoft: '#0E0E1A',
  bg2: '#0E0E1A',
  bg3: '#14142A',
  bg4: '#1C1C34',
  bg5: '#24243E',

  // ===== Screen background gradient =====
  // Web app background is a deep, almost-flat dark navy. We use a subtle
  // top-to-bottom wash between bg2 and bg for depth (no pink).
  backgroundGradientColors: ['#0E0E1A', '#07070E', '#07070E', '#07070E'] as const,
  backgroundGradientLocations: [0, 0.4, 0.8, 1] as const,

  // ===== Brand gradient (--grad: 135deg #EE3063 → #4A51A1) =====
  gradientStart: '#EE3063',
  gradientEnd: '#4A51A1',
  buttonGradient: ['#EE3063', '#4A51A1'] as const,
  // For LinearGradient to emulate 135deg, use start TL → end BR:
  gradientStartPoint: { x: 0, y: 0 } as const,
  gradientEndPoint: { x: 1, y: 1 } as const,

  // subtle brand tint (web .s-link.active background)
  brandTintGradient: ['rgba(238,48,99,0.14)', 'rgba(74,81,161,0.14)'] as const,

  // ===== Brand accents =====
  primary: '#EE3063',
  primaryDark: '#A13367',
  secondary: '#4A51A1',
  accent: '#EE3063',
  glowPink: 'rgba(238,48,99,0.35)',

  // ===== Text (web --t / --t2 / --t3) =====
  textPrimary: 'rgba(255,255,255,0.93)',
  textSecondary: 'rgba(255,255,255,0.55)',
  textMuted: 'rgba(255,255,255,0.28)',
  textInverse: '#000000',

  // ===== Borders (web --b / --b2) =====
  border: 'rgba(255,255,255,0.07)',
  border2: 'rgba(255,255,255,0.13)',

  // ===== Inputs / surfaces =====
  inputBackground: 'rgba(255,255,255,0.05)',
  inputBorder: 'rgba(255,255,255,0.07)',
  surface: '#14142A',
  surfaceElevated: '#1C1C34',
  divider: 'rgba(255,255,255,0.07)',

  // ===== Glass (web .glass / .glass-2) =====
  glass: 'rgba(255,255,255,0.032)',
  glass2: 'rgba(255,255,255,0.06)',

  // ===== States =====
  success: '#3DD68C',
  error: '#FF4D4F',
  warning: '#FFB020',

  // ===== Misc =====
  overlay: 'rgba(0,0,0,0.82)',
  cardOverlay: 'rgba(255,255,255,0.06)',
  pinkSoft: 'rgba(238,48,99,0.18)',
};

export default colors;