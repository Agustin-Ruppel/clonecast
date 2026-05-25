import type { Config } from 'tailwindcss';

export default {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Existing — keep for back-compat
        ink: { 950: '#0A0A0B', 900: '#111114', 800: '#1A1A1F', 700: '#2A2A33', 500: '#6B6B7B' },
        accent: { 500: '#7C5CFF', 400: '#9B85FF', 600: '#5E3FE6' },

        // New semantic tokens (CSS-var-backed)
        canvas: 'var(--bg-canvas)',
        surface: 'var(--bg-surface)',
        'surface-2': 'var(--bg-surface-2)',
        'surface-3': 'var(--bg-surface-3)',

        'border-subtle': 'var(--border-subtle)',
        'border-default': 'var(--border-default)',
        'border-strong': 'var(--border-strong)',

        'text-primary': 'var(--text-primary)',
        'text-secondary': 'var(--text-secondary)',
        'text-muted': 'var(--text-muted)',

        intent: {
          success: 'var(--intent-success)',
          warning: 'var(--intent-warning)',
          error: 'var(--intent-error)',
          info: 'var(--intent-info)',
        },
      },
      borderRadius: {
        sm: 'var(--radius-sm)',
        md: 'var(--radius-md)',
        lg: 'var(--radius-lg)',
      },
      boxShadow: {
        sm: 'var(--shadow-sm)',
        md: 'var(--shadow-md)',
        lg: 'var(--shadow-lg)',
      },
      fontFamily: {
        sans: ['system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
    },
  },
  plugins: [],
} satisfies Config;
