/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        canvas: '#070708',
        surface: {
          DEFAULT: '#101012',
          elevated: '#18181c',
          hover: '#222228',
        },
        border: '#2e2e36',
        accent: {
          DEFAULT: '#8b5cf6',
          muted: '#6d28d9',
          glow: '#a78bfa',
        },
        success: '#34d399',
        warning: '#fbbf24',
        danger: '#f87171',
      },
      fontFamily: {
        sans: ['"DM Sans"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      borderRadius: {
        xl: '0.875rem',
        '2xl': '1rem',
      },
      boxShadow: {
        glow: '0 0 48px -12px rgba(139, 92, 246, 0.45)',
        panel: '0 4px 24px rgba(0,0,0,0.35)',
      },
      animation: {
        'pulse-slow': 'pulse 2.5s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
    },
  },
  plugins: [],
}
