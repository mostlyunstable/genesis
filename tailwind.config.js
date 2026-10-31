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
        cyber: {
          bg: '#07090E',
          bgAlt: '#0B0F17',
          surface: '#0F1523',
          surfaceElevated: '#141C2E',
          surfaceHover: '#1A243B',
          border: '#1E293B',
          borderBright: '#2E3E5B',
          blue: '#0066FF',
          blueLight: '#38BDF8',
          blueDark: '#0B254E',
          orange: '#FF5722',
          orangeLight: '#FF7A50',
          orangeDark: '#8C2B0A',
          text: '#F8FAFC',
          textMuted: '#94A3B8',
          textSubtle: '#64748B',
        },
        brand: {
          DEFAULT: '#FF5722',
          hover: '#E64A19',
          soft: 'rgba(255, 87, 34, 0.12)',
          glow: 'rgba(255, 87, 34, 0.25)',
        },
        blueAccent: {
          DEFAULT: '#0066FF',
          hover: '#0052CC',
          light: '#38BDF8',
          soft: 'rgba(0, 102, 255, 0.12)',
          glow: 'rgba(0, 102, 255, 0.25)',
        }
      },
      fontFamily: {
        sans: ['Inter', 'Geist', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['JetBrains Mono', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace']
      },
      boxShadow: {
        'cyber-sm': '0 1px 3px rgba(0, 0, 0, 0.4), 0 0 10px rgba(0, 102, 255, 0.05)',
        'cyber-md': '0 4px 16px rgba(0, 0, 0, 0.5), 0 0 20px rgba(0, 102, 255, 0.08)',
        'cyber-lg': '0 8px 32px rgba(0, 0, 0, 0.6), 0 0 30px rgba(0, 102, 255, 0.12)',
        'cyber-orange': '0 4px 20px rgba(255, 87, 34, 0.25)',
        'cyber-blue': '0 4px 20px rgba(0, 102, 255, 0.25)',
        'composer': '0 8px 32px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(30, 41, 59, 0.8)',
      }
    },
  },
  plugins: [],
}
