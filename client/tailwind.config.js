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
        canvas:    '#FBF8F5',   // page background
        ink:       { DEFAULT: '#1F2933', soft: '#6B7280' },
        success:   { DEFAULT: '#4CAF7D', light: '#E6F5EC' },
        attention: { DEFAULT: '#F5B041', light: '#FEF3DD' }, // amber, NEVER red
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif']
      },
      borderRadius: {
        card: '20px',
        control: '16px'
      },
      boxShadow: {
        card: '0 4px 20px rgba(31,41,51,0.06)'
      }
    },
  },
  plugins: [],
}
