import Link from 'next/link'
import { FREE_FEATURES, PREMIUM_FEATURES, PREMIUM_PRICE } from '@/lib/plans'

const JUEGOS_LANDING = [
  { titulo: 'Elección', descripcion: 'Elijan en secreto, en tiempo real, y vean si coinciden.' },
  { titulo: '¿Cuánto me conoces?', descripcion: 'Uno responde sobre sí mismo, el otro adivina.' },
  { titulo: '¿Quién de los dos?', descripcion: 'Preguntas comparativas: ¿piensan igual?' },
  { titulo: 'Verdad o Reto', descripcion: 'El clásico de siempre, pensado para dos.' },
  { titulo: 'Esto o Aquello', descripcion: 'Decisiones rápidas, una tras otra.' },
  { titulo: 'Ruleta Picante', descripcion: 'Para cuando se animan a más.' },
] as const

const CARACTERISTICAS = [
  { titulo: 'Rachas y comodines', descripcion: 'Sumen noches seguidas sin perder la racha si un día se les pasa.' },
  { titulo: 'Historial compartido', descripcion: 'Cada respuesta queda guardada para volver a leerla.' },
  { titulo: 'Se avisan entre ustedes', descripcion: 'Notificaciones cuando el otro ya respondió.' },
] as const

const PASOS = [
  { numero: '01', texto: 'Una pregunta nueva cada noche, la misma para los dos.' },
  { numero: '02', texto: 'Respondan en secreto, cada uno a su ritmo.' },
  { numero: '03', texto: 'Cuando ambos terminan, se revela — y ahí arranca la charla.' },
] as const

