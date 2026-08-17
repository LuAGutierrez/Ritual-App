import { useState, useRef, useEffect } from 'react'

// Probabilidad de ofrecer "¿Doble o nada?" después de una
// coincidencia/acierto. Baja a propósito -- si apareciera siempre,
// dejaría de sentirse como un evento especial.
const PROBABILIDAD_OFERTA = 0.35

// Evento especial "Doble o Nada": después de coincidir/acertar, a
// veces se ofrece jugar otra ronda con el marco de "double or
// nothing" -- si vuelven a coincidir, ganan algo especial; si no, no
// pasa nada más que lo que ya pasaba (se corta la racha, como siempre).
// No persiste nada en la base: es la misma ronda de siempre, solo
// cambia el marco/copy alrededor. Compartido por Elección, Esto o
// Aquello y ¿Cuánto me conoces? -- los 3 juegos con reveal de
// coincidencia/acierto.
export function useDobleONada(revelado: boolean, coincidio: boolean, roundId: string | undefined) {
  const [ofrecer, setOfrecer] = useState(false)
  const [enJuego, setEnJuego] = useState(false)
  const checkedRef = useRef<string | null>(null)

  useEffect(() => {
    if (!revelado || !roundId || checkedRef.current === roundId) return
    checkedRef.current = roundId
    if (!enJuego && coincidio) {
      setOfrecer(Math.random() < PROBABILIDAD_OFERTA)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [revelado, coincidio, roundId])

  function aceptar() {
    setOfrecer(false)
    setEnJuego(true)
  }

  function reset() {
    setOfrecer(false)
    setEnJuego(false)
  }

  return { ofrecer, enJuego, aceptar, reset }
}
