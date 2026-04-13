import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // 게임 커스텀 컬러
        noir: {
          50: '#f5f5f0',
          100: '#e8e8e0',
          900: '#0f0f0d',
          950: '#080808',
        },
        verdict: {
          red: '#dc2626',
          blue: '#2563eb',
          yellow: '#ca8a04',
          dark: '#09090b',
        },
      },
      animation: {
        'slide-up': 'slide-up 0.3s ease-out',
        'pulse-once': 'pulse-once 0.6s ease-in-out',
        'fade-in': 'fade-in 0.4s ease-out',
      },
      keyframes: {
        'slide-up': {
          from: { transform: 'translateY(100%)', opacity: '0' },
          to: { transform: 'translateY(0)', opacity: '1' },
        },
        'pulse-once': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.6' },
        },
        'fade-in': {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};

export default config;
