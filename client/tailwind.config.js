/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Canvas & surfaces — warm, low-glare values for long clinical shifts.
        canvas: '#FDFBF7',
        subcanvas: '#FAF5EE',
        surface: '#FFFDFB',
        raised: '#FFFFFF',
        line: '#EAE3D6',
        'line-strong': '#DECFC1',

        // Text
        ink: '#2E2A27',
        'ink-2': '#635B54',
        'ink-3': '#91877E',

        // Primary / grounding action
        cypress: { DEFAULT: '#2C4035', deep: '#213028', soft: '#4E6554' },

        // Clinical semantics
        sage: { DEFAULT: '#607A68', surface: '#EEF4F0', border: '#CFDFD4', ink: '#4E6554' },
        terracotta: { DEFAULT: '#B4654A', surface: '#FDF2EE', border: '#F4D3C7', deep: '#9E543B' },
        rose: { DEFAULT: '#C48A96', surface: '#FBF1F3', border: '#EFCFD5' },
        olive: { DEFAULT: '#857A68', surface: '#F5F2EC', border: '#E6DFD1' },
      },
      fontFamily: {
        display: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
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
      borderRadius: { xl: '0.75rem', '2xl': '1rem' },
      boxShadow: {
        card: '0 2px 8px -2px rgba(46, 42, 39, 0.04), inset 0 1px 0 0 rgba(255,255,255,0.8)',
        raised: '0 8px 20px -4px rgba(46, 42, 39, 0.07)',
        overlay: '0 16px 36px -6px rgba(46, 42, 39, 0.12)',
        focus: '0 0 0 3px rgba(44, 64, 53, 0.12)',
      },
      transitionDuration: { 250: '250ms' },
    },
  },
  plugins: [],
};
