/**
 * Ritual — Configuración compartida de Tailwind (colores, fuentes).
 * Cargar después de https://cdn.tailwindcss.com en cada página.
 */
tailwind.config = {
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        wine: { DEFAULT: '#722F37', dark: '#4a1c23', light: '#8B3A42' },
        nude: { DEFAULT: '#E8D5C4', dark: '#D4A574', muted: '#C9B8A8' },
        ink: '#0f0a0b',
      },
      fontFamily: {
        display: ['Cormorant Garamond', 'serif'],
        body: ['Outfit', 'sans-serif'],
      },
    },
  },
};
