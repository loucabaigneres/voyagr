/** Raw palette from the charte. Use the semantic `colors` below in components. */
export const palette = {
  vino: '#5C1426',
  corallo: '#E5553B',
  pesca: '#F5C6A8',
  crema: '#F7F0E8',
  travertino: '#EADBCB',
  notte: '#22090F',
  oliva: '#5F6B3A',
} as const;

/**
 * Usage ratio 60 / 25 / 10 / 5: crema dominates, corallo stays rare.
 * One corallo button per screen; everything else goes vino or outlined.
 */
export const colors = {
  /** Main background. */
  background: palette.crema,
  surface: {
    /** Cards and surfaces — separated from the background by colour, never by shadow. */
    DEFAULT: palette.travertino,
    /** Form rows and fields sitting on crema. */
    raised: '#FFFBF7',
  },
  ink: {
    /** Body text, titles, photo overlays. */
    DEFAULT: palette.notte,
    /** Secondary body text. */
    secondary: '#3A2227',
    /** "Gris": captions, hints — 6.4:1 on crema, 5.4:1 on travertino. */
    muted: '#6A5055',
    /** Text on vino, notte or photos. Never on corallo (3.3:1, forbidden). */
    inverse: palette.crema,
  },
  /** Brand, secondary CTAs, active states. */
  brand: palette.vino,
  primary: {
    /** Main action, like. Rare by design; text on it is always notte. */
    DEFAULT: palette.corallo,
    /** "Corallo testo": corallo as text below 24px (5.1:1 on crema). */
    text: '#B83A25',
  },
  /** Accents on dark backgrounds. */
  accent: palette.pesca,
  /** Validation, weather. */
  success: palette.oliva,
  line: {
    /** Decorative separators. */
    DEFAULT: 'rgba(34,9,15,0.12)',
    /** Outlines of fields, chips and controls — must stay ≥ 3:1. */
    strong: '#9C8474',
  },
  /** Veil under text on photos: notte ≥ 55 %. Also the modal backdrop. */
  scrim: 'rgba(34,9,15,0.55)',
} as const;

/** Category palette shared by badges, map pins and the PDF. To validate with design. */
export const categoryColors = {
  hotel: { fill: palette.vino, ink: palette.crema },
  activity: { fill: palette.oliva, ink: palette.crema },
  restaurant: { fill: palette.pesca, ink: palette.vino },
  other: { fill: palette.travertino, ink: palette.notte },
} as const;

export const radii = {
  /** Bottom sheets. */
  sheet: 28,
  button: 28,
  card: 20,
  field: 16,
} as const;

/** Spacing base is 4 (Tailwind's default scale); screens keep a 24px margin. */
export const SCREEN_MARGIN = 24;

/** Minimum touch target (WCAG 2.2 AA, as required by the charte). */
export const MIN_TOUCH_TARGET = 44;

/**
 * Serif = emotion (titles, key figures), sans = action (buttons, fields, info).
 * React Native needs one family name per weight; these match the loaded font files.
 */
export const fonts = {
  display: 'InstrumentSerif_400Regular',
  'display-italic': 'InstrumentSerif_400Regular_Italic',
  sans: 'HankenGrotesk_400Regular',
  'sans-medium': 'HankenGrotesk_500Medium',
  'sans-semibold': 'HankenGrotesk_600SemiBold',
  'sans-bold': 'HankenGrotesk_700Bold',
} as const;

/** [fontSize, lineHeight] in px, from the charte's type scale. */
export const typeScale = {
  display: [72, 72],
  title: [38, 40],
  section: [26, 30],
  label: [17, 22],
  body: [16, 24],
  /** Chips and compact controls. */
  control: [15, 20],
  caption: [14, 20],
  overline: [12, 16],
} as const;
