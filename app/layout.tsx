import type { Metadata, Viewport } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Rituales — Momentos que acercan',
  description: 'Un ritual diario para parejas. Cinco minutos antes de dormir.',
  openGraph: {
    title: 'Rituales',
    description: 'Un ritual diario para parejas.',
    type: 'website',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Rituales',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#0F0D0B',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es" className="dark">
      <body className="font-body antialiased">
        {children}
      </body>
    </html>
  )
}
