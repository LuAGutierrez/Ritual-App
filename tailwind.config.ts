import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './lib/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Paleta original del proyecto
        wine: {
          DEFAULT: '#722F37',
          dark: '#4a1c23',
          light: '#8B3A42',
        },
        nude: {
          DEFAULT: '#E8D5C4',
          dark: '#D4A574',
          muted: '#C9B8A8',
        },
        ink: '#0f0a0b',
        // Paleta extendida Rituales
        ritual: {
          bg: '#0F0D0B',
          'bg-soft': '#1A1612',
          gold: '#C9A97A',
          cream: '#E8D5B7',
          terra: '#8B6F5E',
          rose: '#D4A5A5',
          text: '#F0EBE3',
          muted: '#A89880',
        },
      },
      fontFamily: {
        display: ['Cormorant Garamond', 'serif'],
        body: ['Outfit', 'sans-serif'],
      },
      animation: {
        'fade-in': 'fadeIn 0.6s ease-out',
        'fade-up': 'fadeUp 0.7s ease-out',
        'scale-in': 'scaleIn 0.5s ease-out',
        'reveal': 'reveal 0.8s cubic-bezier(0.16, 1, 0.3, 1)',
        'pulse-soft': 'pulseSoft 2s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        fadeUp: {
          '0%': { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        reveal: {
          '0%': { opacity: '0', transform: 'translateY(24px) scale(0.97)' },
          '100%': { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
        pulseSoft: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.6' },
        },
      },
    },
  },
  plugins: [],
}

export default config
