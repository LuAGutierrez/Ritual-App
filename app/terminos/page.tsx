import Link from 'next/link'

export const metadata = {
  title: 'Términos de Servicio — Rituales',
}

export default function TerminosPage() {
  return (
    <div className="min-h-dvh bg-ritual-bg flex flex-col">
      <header className="px-5 pt-8 pb-4 flex items-center justify-between max-w-2xl mx-auto w-full">
        <h1 className="font-display text-xl text-ritual-cream tracking-wide">Términos de Servicio</h1>
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
          <h2 className="font-display text-lg text-ritual-cream">1. Aceptación de los términos</h2>
          <p className="text-ritual-text font-body text-sm leading-relaxed">
            Al crear una cuenta en Rituales aceptás estos Términos de Servicio y nuestra{' '}
            <Link href="/privacidad" className="text-ritual-gold hover:text-ritual-cream transition-colors">
              Política de Privacidad
            </Link>.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="font-display text-lg text-ritual-cream">2. Qué es Rituales</h2>
          <p className="text-ritual-text font-body text-sm leading-relaxed">
            Una app para parejas: un ritual diario compartido y juegos para jugar juntos, pensada para
            acercar a la pareja unos minutos por día.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="font-display text-lg text-ritual-cream">3. Edad mínima</h2>
          <p className="text-ritual-text font-body text-sm leading-relaxed">
            Tenés que ser mayor de edad en tu país de residencia (18 años como mínimo) para usar Rituales,
            especialmente por el contenido para adultos disponible en algunos juegos.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="font-display text-lg text-ritual-cream">4. Tu cuenta</h2>
          <ul className="text-ritual-text font-body text-sm leading-relaxed space-y-2 list-disc list-inside">
            <li>Sos responsable de mantener segura tu contraseña.</li>
            <li>Cada cuenta se vincula a una sola pareja a la vez, mediante un código de invitación.</li>
            <li>No podés crear cuentas falsas ni suplantar a otra persona.</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="font-display text-lg text-ritual-cream">5. Contenido para adultos</h2>
          <p className="text-ritual-text font-body text-sm leading-relaxed">
            Algunos juegos (como Ruleta Picante y el modo Picante de otros juegos) incluyen contenido
            íntimo y sugerente, pensado para jugarse en privado, en pareja y por decisión mutua. Al
            activarlo confirmás que sos mayor de edad y que vos y tu pareja lo hacen de forma consensuada.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="font-display text-lg text-ritual-cream">6. Suscripción Premium</h2>
          <ul className="text-ritual-text font-body text-sm leading-relaxed space-y-2 list-disc list-inside">
            <li>Rituales ofrece un plan gratuito y un plan Premium pago.</li>
            <li>Los pagos de Premium se procesan a través de Mercado Pago, con renovación periódica según el plan elegido.</li>
            <li>Podés cancelar tu suscripción cuando quieras; seguís teniendo acceso Premium hasta el final del período ya pagado.</li>
            <li>Los precios pueden cambiar; te avisamos antes de que un cambio te afecte.</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="font-display text-lg text-ritual-cream">7. Uso aceptable</h2>
          <p className="text-ritual-text font-body text-sm leading-relaxed">
            No está permitido usar Rituales para acosar, difundir contenido ilegal o dañar a tu pareja u
            otros usuarios. Nos reservamos el derecho de suspender cuentas que violen esto.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="font-display text-lg text-ritual-cream">8. Propiedad del contenido</h2>
          <p className="text-ritual-text font-body text-sm leading-relaxed">
            Vos sos dueño de tus respuestas y del contenido que generás. Rituales es dueño del diseño, los
            rituales, las preguntas y el contenido de los juegos que ofrecemos.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="font-display text-lg text-ritual-cream">9. Disponibilidad del servicio</h2>
          <p className="text-ritual-text font-body text-sm leading-relaxed">
            Hacemos lo posible para que Rituales esté siempre disponible, pero no garantizamos un
            funcionamiento sin interrupciones.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="font-display text-lg text-ritual-cream">10. Cambios en estos términos</h2>
          <p className="text-ritual-text font-body text-sm leading-relaxed">
            Podemos actualizar estos términos. Si el cambio es importante, te avisamos dentro de la app.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="font-display text-lg text-ritual-cream">11. Ley aplicable</h2>
          <p className="text-ritual-text font-body text-sm leading-relaxed">
            Estos términos se rigen por las leyes de la República Argentina.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="font-display text-lg text-ritual-cream">12. Contacto</h2>
          <p className="text-ritual-text font-body text-sm leading-relaxed">
            <a href="mailto:hola@rituales.app" className="text-ritual-gold hover:text-ritual-cream transition-colors">
              hola@rituales.app
            </a>
          </p>
        </section>
      </main>
    </div>
  )
}
