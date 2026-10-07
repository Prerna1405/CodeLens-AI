import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: 'class',
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './contexts/**/*.{js,ts,jsx,tsx,mdx}',
    './hooks/**/*.{js,ts,jsx,tsx,mdx}',
    './lib/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-inter)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
      },
      colors: {
        ink: {
          50:  '#f6f7f9',
          100: '#eceef2',
          200: '#d5d9e1',
          300: '#b0b6c5',
          400: '#838ba2',
          500: '#626a83',
          600: '#4d546a',
          700: '#3e4356',
          800: '#353948',
          900: '#0f1115',
          950: '#07080b',
        },
        accent: {
          50:  '#eff8ff',
          100: '#d9efff',
          200: '#bce2ff',
          300: '#8ecfff',
          400: '#58b2ff',
          500: '#3093ff',
          600: '#1b74f5',
          700: '#165ce1',
          800: '#184bb6',
          900: '#1a418f',
        },
        success: '#10b981',
        warning: '#f59e0b',
        danger:  '#ef4444',
      },
      boxShadow: {
        glow: '0 0 0 1px rgba(48,147,255,.18), 0 10px 40px -12px rgba(48,147,255,.35)',
        card: '0 1px 0 0 rgba(255,255,255,.04) inset, 0 1px 2px rgba(0,0,0,.4)',
        'card-hover': '0 0 0 1px rgba(48,147,255,.28), 0 20px 60px -16px rgba(48,147,255,.45)',
        'badge-ring': '0 0 0 2px rgba(48,147,255,.25), 0 0 0 4px rgba(48,147,255,.1)',
      },
      backgroundImage: {
        'grid-fade':
          'radial-gradient(ellipse 60% 50% at 50% 0%, rgba(48,147,255,.18), transparent 60%), radial-gradient(ellipse 40% 40% at 80% 10%, rgba(168,85,247,.12), transparent 60%)',
      },
      transitionProperty: {
        height: 'height',
        spacing: 'margin, padding',
      },
      keyframes: {
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'fade-in-up': {
          '0%': { opacity: '0', transform: 'translateY(6px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in-down': {
          '0%': { opacity: '0', transform: 'translateY(-6px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'slide-in-left': {
          '0%': { opacity: '0', transform: 'translateX(-12px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        'slide-in-right': {
          '0%': { opacity: '0', transform: 'translateX(12px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        'scale-in': {
          '0%': { opacity: '0', transform: 'scale(.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        'pulse-soft': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '.6' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        'score-pop': {
          '0%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.15)' },
          '100%': { transform: 'scale(1)' },
        },
        'progress-fill': {
          '0%': { width: '0%' },
          '100%': { width: 'var(--progress-width, 100%)' },
        },
        'spin-slow': {
          '0%': { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' },
        },
      },
      animation: {
        'fade-in': 'fade-in .4s ease both',
        'fade-in-up': 'fade-in-up .35s ease-out both',
        'fade-in-down': 'fade-in-down .35s ease-out both',
        'slide-in-left': 'slide-in-left .4s ease-out both',
        'slide-in-right': 'slide-in-right .4s ease-out both',
        'scale-in': 'scale-in .3s ease-out both',
        'pulse-soft': 'pulse-soft 2.2s ease-in-out infinite',
        shimmer: 'shimmer 1.8s linear infinite',
        'score-pop': 'score-pop .4s ease-out both',
        'progress-fill': 'progress-fill 1s linear both',
        'spin-slow': 'spin-slow 3s linear infinite',
        'stagger-1': 'fade-in-up .35s ease-out 60ms both',
        'stagger-2': 'fade-in-up .35s ease-out 120ms both',
        'stagger-3': 'fade-in-up .35s ease-out 180ms both',
        'stagger-4': 'fade-in-up .35s ease-out 240ms both',
        'stagger-5': 'fade-in-up .35s ease-out 300ms both',
      },
    },
  },
  plugins: [],
}

export default config
