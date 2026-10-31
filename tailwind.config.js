/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        sentinel: {
          bg: '#090B0F',
          sidebar: '#0D1016',
          surface: '#121720',
          surfaceHover: '#151D28',
          secondary: '#171E28',
          secondaryHover: '#1C2633',
          border: '#252D38',
          borderSubtle: '#1C2430',
          text: '#E8EDF4',
          textMuted: '#8994A4',
          textSubtle: '#586574',
          accent: '#E0A34A',
          accentMuted: '#9B6E30',
          critical: '#EF5350',
          criticalBg: 'rgba(239, 83, 80, 0.12)',
          criticalBorder: 'rgba(239, 83, 80, 0.3)',
          warning: '#E5AD52',
          warningBg: 'rgba(229, 173, 82, 0.12)',
          warningBorder: 'rgba(229, 173, 82, 0.3)',
          success: '#42B883',
          successBg: 'rgba(66, 184, 131, 0.12)',
          successBorder: 'rgba(66, 184, 131, 0.3)',
          info: '#6DA9E8',
          infoBg: 'rgba(109, 169, 232, 0.12)',
          infoBorder: 'rgba(109, 169, 232, 0.3)',
        }
      },
      fontFamily: {
        sans: ['Inter', 'Geist', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace']
      }
    },
  },
  plugins: [],
}
