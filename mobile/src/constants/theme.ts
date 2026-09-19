// ─── Learnova Design Token System ─────────────────────────────────────────────
// App name: Learnova  (Learn + Nova: "new learning", fresh start in education)
// Tagline:  Learn smarter, achieve more.
//
// Palette philosophy:
//   • Warm slate backgrounds — not pure white, not dark. Off-white/parchment feel.
//   • Teal primary (#0EA5A0) — trustworthy, academic, calm, distinct.
//   • Deep navy text (#0F1C2E) — rich, readable, not harsh black.
//   • Warm neutrals for surfaces — feels like a real notebook.
//   • Semantic colours are vibrant enough to pop on light surfaces.

import { Platform } from 'react-native';

// ─── Color Palette ────────────────────────────────────────────────────────────
export const Colors = {
  // ── Backgrounds (warm light surfaces) ────────────────────────────────────────
  bg:              '#F7F8FA',   // app background — soft off-white
  surface:         '#FFFFFF',   // cards, panels — pure white
  surfaceAlt:      '#F0F2F5',   // secondary surface — light grey
  surfaceElevated: '#E8EBF0',   // modals, elevated — slightly deeper
  surfacePressed:  '#DDE1E8',   // pressed/active state

  // ── Borders ────────────────────────────────────────────────────────────────────
  border:          '#E2E6EC',   // default border — subtle
  borderStrong:    '#C8CFD9',   // stronger separator / focus indicator

  // ── Text (navy-based for warmth, not cold grey) ────────────────────────────────
  textPrimary:     '#0F1C2E',   // headings — deep navy
  textSecondary:   '#3D5066',   // body — medium navy-slate
  textMuted:       '#7A8FA6',   // placeholders, captions
  textDisabled:    '#B8C4D0',   // disabled state
  textInverse:     '#FFFFFF',   // text on dark/primary backgrounds

  // ── Brand — Teal (academic, calm, trustworthy) ─────────────────────────────────
  primary:         '#0EA5A0',   // teal — core brand colour
  primaryDark:     '#0B8A86',   // darker teal for pressed states
  primaryLight:    '#2DC4BF',   // lighter teal for highlights
  primaryMuted:    '#CCF0EF',   // very light teal tint
  primarySubtle:   '#E8F8F7',   // extremely subtle teal bg

  // ── Accent — Purple (complements teal, matches logo) ───────────────────────────
  accent:          '#8B5CF6',   // purple — accent from logo
  accentDark:      '#7C3AED',   // darker purple for pressed states
  accentLight:     '#A78BFA',   // lighter purple for highlights
  accentMuted:     '#E9D5FF',   // very light purple tint
  accentSubtle:    '#F5F3FF',   // extremely subtle purple bg

  // ── Semantic ───────────────────────────────────────────────────────────────────
  success:         '#16A34A',
  successLight:    '#22C55E',
  successMuted:    '#DCFCE7',
  warning:         '#D97706',
  warningLight:    '#F59E0B',
  warningMuted:    '#FEF3C7',
  error:           '#DC2626',
  errorLight:      '#EF4444',
  errorMuted:      '#FEE2E2',
  info:            '#0284C7',
  infoLight:       '#0EA5E9',
  infoMuted:       '#E0F2FE',

  // ── Module accent colours (vivid, on white backgrounds) ───────────────────────
  moduleColors: [
    '#0EA5A0', // teal (brand)
    '#7C3AED', // violet
    '#DC2626', // red
    '#D97706', // amber
    '#16A34A', // green
    '#0284C7', // blue
    '#BE185D', // pink
    '#9333EA', // purple
  ],

  // ── Pure ──────────────────────────────────────────────────────────────────────
  white:       '#FFFFFF',
  black:       '#000000',
  transparent: 'transparent',

  // ── Legacy aliases (for backward compatibility during migration) ──────────────
  get subjectColors() { return this.moduleColors; },
} as const;