export default function LandingPage() {
  return (
    <div className="min-h-dvh bg-ritual-bg">
      <header className="px-5 pt-8 pb-4 max-w-2xl mx-auto w-full flex items-center justify-between">
        <span className="font-display text-xl text-ritual-cream tracking-wide">Rituales</span>
        <Link
          href="/auth"
          className="text-ritual-muted text-sm font-body hover:text-ritual-text transition-colors py-2 px-3"
        >
          Entrar
        </Link>
      </header>

      <main>
        <section className="px-5 pt-10 pb-16 max-w-2xl mx-auto w-full text-center animate-fade-up">
          <p className="text-2xl">✦</p>
          <h1 className="font-display text-4xl sm:text-5xl text-ritual-cream leading-tight mt-4 text-balance">
            Cinco minutos, cada noche, solo para ustedes
          </h1>
          <p className="text-ritual-muted font-body text-base mt-4 max-w-md mx-auto leading-relaxed">
            Rituales es una pregunta diaria compartida con tu pareja. Respondan en secreto; cuando los
            dos terminan, se revela.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center mt-8 max-w-xs sm:max-w-none mx-auto">
            <Link
              href="/auth?tab=registro"
              className="bg-ritual-gold text-ritual-bg font-body font-medium py-4 px-8 rounded-2xl hover:bg-ritual-cream active:scale-[0.98] transition-all duration-300"
            >
              Empezar gratis
            </Link>
            <Link
              href="/auth"
              className="bg-transparent border border-white/10 text-ritual-muted font-body text-sm py-4 px-8 rounded-2xl hover:border-white/20 hover:text-ritual-text transition-all duration-300 flex items-center justify-center"
            >
              Ya tengo cuenta
            </Link>
          </div>

          <div className="max-w-sm mx-auto mt-14">
            <div className="bg-ritual-bg-soft border border-white/10 rounded-3xl p-6 space-y-5 text-left">
              <p className="text-ritual-gold text-xs font-body uppercase tracking-widest">Ritual de hoy</p>
              <p className="font-display text-2xl text-ritual-cream leading-snug">
                ¿Qué fue lo que más te hizo reír de mí esta semana?
              </p>
              <div className="space-y-2 pt-4 border-t border-white/8">
                <div className="flex items-center justify-between text-sm font-body">
                  <span className="text-ritual-text">Vos</span>
                  <span className="text-ritual-gold">Respondido ✓</span>
                </div>
                <div className="flex items-center justify-between text-sm font-body">
                  <span className="text-ritual-text">Tu pareja</span>
                  <span className="text-ritual-muted animate-pulse-soft">Esperando…</span>
                </div>
              </div>
            </div>
            <p className="text-ritual-muted text-xs font-body text-center mt-3">
              Se revela cuando los dos responden
            </p>
          </div>
        </section>

        <section className="px-5 py-16 bg-ritual-bg-soft/40 border-y border-white/5">
          <div className="max-w-2xl mx-auto w-full space-y-8">
            {PASOS.map(paso => (
              <div key={paso.numero} className="flex items-start gap-5">
                <span className="font-display text-3xl text-ritual-gold/70 shrink-0">{paso.numero}</span>
                <p className="font-body text-ritual-text text-lg leading-relaxed pt-1">{paso.texto}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="px-5 py-16 max-w-2xl mx-auto w-full">
          <div className="text-center mb-10">
            <h2 className="font-display text-3xl text-ritual-cream">Y cuando quieran algo más</h2>
            <p className="text-ritual-muted font-body text-sm mt-2">
              Seis juegos para jugar juntos, más allá del ritual de la noche.
            </p>
          </div>
          <div className="divide-y divide-white/8 border-y border-white/8">
            {JUEGOS_LANDING.map(j => (
              <div key={j.titulo} className="py-5 flex items-baseline justify-between gap-6">
                <p className="font-display text-2xl text-ritual-cream">{j.titulo}</p>
                <p className="text-ritual-muted text-sm font-body text-right max-w-[55%]">{j.descripcion}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="px-5 py-16 bg-ritual-bg-soft/40 border-y border-white/5">
          <div className="max-w-2xl mx-auto w-full grid sm:grid-cols-3 gap-8">
            {CARACTERISTICAS.map(c => (
              <div key={c.titulo} className="border-l-2 border-ritual-gold/40 pl-5">
                <p className="font-display text-xl text-ritual-cream">{c.titulo}</p>
                <p className="text-ritual-muted text-sm font-body mt-1.5 leading-relaxed">{c.descripcion}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="px-5 py-16 max-w-2xl mx-auto w-full">
          <div className="text-center mb-10">
            <h2 className="font-display text-3xl text-ritual-cream">Gratis para siempre</h2>
            <p className="text-ritual-muted font-body text-sm mt-2 max-w-sm mx-auto leading-relaxed">
              El ritual diario nunca tiene costo. Premium suma profundidad para quienes quieren más.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="bg-ritual-bg-soft border border-white/10 rounded-3xl p-6 space-y-3">
              <p className="text-ritual-muted text-xs font-body uppercase tracking-widest">Gratis</p>
              <ul className="space-y-2">
                {FREE_FEATURES.map(f => (
                  <li key={f} className="flex items-start gap-2.5 text-ritual-muted font-body text-sm">
                    <span className="text-ritual-gold/70 mt-0.5">·</span>
                    {f}
                  </li>
                ))}
              </ul>
            </div>
            <div className="bg-ritual-gold/8 border border-ritual-gold/25 rounded-3xl p-6 space-y-3">
              <p className="text-ritual-gold text-xs font-body uppercase tracking-widest">
                Premium — {PREMIUM_PRICE.label} / {PREMIUM_PRICE.period}
              </p>
              <ul className="space-y-2">
                {PREMIUM_FEATURES.map(f => (
                  <li key={f} className="flex items-start gap-2.5 text-ritual-text font-body text-sm">
                    <span className="text-ritual-gold mt-0.5">✦</span>
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        <section className="px-5 py-20 text-center">
          <h2 className="font-display text-3xl text-ritual-cream max-w-sm mx-auto text-balance">
            Empiecen esta noche
          </h2>
          <Link
            href="/auth?tab=registro"
            className="inline-block bg-ritual-gold text-ritual-bg font-body font-medium py-4 px-10 rounded-2xl hover:bg-ritual-cream active:scale-[0.98] transition-all duration-300 mt-6"
          >
            Crear cuenta gratis
          </Link>
        </section>
      </main>

      <footer className="px-5 py-8 border-t border-white/5">
        <div className="max-w-2xl mx-auto w-full flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
          <span className="text-ritual-muted text-xs font-body">© 2026 Rituales</span>
          <div className="flex items-center gap-4">
            <Link href="/terminos" className="text-ritual-muted text-xs font-body hover:text-ritual-text transition-colors">
              Términos
            </Link>
            <Link href="/privacidad" className="text-ritual-muted text-xs font-body hover:text-ritual-text transition-colors">
              Privacidad
            </Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
