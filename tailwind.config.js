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
          bg: '#F7F7F2',
          surface: '#FFFFFF',
          'surface-secondary': '#F0F1EB',
          'surface-elevated': '#FAFAF7',
          'surface-sunken': '#F0F1EB',
          text: '#20251F',
          'text-secondary': '#73796F',
          'text-muted': '#969B91',
          accent: '#54765C',
          'accent-hover': '#436049',
          'accent-secondary': '#A1B69A',
          'accent-subtle': '#EAF0E6',
          border: '#E3E5DC',
          'border-strong': '#CFD4C9',
          focus: '#91A78B',
          critical: '#B94C43',
          high: '#C47A45',
          medium: '#B28A42',
          low: '#547D70',
          resolved: '#64856C',
        },
        origin: {
          bg: 'var(--color-bg)',
          surface: 'var(--color-surface)',
          'surface-elevated': 'var(--color-surface-elevated)',
          'surface-sunken': 'var(--color-surface-sunken)',
          text: 'var(--color-text)',
          'text-muted': 'var(--color-text-muted)',
          divider: 'var(--color-divider)',
          accent: 'var(--color-accent)',
          'accent-hover': 'var(--color-accent-hover)',
          critical: 'var(--color-status-critical)',
        }
      },
      fontFamily: {
        display: ['Caprasimo', 'serif'],
        heading: ['Caprasimo', 'serif'],
        sans: ['Figtree', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'Menlo', 'Monaco', 'Consolas', 'monospace']
      },
      borderRadius: {
        'xl': '14px',
        '2xl': '20px',
        '3xl': '24px',
        'full': '9999px',
      },
      boxShadow: {
        'origin-sm': '0 1px 3px rgba(32, 37, 31, 0.04), 0 1px 2px rgba(32, 37, 31, 0.02)',
        'origin-md': '0 4px 14px rgba(32, 37, 31, 0.06)',
        'origin-lg': '0 12px 32px rgba(32, 37, 31, 0.08)',
      }
    },
  },
  plugins: [],
}
