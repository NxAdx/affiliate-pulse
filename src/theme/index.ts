export const theme = {
  colors: {
    background: '#0B0F17',
    surface: '#151C28',
    surfaceElevated: '#1E2838',
    surfaceBorder: '#273449',
    
    // Brand & Accents
    primary: '#6366F1',       // Electric Indigo
    primaryLight: '#818CF8',
    primaryDark: '#4F46E5',
    
    secondary: '#EC4899',     // Magenta / Fashion
    accentDeal: '#10B981',    // Emerald Green (Price / Buy)
    accentWarning: '#F59E0B', // Amber / Discount
    accentDanger: '#EF4444',
    
    // Channel specific accents
    telegram: '#229ED9',
    blogger: '#F57D00',
    pinterest: '#E60023',
    whatsapp: '#25D366',
    x: '#1DA1F2',
    
    // Text Hierarchy
    textPrimary: '#F8FAFC',
    textSecondary: '#94A3B8',
    textMuted: '#64748B',
    textInverse: '#0B0F17',
  },
  typography: {
    fontFamilies: {
      sans: 'System',
      mono: 'Courier',
    },
    sizes: {
      xs: 11,
      sm: 13,
      base: 15,
      lg: 18,
      xl: 22,
      xxl: 28,
      hero: 34,
    },
    weights: {
      regular: '400' as const,
      medium: '500' as const,
      semibold: '600' as const,
      bold: '700' as const,
      black: '900' as const,
    },
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
  },
  radii: {
    sm: 6,
    md: 12,
    lg: 16,
    xl: 24,
    full: 9999,
  },
  shadows: {
    card: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.35,
      shadowRadius: 8,
      elevation: 6,
    },
    glowPrimary: {
      shadowColor: '#6366F1',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.45,
      shadowRadius: 14,
      elevation: 8,
    },
  },
};