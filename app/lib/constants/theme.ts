export const theme = {
  // Primary colors
  colors: {
    // Panel backgrounds
    panelBg: 'rgba(255, 248, 230, 0.85)',
    panelBorder: '1px solid rgba(218, 165, 32, 0.3)',
    
    // Primary brand colors
    primary: '#8B4513',
    primaryLight: '#A0522D',
    
    // Header
    headerBg: 'rgba(255, 218, 155, 0.7)',
    headerBorder: '2px solid rgba(218, 165, 32, 0.4)',
    
    // Footer
    footerBg: 'rgba(139, 69, 19, 0.9)',
    
    // Text colors
    textDark: '#1f2937',
    textMuted: '#6b7280',
    textLight: '#374151',
    
    // Accent colors
    amber900: '#78350f',
    amber800: '#92400e',
    amber700: '#b45309',
    
    // Utility colors
    white: '#ffffff',
    transparent: 'transparent',
  },

  // Gradients
  gradients: {
    pageBackground: 'linear-gradient(135deg, #FFF8DC 0%, #FFE4B5 50%, #FFDAB9 100%)',
    buttonHover: 'rgba(255, 255, 255, 0.5)',
    heatmapGradient: 'linear-gradient(to right, #388e3c 0%, #689f38 25%, #fbc02d 50%, #f57c00 75%, #d32f2f 100%)',
  },

  // Spacing
  spacing: {
    xs: '0.25rem',
    sm: '0.5rem',
    md: '1rem',
    lg: '1.5rem',
    xl: '2rem',
    '2xl': '2.5rem',
  },

  // Border radius
  borderRadius: {
    sm: '0.375rem',
    md: '0.5rem',
    lg: '0.75rem',
    xl: '1rem',
  },

  // Shadows
  shadows: {
    sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    md: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
    lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
  },

  // Common style objects
  styles: {
    // Panel styling
    panel: {
      backgroundColor: 'rgba(255, 248, 230, 0.85)',
      border: '1px solid rgba(218, 165, 32, 0.3)',
    },

    // Button styling
    buttonBase: {
      fontSize: '0.875rem',
      fontWeight: 500,
      transitionDuration: '200ms',
    },

    // Header styling
    header: {
      backgroundColor: 'rgba(255, 218, 155, 0.7)',
      borderBottom: '2px solid rgba(218, 165, 32, 0.4)',
    },

    // Logo styling
    logo: {
      marginLeft: '-5rem',
      filter: 'drop-shadow(2px 2px 4px rgba(0,0,0,0.1))',
    },

    // Title styling
    title: {
      color: '#8B4513',
      textShadow: '2px 2px 4px rgba(0,0,0,0.1)',
    },

    // Subtitle styling
    subtitle: {
      color: '#A0522D',
    },

    // Map controls background
    mapControlsBg: {
      backgroundColor: 'rgba(255, 255, 255, 0.5)',
    },

    // Sidebar scroll styling
    sidebarScroll: {
      position: 'sticky' as const,
      top: '20px',
      alignSelf: 'flex-start' as const,
      maxHeight: 'calc(100vh - 40px)',
      overflowY: 'auto' as const,
      paddingRight: '4px',
    },
  },

  // Text styles
  typography: {
    headingLarge: {
      fontSize: '1.875rem',
      fontWeight: 700,
      letterSpacing: '-0.025em',
    },
    headingMedium: {
      fontSize: '1.25rem',
      fontWeight: 600,
    },
    headingSmall: {
      fontSize: '1rem',
      fontWeight: 600,
    },
    bodyLarge: {
      fontSize: '1rem',
      lineHeight: 1.5,
    },
    bodySmall: {
      fontSize: '0.875rem',
      lineHeight: 1.5,
    },
  },
} as const;