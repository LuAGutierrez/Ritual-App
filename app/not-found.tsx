import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="min-h-dvh bg-ritual-bg flex flex-col items-center justify-center px-6 text-center">
      <h1 className="font-display text-3xl text-ritual-cream mb-3">
        Página no encontrada
      </h1>
      <p className="text-ritual-muted font-body text-sm mb-8">
        El link no es válido o ya no existe.
      </p>
      <Link
        href="/"
        className="bg-ritual-gold text-ritual-bg font-body font-medium px-6 py-3 rounded-2xl"
      >
        Ir al inicio
      </Link>
    </div>
  )
}
