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
        brand: {
          DEFAULT: '#F15A24',
          hover: '#DE4D18',
          soft: '#FFF0E8',
          dark: '#FF6938',
          muted: '#C44416',
        },
        canvas: {
          DEFAULT: '#FAFAF8',
          secondary: '#F3F2EE',
          surface: '#FFFFFF',
          hover: '#F0EFEA',
          border: '#E9E6E0',
          borderSubtle: '#F0ECE6',
          text: '#171717',
          muted: '#77736D',
          subtle: '#A5A19A',
        },
        darkCanvas: {
          DEFAULT: '#101113',
          surface: '#181A1D',
          elevated: '#202328',
          border: '#2B2F36',
          text: '#F4F4F2',
          muted: '#999DA4',
        },
        status: {
          critical: '#D94B45',
          criticalBg: '#FDF2F2',
          criticalBorder: '#F8D7DA',
          success: '#258A62',
          successBg: '#F0FDF4',
          successBorder: '#DCFCE7',
          warning: '#E59819',
          warningBg: '#FFFBEB',
          warningBorder: '#FEF3C7',
          info: '#4F7FC1',
          infoBg: '#F0F6FF',
          infoBorder: '#DBEAFE',
        }
      },
      fontFamily: {
        sans: ['Inter', 'Geist', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['JetBrains Mono', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace']
      },
      boxShadow: {
        'sm-soft': '0 1px 3px rgba(0, 0, 0, 0.04), 0 1px 2px rgba(0, 0, 0, 0.02)',
        'md-soft': '0 4px 12px rgba(0, 0, 0, 0.05), 0 1px 3px rgba(0, 0, 0, 0.03)',
        'lg-soft': '0 12px 32px rgba(0, 0, 0, 0.06), 0 2px 6px rgba(0, 0, 0, 0.02)',
        'composer': '0 8px 30px rgba(0, 0, 0, 0.07)',
      }
    },
  },
  plugins: [],
}
