'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState, useTransition } from 'react'
import BottomNav from '@/components/BottomNav'
import PageLoader from '@/components/PageLoader'
import PicanteConsentGate from '@/components/PicanteConsentGate'
import { getJuegosStatsSummaryAction, type JuegosStatsSummary } from '@/app/actions/juegos-stats'
import { getPicanteHabilitadoAction, habilitarPicanteAction } from '@/app/actions/picante-consent'
import { JUEGOS, type JuegoModo } from '@/lib/juegos'
import { IconLlama } from '@/components/icons/juegos'

// La lógica de QUÉ mensaje mostrar vive acá, no en la base -- la RPC
// (get_juegos_stats_summary, migración 029) solo trae los números
// crudos de los 4 juegos con stats (Elección, Esto o Aquello, Conoces,
// Quién de los dos -- Verdad o Reto y Ruleta Picante no tienen stats
// persistidas, quedan fuera de este cálculo). Solo muestra algo cuando
// hay una señal real. "Frecuencia" y "modo favorito" se derivan de
// datos que ya se piden (updated_at e intentos de cada tabla de
// stats) -- no hace falta tabla nueva ni instrumentar duración de
// sesión (se evaluó y se descartó por poco confiable: no hay forma
// de saber si se cerró la pestaña sin querer).
function mensajeAdaptativo(stats: JuegosStatsSummary | null): string | null {
  if (!stats) return null

  // Los 4 juegos SIEMPRE están presentes en la lista (con ceros si
  // nunca se jugaron) -- necesario para el mensaje de "modo favorito":
  // si un juego nunca jugado quedara afuera del todo, "menosJugado"
  // jamás podría ser 0 y ese mensaje nunca se dispararía.
  const bloques = [
    {
      nombre: 'Elección',
      racha: stats.eleccion?.racha_actual ?? 0,
      intentos: stats.eleccion?.intentos ?? 0,
      tasa: stats.eleccion && stats.eleccion.intentos > 0 ? stats.eleccion.coincidencias / stats.eleccion.intentos : 0,
      updatedAt: stats.eleccion?.updated_at ?? null,
    },
    {
      nombre: 'Esto o Aquello',
      racha: stats.estoAquello?.racha_actual ?? 0,
      intentos: stats.estoAquello?.intentos ?? 0,
      tasa: stats.estoAquello && stats.estoAquello.intentos > 0 ? stats.estoAquello.coincidencias / stats.estoAquello.intentos : 0,
      updatedAt: stats.estoAquello?.updated_at ?? null,
    },
    {
      nombre: '¿Cuánto me conoces?',
      racha: stats.conoces?.racha_actual ?? 0,
      intentos: stats.conoces?.intentos ?? 0,
      tasa: stats.conoces && stats.conoces.intentos > 0 ? stats.conoces.aciertos / stats.conoces.intentos : 0,
      updatedAt: stats.conoces?.updated_at ?? null,
    },
    {
      nombre: '¿Quién de los dos?',
      racha: stats.quienDeLosDos?.racha_actual ?? 0,
      intentos: stats.quienDeLosDos?.intentos ?? 0,
      tasa: stats.quienDeLosDos && stats.quienDeLosDos.intentos > 0 ? stats.quienDeLosDos.coincidencias / stats.quienDeLosDos.intentos : 0,
      updatedAt: stats.quienDeLosDos?.updated_at ?? null,
    },
  ]

  const jugadosAlgunaVez = bloques.filter((b): b is typeof b & { updatedAt: string } => b.updatedAt !== null)
  if (jugadosAlgunaVez.length === 0) return null

  // 1. Frecuencia: hace más de una semana que no juegan nada -- este
  // saludo pesa más que cualquier otra señal, cálido antes que
  // competitivo.
  const masReciente = [...jugadosAlgunaVez].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  )[0]
  const diasDesdeUltima = Math.floor((Date.now() - new Date(masReciente.updatedAt).getTime()) / 86400000)
  if (diasDesdeUltima >= 7) {
    return `Hace ${diasDesdeUltima} días que no juegan por acá — ¿retomamos hoy?`
  }

  const conRacha = [...jugadosAlgunaVez].sort((a, b) => b.racha - a.racha)[0]
  if (conRacha.racha >= 2) {
    return `🔥 Vienen con una racha de ${conRacha.racha} en ${conRacha.nombre}. ¿La estiran hoy?`
  }

  // 3. Modo favorito claro (5+ partidas) mientras otro sigue en cero --
  // invita a variedad en vez de repetir siempre lo mismo. Compara
  // contra los 4 juegos (no solo los ya jugados), porque un juego
  // nunca tocado es justamente el caso que este mensaje quiere detectar.
  const favorito = [...bloques].sort((a, b) => b.intentos - a.intentos)[0]
  const menosJugado = [...bloques].sort((a, b) => a.intentos - b.intentos)[0]
  if (favorito.intentos >= 5 && menosJugado.intentos === 0 && favorito.nombre !== menosJugado.nombre) {
    return `${favorito.nombre} es su fuerte. ¿Se animan hoy con ${menosJugado.nombre}?`
  }

  const porDescubrir = jugadosAlgunaVez
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
  const [tab, setTab] = useState<JuegoModo>('normal')
  const [picanteHabilitado, setPicanteHabilitado] = useState(false)
  const [mostrarConsentimiento, setMostrarConsentimiento] = useState(false)

  useEffect(() => {
    getJuegosStatsSummaryAction().then(setStats)
    getPicanteHabilitadoAction().then(setPicanteHabilitado)
  }, [])

  function handleClick(e: React.MouseEvent, href: string) {
    e.preventDefault()
    startTransition(() => {
      router.push(href)
    })
  }

  function cambiarTab(nuevoTab: JuegoModo) {
    if (nuevoTab === 'picante' && !picanteHabilitado) {
      setMostrarConsentimiento(true)
      return
    }
    setTab(nuevoTab)
  }

  async function confirmarPicante() {
    await habilitarPicanteAction()
    setPicanteHabilitado(true)
    setMostrarConsentimiento(false)
    setTab('picante')
  }

  const mensaje = mensajeAdaptativo(stats)
  const juegosDelTab = JUEGOS.filter(j => j.modos.includes(tab))
  const destacados = juegosDelTab.filter(j => j.variante === 'destacado')
  const compactos = juegosDelTab.filter(j => j.variante === 'compacto')
  const especiales = juegosDelTab.filter(j => j.variante === 'especial')

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
        <div className="flex bg-ritual-bg-soft rounded-2xl p-1 mb-3">
          <button
            onClick={() => cambiarTab('normal')}
            className={`flex-1 py-2.5 rounded-xl text-sm font-body font-medium transition-all duration-300 ${
              tab === 'normal' ? 'bg-ritual-gold text-ritual-bg' : 'text-ritual-muted hover:text-ritual-text'
            }`}
          >
            Normal
          </button>
          <button
            onClick={() => cambiarTab('picante')}
            className={`flex-1 py-2.5 rounded-xl text-sm font-body font-medium transition-all duration-300 ${
              tab === 'picante' ? 'bg-[#D4A5A5] text-ritual-bg' : 'text-ritual-muted hover:text-ritual-text'
            }`}
          >
            🔥 Picante
          </button>
        </div>

        {mostrarConsentimiento && (
          <PicanteConsentGate
            onConfirmar={confirmarPicante}
            onCancelar={() => setMostrarConsentimiento(false)}
          />
        )}

        {/* Destacados: cards grandes, un juego por fila */}
        {!mostrarConsentimiento && destacados.map(juego => (
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
        {!mostrarConsentimiento && compactos.length > 0 && (
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
        )}

        {/* Especiales: tratamiento propio (hoy: Ruleta Picante, +18) */}
        {!mostrarConsentimiento && especiales.map(juego => (
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
