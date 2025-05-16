export const theme = {
  colors: {
    // Primary brand colors
    primary: {
      50: '#EEE7FF',
      100: '#D3C5FF',
      200: '#B69DFF',
      300: '#9975FF',
      400: '#7C4DFF', // Main primary
      500: '#6E3AFF',
      600: '#5E2AF0',
      700: '#4E1FD9',
      800: '#3F15C2',
      900: '#2F0A9C',
    },
    // Secondary accent colors
    secondary: {
      50: '#E6FBFF',
      100: '#CCF7FF',
      200: '#99EFFF',
      300: '#66E7FF',
      400: '#33DFFF',
      500: '#00D7FF', // Main secondary
      600: '#00ACCC',
      700: '#008199',
      800: '#005666',
      900: '#002B33',
    },
    // Success, warning, error states
    success: '#10B981',
    warning: '#F59E0B',
    error: '#EF4444',
    // Neutral colors
    neutral: {
      50: '#F9FAFB',
      100: '#F3F4F6',
      200: '#E5E7EB',
      300: '#D1D5DB',
      400: '#9CA3AF',
      500: '#6B7280',
      600: '#4B5563',
      700: '#374151',
      800: '#1F2937',
      900: '#111827',
      950: '#030712',
    },
    // Background gradients
    gradients: {
      primary: 'linear-gradient(135deg, #7C4DFF 0%, #00D7FF 100%)',
      dark: 'linear-gradient(135deg, #111827 0%, #374151 100%)',
      glow: 'radial-gradient(circle at center, rgba(124, 77, 255, 0.15) 0%, rgba(0, 0, 0, 0) 70%)',
    },
  },
  
  // Typography
  typography: {
    fontFamily: {
      sans: "'Plus Jakarta Sans Variable', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      mono: "'JetBrains Mono Variable', SFMono-Regular, Menlo, Monaco, Consolas, monospace",
    },
    fontWeight: {
      normal: 400,
      medium: 500,
      semibold: 600,
      bold: 700,
    },
    fontSize: {
      xs: '0.75rem',
      sm: '0.875rem',
      base: '1rem',
      lg: '1.125rem',
      xl: '1.25rem',
      '2xl': '1.5rem',
      '3xl': '1.875rem',
      '4xl': '2.25rem',
      '5xl': '3rem',
    },
  },
  
  // Spacing
  spacing: {
    0: '0',
    1: '0.25rem',
    2: '0.5rem',
    3: '0.75rem',
    4: '1rem',
    5: '1.25rem',
    6: '1.5rem',
    8: '2rem',
    10: '2.5rem',
    12: '3rem',
    16: '4rem',
    20: '5rem',
    24: '6rem',
    32: '8rem',
  },
  
  // Borders
  borderRadius: {
    none: '0',
    sm: '0.125rem',
    DEFAULT: '0.25rem',
    md: '0.375rem',
    lg: '0.5rem',
    xl: '0.75rem',
    '2xl': '1rem',
    '3xl': '1.5rem',
    full: '9999px',
  },
  
  // Shadows
  shadows: {
    sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    DEFAULT: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px -1px rgba(0, 0, 0, 0.1)',
    md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)',
    lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1)',
    xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
    '2xl': '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
    inner: 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.05)',
    none: 'none',
    glow: '0 0 15px rgba(124, 77, 255, 0.5)',
  },
  
  // Animations
  animation: {
    fast: '0.15s ease-in-out',
    DEFAULT: '0.3s ease-in-out',
    slow: '0.5s ease-in-out',
  },
  
  // Z-index
  zIndex: {
    0: 0,
    10: 10,
    20: 20,
    30: 30,
    40: 40,
    50: 50,
    auto: 'auto',
  },
  
  // Breakpoints for responsive design
  breakpoints: {
    xs: '0px',
    sm: '640px',
    md: '768px',
    lg: '1024px',
    xl: '1280px',
    '2xl': '1536px',
  },
};

// Helper functions
export const media = {
  sm: `@media (min-width: ${theme.breakpoints.sm})`,
  md: `@media (min-width: ${theme.breakpoints.md})`,
  lg: `@media (min-width: ${theme.breakpoints.lg})`,
  xl: `@media (min-width: ${theme.breakpoints.xl})`,
  '2xl': `@media (min-width: ${theme.breakpoints['2xl']})`,
}; 