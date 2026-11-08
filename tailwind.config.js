/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        background: 'var(--background)',
        surface: 'var(--surface)',
        card: {
          DEFAULT: 'var(--card)',
          foreground: 'var(--text)',
        },
        border: 'var(--border)',
        primary: {
          DEFAULT: 'var(--primary)',
          deep: 'var(--primary-deep)',
          foreground: '#FFFFFF',
        },
        text: {
          DEFAULT: 'var(--text)',
          muted: 'var(--text-muted)',
        },
        success: 'var(--success)',
        danger: 'var(--danger)',
        warning: 'var(--warning)',
        info: 'var(--info)',
        bubble: {
          own: 'var(--bubble-own)',
          other: 'var(--bubble-other)',
        },
      },
      boxShadow: {
        crimson: '0 0 25px -5px rgba(209, 15, 47, 0.35)',
        'crimson-sm': '0 0 10px -2px rgba(209, 15, 47, 0.4)',
      },
      keyframes: {
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'slide-up': {
          '0%': { transform: 'translateY(8px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.2s ease-out',
        'slide-up': 'slide-up 0.25s ease-out',
      },
    },
  },
  plugins: [],
};

