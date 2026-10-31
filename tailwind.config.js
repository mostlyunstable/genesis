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
        // Forensic Intelligence Core Palette
        canvas: 'var(--canvas)',
        surface: {
          DEFAULT: 'var(--surface)',
          muted: 'var(--surface-muted)',
          elevated: 'var(--surface-elevated)'
        },
        ink: {
          primary: 'var(--primary-ink)',
          secondary: 'var(--secondary-ink)'
        },
        forest: {
          deep: '#142C29',
          elevated: '#203A35',
          subtle: '#294640'
        },
        signal: {
          teal: '#26796C',
          orange: '#E87950',
          lime: '#C6D36C'
        },
        semantic: {
          critical: 'var(--semantic-critical)',
          high: 'var(--semantic-high)',
          medium: 'var(--semantic-medium)',
          low: 'var(--semantic-low)',
          info: 'var(--semantic-info)',
          resolved: 'var(--semantic-resolved)'
        }
      },
      fontFamily: {
        sans: ['Inter', 'Geist', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['JetBrains Mono', 'IBM Plex Mono', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace']
      },
      boxShadow: {
        'forensic-sm': '0 1px 2px rgba(25, 38, 34, 0.05)',
        'forensic-md': '0 4px 12px rgba(25, 38, 34, 0.08)',
        'forensic-lg': '0 12px 32px rgba(25, 38, 34, 0.12)',
        'theatre-md': '0 4px 20px rgba(11, 25, 23, 0.4)'
      }
    },
  },
  plugins: [],
}
