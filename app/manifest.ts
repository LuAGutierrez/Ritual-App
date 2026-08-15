import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Rituales — Momentos que acercan',
    short_name: 'Rituales',
    description: 'Un ritual diario para parejas. Cinco minutos antes de dormir.',
    start_url: '/ritual',
    display: 'standalone',
    background_color: '#0F0D0B',
    theme_color: '#0F0D0B',
    icons: [
      { src: '/icons/192', sizes: '192x192', type: 'image/png' },
      { src: '/icons/512', sizes: '512x512', type: 'image/png' },
    ],
  }
}
