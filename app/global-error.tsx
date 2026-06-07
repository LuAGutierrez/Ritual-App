'use client'

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html lang="es">
      <body style={{ background: '#0F0D0B', color: '#F0EBE3', fontFamily: 'sans-serif', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100dvh', textAlign: 'center', padding: '24px' }}>
        <p style={{ fontSize: '1.25rem', marginBottom: '12px' }}>Algo salió mal</p>
        <button
          onClick={reset}
          style={{ background: '#C9A97A', color: '#0F0D0B', border: 'none', borderRadius: '16px', padding: '12px 24px', cursor: 'pointer', fontWeight: 500 }}
        >
          Intentar de nuevo
        </button>
      </body>
    </html>
  )
}