// ─── Spacing Scale (4pt grid) ─────────────────────────────────────────────────
export const Spacing = {
  xs:    4,
  sm:    8,
  md:    12,
  base:  16,
  lg:    20,
  xl:    24,
  '2xl': 32,
  '3xl': 40,
  '4xl': 48,
  '5xl': 64,
  '6xl': 80,
} as const;

// ─── Border Radius ────────────────────────────────────────────────────────────
export const Radius = {
  xs:    4,
  sm:    8,
  md:    12,
  lg:    16,
  xl:    20,
  '2xl': 24,
  '3xl': 32,
  full:  9999,
} as const;

// ─── Typography ───────────────────────────────────────────────────────────────
export const Typography = {
  fontFamily: {
    regular: Platform.select({ ios: 'System', android: 'Roboto', default: undefined }),
    medium:  Platform.select({ ios: 'System', android: 'Roboto', default: undefined }),
    bold:    Platform.select({ ios: 'System', android: 'Roboto', default: undefined }),
  },
  size: {
    '2xs': 10,
    xs:    11,
    sm:    13,
    base:  15,
    md:    16,
    lg:    18,
    xl:    20,
    '2xl': 24,
    '3xl': 28,
    '4xl': 32,
    '5xl': 38,
    '6xl': 46,
  },
  weight: {
    regular:  '400' as const,
    medium:   '500' as const,
    semibold: '600' as const,
    bold:     '700' as const,
    black:    '800' as const,
  },
  lineHeight: {
    tight:   1.15,
    snug:    1.3,
    normal:  1.5,
    relaxed: 1.65,
    loose:   1.8,
  },
  tracking: {
    tighter: -1,
    tight:   -0.5,
    normal:   0,
    wide:     0.5,
    wider:    1,
    widest:   2,
  },
} as const;

// ─── Shadow Presets (lighter shadows for light UI) ────────────────────────────
export const Shadow = {
  xs: Platform.select({
    web: { boxShadow: '0 1px 3px rgba(15,28,46,0.08)' } as object,
    default: {
      shadowColor: '#0F1C2E',
      shadowOpacity: 0.08,
      shadowRadius: 3,
      shadowOffset: { width: 0, height: 1 },
      elevation: 1,
    },
  })!,
  sm: Platform.select({
    web: { boxShadow: '0 2px 8px rgba(15,28,46,0.10)' } as object,
    default: {
      shadowColor: '#0F1C2E',
      shadowOpacity: 0.10,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 2 },
      elevation: 2,
    },
  })!,
  md: Platform.select({
    web: { boxShadow: '0 4px 16px rgba(15,28,46,0.12)' } as object,
    default: {
      shadowColor: '#0F1C2E',
      shadowOpacity: 0.12,
      shadowRadius: 16,
      shadowOffset: { width: 0, height: 4 },
      elevation: 4,
    },
  })!,
  lg: Platform.select({
    web: { boxShadow: '0 8px 32px rgba(15,28,46,0.16)' } as object,
    default: {
      shadowColor: '#0F1C2E',
      shadowOpacity: 0.16,
      shadowRadius: 24,
      shadowOffset: { width: 0, height: 8 },
      elevation: 8,
    },
  })!,
  glow: Platform.select({
    web: { boxShadow: '0 0 20px rgba(14,165,160,0.28)' } as object,
    default: {
      shadowColor: '#0EA5A0',
      shadowOpacity: 0.32,
      shadowRadius: 16,
      shadowOffset: { width: 0, height: 0 },
      elevation: 5,
    },
  })!,
};

// ─── Z-Index Scale ────────────────────────────────────────────────────────────
export const ZIndex = {
  base:    0,
  raised:  1,
  overlay: 10,
  modal:   20,
  toast:   30,
  tooltip: 40,
} as const;

// ─── Animation Durations ──────────────────────────────────────────────────────
export const Duration = {
  instant: 80,
  fast:    150,
  normal:  250,
  slow:    400,
  slower:  600,
} as const;
