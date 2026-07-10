export const colors = {
  bg: '#070B10',
  bgDeep: '#000000',
  bgElevated: '#030508',
  bgSoft: '#0a0e14',
  bgGlass: 'rgba(2, 4, 8, 0.94)',
  surface: '#030508',
  surfaceInput: '#020408',
  border: 'rgba(232, 197, 71, 0.52)',
  borderStrong: 'rgba(232, 197, 71, 0.88)',
  text: '#F3EFE6',
  textMuted: '#9AA7B5',
  textDim: '#667788',
  accent: '#C9A227',
  accentBright: '#E8C547',
  accentDim: '#8A7018',
  emerald: '#1F8A5B',
  emeraldBright: '#2DB67A',
  danger: '#E85D5D',
  warn: '#E8B84A',
  spade: '#1A1A1A',
  heart: '#C62828',
  diamond: '#1565C0',
  club: '#1B5E20',
  table: '#0F4A35',
  tableMid: '#2A7A52',
  tableLight: '#3FA872',
  tableEdge: '#C9A227',
  tableDark: '#041610',
  feltShadow: '#021008',
  gold: '#C9A227',
  cream: '#F7F1E3',
  ink: '#0A0E14',
};

export const gradients = {
  screen: ['#070B10', '#0C1520', '#08140F'] as const,
  hero: ['rgba(201,162,39,0.22)', 'rgba(31,138,91,0.08)', 'transparent'] as const,
  table: ['#3FA872', '#2A7A52', '#0F4A35', '#041610'] as const,
  gold: ['#E8C547', '#C9A227', '#8A7018'] as const,
  button: ['#E8C547', '#C9A227'] as const,
  rail: ['rgba(201,162,39,0.35)', 'rgba(201,162,39,0.05)'] as const,
};

/** Radial stops for the game table felt — spotlight center, dark edges */
export const tableFeltRadial = [
  { offset: '0%', color: '#3FA872' },
  { offset: '45%', color: '#2A7A52' },
  { offset: '100%', color: '#0F4A35' },
] as const;

/** Shared darker panels + bright gold outlines */
export const surfaces = {
  panel: {
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.borderStrong,
  },
  panelSoft: {
    backgroundColor: colors.bgGlass,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  input: {
    backgroundColor: colors.surfaceInput,
    borderWidth: 1.5,
    borderColor: colors.borderStrong,
  },
  chip: {
    backgroundColor: colors.surfaceInput,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const radii = {
  sm: 10,
  md: 16,
  lg: 24,
  xl: 32,
  pill: 999,
};

export const fonts = {
  /** Bold sans for headings, codes, scores — no serif */
  display: 'DMSans_700Bold',
  displayRegular: 'DMSans_400Regular',
  body: 'DMSans_400Regular',
  bodyMedium: 'DMSans_500Medium',
  bodyBold: 'DMSans_700Bold',
};

export const shadow = {
  soft: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 8,
  },
  glow: {
    shadowColor: '#C9A227',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.45,
    shadowRadius: 14,
    elevation: 10,
  },
};
