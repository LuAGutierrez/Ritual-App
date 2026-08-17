import Link from 'next/link'

export const metadata = {
  title: 'Política de Privacidad — Rituales',
}

export default function PrivacidadPage() {
  return (
    <div className="min-h-dvh bg-ritual-bg flex flex-col">
      <header className="px-5 pt-8 pb-4 flex items-center justify-between max-w-2xl mx-auto w-full">
        <h1 className="font-display text-xl text-ritual-cream tracking-wide">Política de Privacidad</h1>
        <Link
          href="/auth"
          className="text-ritual-muted text-xs font-body hover:text-ritual-text transition-colors py-2 px-3 flex-shrink-0"
        >
          ← Volver
        </Link>
      </header>

      <main className="flex-1 px-5 pb-16 max-w-2xl mx-auto w-full space-y-8">
        <p className="text-ritual-muted text-xs font-body">Última actualización: agosto de 2026</p>

        <section className="space-y-2">
          <h2 className="font-display text-lg text-ritual-cream">1. Quiénes somos</h2>
          <p className="text-ritual-text font-body text-sm leading-relaxed">
            Rituales es una app para parejas: un ritual diario compartido y juegos para jugar juntos. Esta
            política explica qué información recolectamos, para qué la usamos y cómo la protegemos.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="font-display text-lg text-ritual-cream">2. Qué información recolectamos</h2>
          <ul className="text-ritual-text font-body text-sm leading-relaxed space-y-2 list-disc list-inside">
            <li><strong className="text-ritual-cream">Datos de cuenta:</strong> email, nombre o apodo, avatar (el emoji que elijas).</li>
            <li><strong className="text-ritual-cream">Contenido que generás:</strong> tus respuestas al ritual diario, tus elecciones en los juegos, rachas y estadísticas de la pareja.</li>
            <li><strong className="text-ritual-cream">Notificaciones:</strong> si activás los avisos, guardamos la suscripción push de tu navegador para poder enviártelos. No accedemos a tu ubicación ni a tus contactos.</li>
            <li><strong className="text-ritual-cream">Datos de pago:</strong> si te suscribís a Premium, el pago lo procesa Mercado Pago. Rituales nunca ve ni guarda el número de tu tarjeta.</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="font-display text-lg text-ritual-cream">3. Cómo se comparte tu información dentro de la pareja</h2>
          <p className="text-ritual-text font-body text-sm leading-relaxed">
            Este es el corazón de la app: cuando respondés el ritual del día o jugás, tu pareja vinculada ve
            tus respuestas. No compartimos tus respuestas con nadie fuera de la pareja a la que estás
            vinculado.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="font-display text-lg text-ritual-cream">4. Con quién compartimos datos</h2>
          <p className="text-ritual-text font-body text-sm leading-relaxed">
            No vendemos tu información a terceros ni la usamos con fines publicitarios. La compartimos
            únicamente con los proveedores que hacen que Rituales funcione:
          </p>
          <ul className="text-ritual-text font-body text-sm leading-relaxed space-y-2 list-disc list-inside">
            <li>Supabase, nuestra infraestructura de base de datos y autenticación.</li>
            <li>Mercado Pago, únicamente para procesar los pagos de la suscripción Premium.</li>
            <li>El servicio de notificaciones push de tu navegador, solo para poder avisarte.</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="font-display text-lg text-ritual-cream">5. Cuánto tiempo guardamos tus datos</h2>
          <p className="text-ritual-text font-body text-sm leading-relaxed">
            Mientras tu cuenta esté activa. Si la eliminás, borramos tu perfil y tus respuestas asociadas
            dentro de un plazo razonable, salvo lo que estemos obligados a conservar por ley (por ejemplo,
            registros de pagos).
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="font-display text-lg text-ritual-cream">6. Tus derechos</h2>
          <p className="text-ritual-text font-body text-sm leading-relaxed">
            Podés pedirnos en cualquier momento acceder a tus datos, corregirlos o eliminar tu cuenta.
            Escribinos a{' '}
            <a href="mailto:ritual.platform@gmail.com" className="text-ritual-gold hover:text-ritual-cream transition-colors">
              ritual.platform@gmail.com
            </a>.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="font-display text-lg text-ritual-cream">7. Seguridad</h2>
          <p className="text-ritual-text font-body text-sm leading-relaxed">
            Usamos conexiones cifradas (HTTPS) y control de acceso a nivel de base de datos para que solo
            vos y tu pareja puedan ver sus propios datos.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="font-display text-lg text-ritual-cream">8. Cambios a esta política</h2>
          <p className="text-ritual-text font-body text-sm leading-relaxed">
            Si hacemos cambios importantes, te avisamos dentro de la app.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="font-display text-lg text-ritual-cream">9. Contacto</h2>
          <p className="text-ritual-text font-body text-sm leading-relaxed">
            <a href="mailto:ritual.platform@gmail.com" className="text-ritual-gold hover:text-ritual-cream transition-colors">
              ritual.platform@gmail.com
            </a>
          </p>
        </section>
      </main>
    </div>
  )
}
