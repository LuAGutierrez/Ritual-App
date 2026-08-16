'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState, useTransition } from 'react'
import BottomNav from '@/components/BottomNav'
import PageLoader from '@/components/PageLoader'
import { getJuegosStatsSummaryAction, type JuegosStatsSummary } from '@/app/actions/juegos-stats'
import { JUEGOS } from '@/lib/juegos'
import { IconLlama } from '@/components/icons/juegos'

// La lógica de QUÉ mensaje mostrar vive acá, no en la base -- la RPC
// (get_juegos_stats_summary, migración 029) solo trae los números
// crudos de los 3 juegos de "coincidir/adivinar". Solo muestra algo
// cuando hay una señal real: una racha activa, o un juego donde
// todavía coinciden poco con suficientes intentos como para que no
// sea ruido. Si no hay señal, no se fuerza un mensaje genérico.
function mensajeAdaptativo(stats: JuegosStatsSummary | null): string | null {
  if (!stats) return null

  const bloques = [
    stats.eleccion && {
      nombre: 'Elección',
      racha: stats.eleccion.racha_actual,
      intentos: stats.eleccion.intentos,
      tasa: stats.eleccion.intentos > 0 ? stats.eleccion.coincidencias / stats.eleccion.intentos : 0,
    },
    stats.estoAquello && {
      nombre: 'Esto o Aquello',
      racha: stats.estoAquello.racha_actual,
      intentos: stats.estoAquello.intentos,
      tasa: stats.estoAquello.intentos > 0 ? stats.estoAquello.coincidencias / stats.estoAquello.intentos : 0,
    },
    stats.conoces && {
      nombre: '¿Cuánto me conoces?',
      racha: stats.conoces.racha_actual,
      intentos: stats.conoces.intentos,
      tasa: stats.conoces.intentos > 0 ? stats.conoces.aciertos / stats.conoces.intentos : 0,
    },
  ].filter((b): b is { nombre: string; racha: number; intentos: number; tasa: number } => !!b)

  if (bloques.length === 0) return null

  const conRacha = [...bloques].sort((a, b) => b.racha - a.racha)[0]
  if (conRacha.racha >= 2) {
    return `🔥 Vienen con una racha de ${conRacha.racha} en ${conRacha.nombre}. ¿La estiran hoy?`
  }

  const porDescubrir = bloques
    .filter(b => b.intentos >= 3 && b.tasa < 0.4)
    .sort((a, b) => a.tasa - b.tasa)[0]
  if (porDescubrir) {
    return `Todavía se están descubriendo en ${porDescubrir.nombre} — hoy puede ser el día.`
  }

  return null
}

export default function JuegosPage() {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [stats, setStats] = useState<JuegosStatsSummary | null>(null)

  useEffect(() => {
    getJuegosStatsSummaryAction().then(setStats)
  }, [])

  function handleClick(e: React.MouseEvent, href: string) {
    e.preventDefault()
    startTransition(() => {
      router.push(href)
    })
  }

  const mensaje = mensajeAdaptativo(stats)
  const destacados = JUEGOS.filter(j => j.variante === 'destacado')
  const compactos = JUEGOS.filter(j => j.variante === 'compacto')
  const especiales = JUEGOS.filter(j => j.variante === 'especial')

  return (
    <div className="min-h-dvh bg-ritual-bg flex flex-col">
      {isPending && (
        <div className="fixed inset-0 z-50">
          <PageLoader />
        </div>
      )}

      <header className="px-5 pt-8 pb-4">
        <h1 className="font-display text-xl text-ritual-cream tracking-wide">Juegos</h1>
        <p className="text-ritual-muted text-xs font-body mt-0.5">Para jugar juntos, más allá del ritual de hoy</p>
        {mensaje && (
          <p className="text-ritual-gold text-xs font-body mt-2">{mensaje}</p>
        )}
      </header>

      <main className="flex-1 px-5 pb-28 max-w-md mx-auto w-full space-y-3">
        {/* Destacados: cards grandes, un juego por fila */}
        {destacados.map(juego => (
          <Link
            key={juego.id}
            href={juego.href}
            prefetch
            onClick={e => handleClick(e, juego.href)}
            className="group block bg-ritual-bg-soft border border-white/8 rounded-3xl px-6 py-8 transition-all duration-200 hover:border-ritual-gold/30"
          >
            <div className="flex items-start justify-between">
              <span className="text-ritual-muted group-hover:text-ritual-gold transition-colors"><juego.Icono /></span>
              {juego.badge && (
                <span
                  className={`text-[10px] font-body uppercase tracking-wider text-ritual-muted border border-white/10 rounded-full px-2 py-0.5 ${
                    juego.badge.conLlama ? 'flex items-center gap-1' : ''
                  }`}
                >
                  {juego.badge.conLlama && <IconLlama />}
                  {juego.badge.texto}
                </span>
              )}
            </div>
            <p className="font-display text-3xl text-ritual-cream leading-snug mt-4">{juego.titulo}</p>
            <p className="text-ritual-muted text-sm font-body mt-1.5 max-w-[85%]">{juego.descripcion}</p>
          </Link>
        ))}

        {/* Compactos: par en grid */}
        <div className="grid grid-cols-2 gap-3">
          {compactos.map(juego => (
            <Link
              key={juego.id}
              href={juego.href}
              prefetch
              onClick={e => handleClick(e, juego.href)}
              className="group bg-ritual-bg-soft border border-white/8 rounded-2xl px-4 py-5 flex flex-col justify-between h-40 transition-all duration-200 hover:border-white/20"
            >
              <span className="text-ritual-muted group-hover:text-ritual-cream transition-colors"><juego.Icono /></span>
              <div>
                <p className="font-display text-xl text-ritual-cream leading-tight">{juego.titulo}</p>
                {juego.badge && (
                  <p className="text-ritual-muted text-[11px] font-body mt-1 flex items-center gap-1">
                    {juego.badge.conLlama && <IconLlama />}
                    {juego.badge.texto}
                  </p>
                )}
              </div>
            </Link>
          ))}
        </div>

        {/* Especiales: tratamiento propio (hoy: Ruleta Picante, +18) */}
        {especiales.map(juego => (
          <Link
            key={juego.id}
            href={juego.href}
            prefetch
            onClick={e => handleClick(e, juego.href)}
            className="group flex items-center gap-4 bg-[#D4A5A5]/8 border border-[#D4A5A5]/25 rounded-2xl px-5 py-5 transition-all duration-200 hover:border-[#D4A5A5]/45"
          >
            <span className="text-[#D4A5A5]"><juego.Icono /></span>
            <div className="flex-1 min-w-0">
              <p className="font-display text-xl text-ritual-cream leading-tight">{juego.titulo}</p>
              <p className="text-ritual-muted text-xs font-body mt-0.5">{juego.descripcion}</p>
            </div>
            {juego.badge && (
              <span className="text-[10px] font-body uppercase tracking-wider text-[#D4A5A5] border border-[#D4A5A5]/30 rounded-full px-2 py-0.5 flex-shrink-0">
                {juego.badge.texto}
              </span>
            )}
          </Link>
        ))}
      </main>

      <BottomNav />
    </div>
  )
}
