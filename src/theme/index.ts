export const theme = {
  colors: {
    // Zephium-inspired deep obsidian & cyber dark tones
    background: '#070A10',
    backgroundSubtle: '#0B0F19',
    surface: '#111726',
    surfaceElevated: '#172033',
    surfaceTranslucent: 'rgba(23, 32, 51, 0.75)',
    surfaceBorder: '#1F2C44',
    borderSubtle: 'rgba(255, 255, 255, 0.08)',
    borderActive: 'rgba(99, 102, 241, 0.45)',
    
    // Brand & Accents
    primary: '#6366F1',       // Electric Indigo
    primaryLight: '#818CF8',
    primaryDark: '#4F46E5',
    primaryGlow: 'rgba(99, 102, 241, 0.15)',
    
    secondary: '#EC4899',     // Magenta / Fashion
    secondaryLight: '#F472B6',
    secondaryGlow: 'rgba(236, 72, 153, 0.15)',
    
    accentDeal: '#10B981',    // Emerald Green (Price / Buy)
    accentDealGlow: 'rgba(16, 185, 129, 0.15)',
    accentWarning: '#F59E0B', // Amber / Discount
    accentDanger: '#EF4444',
    
    // Channel specific accents
    telegram: '#229ED9',
    blogger: '#F57D00',
    pinterest: '#E60023',
    whatsapp: '#25D366',
    x: '#000000',
    
    // Text Hierarchy
    textPrimary: '#F8FAFC',
    textSecondary: '#94A3B8',
    textMuted: '#64748B',
    textInverse: '#070A10',
  },
  typography: {
    fontFamilies: {
      sans: 'sans-serif',
      sansMedium: 'sans-serif-medium',
      mono: 'monospace',
    },
    sizes: {
      xxs: 10,
      xs: 12,
      sm: 13,
      base: 15,
      lg: 17,
      xl: 20,
      xxl: 24,
      hero: 30,
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
    xxs: 2,
    xs: 4,
    sm: 8,
    md: 14,
    lg: 20,
    xl: 28,
    xxl: 40,
  },
  radii: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 22,
    full: 9999,
  },
  shadows: {
    card: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.45,
      shadowRadius: 10,
      elevation: 6,
    },
    glowPrimary: {
      shadowColor: '#6366F1',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.45,
      shadowRadius: 16,
      elevation: 8,
    },
    glowSecondary: {
      shadowColor: '#EC4899',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.45,
      shadowRadius: 16,
      elevation: 8,
    },
    glowEmerald: {
      shadowColor: '#10B981',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.45,
      shadowRadius: 14,
      elevation: 8,
    },
    glowDeal: {
      shadowColor: '#10B981',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.45,
      shadowRadius: 14,
      elevation: 8,
    },
  },
};