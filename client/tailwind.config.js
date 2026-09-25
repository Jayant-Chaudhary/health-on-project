/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary:   { DEFAULT: '#2F6F6B', dark: '#245A57', light: '#E4F0EF' }, // deep teal
        accent:    { DEFAULT: '#F2836B', dark: '#E06D54', light: '#FDECE8' }, // warm coral
        canvas:    { DEFAULT: '#FBF8F5', alt: '#F3EEE8' },   // page background, recessed panels
        ink:       { DEFAULT: '#1F2933', soft: '#6B7280' },
        success:   { DEFAULT: '#4CAF7D', light: '#E6F5EC', dark: '#2F7A55' },
        attention: { DEFAULT: '#F5B041', light: '#FEF3DD', dark: '#A8650F' }, // amber, NEVER red
        danger:    { DEFAULT: '#B4654A' }, // form errors — the terracotta, not a clinical red
        
        // Clinician palette
        subcanvas: '#FAF5EE',
        surface: '#FFFDFB',
        raised: '#FFFFFF',
        line: '#EAE3D6',
        'line-strong': '#DECFC1',
        'ink-2': '#635B54',
        'ink-3': '#91877E',
        cypress: { DEFAULT: '#2C4035', deep: '#213028', soft: '#4E6554' },
        sage: { DEFAULT: '#607A68', surface: '#EEF4F0', border: '#CFDFD4', ink: '#4E6554' },
        terracotta: {
          DEFAULT: '#B4654A', surface: '#FDF2EE', border: '#F4D3C7', deep: '#9E543B',
          50: '#FDF2EE', 200: '#F4D3C7', 600: '#9E543B',
        },
        // Numeric scale of the cypress greens, for screens written against one.
        pine: {
          50: '#F3F7F4', 100: '#E4ECE7', 200: '#CFDFD4', 300: '#AFC5B6', 400: '#86A290',
          500: '#607A68', 600: '#4E6554', 700: '#3B5244', 800: '#2C4035', 900: '#213028',
        },
        sand: { 100: '#F5EFE3', 800: '#6B5A3E' },
        rose: { DEFAULT: '#C48A96', surface: '#FBF1F3', border: '#EFCFD5' },
        olive: { DEFAULT: '#857A68', surface: '#F5F2EC', border: '#E6DFD1' },
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
        display: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        'label-sm': ['11px', { lineHeight: '14px', letterSpacing: '0.04em', fontWeight: '700' }],
        'label-md': ['12px', { lineHeight: '16px', letterSpacing: '0.02em', fontWeight: '600' }],
        'label-lg': ['14px', { lineHeight: '20px', letterSpacing: '0em', fontWeight: '600' }],
        'body-sm': ['13px', { lineHeight: '18px' }],
        'body-md': ['14px', { lineHeight: '22px' }],
        'body-lg': ['16px', { lineHeight: '24px', letterSpacing: '-0.005em' }],
        'head-sm': ['18px', { lineHeight: '26px', letterSpacing: '-0.01em', fontWeight: '600' }],
        'head-lg': ['24px', { lineHeight: '32px', letterSpacing: '-0.015em', fontWeight: '600' }],
      },
      borderRadius: {
        card: '20px',
        control: '16px',
        xl: '0.75rem', 
        '2xl': '1rem'
      },
      boxShadow: {
        card: '0 4px 20px rgba(31,41,51,0.06)',
        raised: '0 8px 20px -4px rgba(46, 42, 39, 0.07)',
        overlay: '0 16px 36px -6px rgba(46, 42, 39, 0.12)',
        focus: '0 0 0 3px rgba(44, 64, 53, 0.12)',
      },
      transitionDuration: { 250: '250ms' },
    },
  },
  plugins: [],
}
