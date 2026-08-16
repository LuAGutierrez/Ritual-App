export interface Nivel {
  emoji: string
  nombre: string
  descripcion: string
  desde: number
}

// Umbrales pensados para el ritmo real de uso: un ritual diario ya
// suma ~30 interacciones en un mes, así que "Nosotros" es alcanzable
// con constancia, no un techo inalcanzable. El total que se le pasa a
// nivelActual() es rituales completados + rondas jugadas en Elección,
// Esto o Aquello y ¿Cuánto me conoces? -- los únicos juegos con
// contador persistido hoy.
export const NIVELES: Nivel[] = [
  { emoji: '🌱', nombre: 'Calentando', descripcion: 'Están arrancando a jugar juntos.', desde: 0 },
  { emoji: '❤️', nombre: 'Conociéndonos', descripcion: 'Ya le agarraron la mano al juego en pareja.', desde: 5 },
  { emoji: '🧠', nombre: 'Sin filtros', descripcion: 'Se animan cada vez a preguntas y retos más directos.', desde: 15 },
  { emoji: '🔥', nombre: 'Intenso', descripcion: 'El juego ya es parte de su rutina.', desde: 35 },
  { emoji: '💫', nombre: 'Nosotros', descripcion: 'Construyeron su propia forma de jugar juntos.', desde: 70 },
]

export function nivelActual(totalInteracciones: number): {
  nivel: Nivel
  siguiente: Nivel | null
  faltan: number | null
} {
  let actual = NIVELES[0]
  let siguiente: Nivel | null = null

  for (const n of NIVELES) {
    if (totalInteracciones >= n.desde) {
      actual = n
    }
  }

  const idx = NIVELES.indexOf(actual)
  siguiente = NIVELES[idx + 1] ?? null

  return {
    nivel: actual,
    siguiente,
    faltan: siguiente ? siguiente.desde - totalInteracciones : null,
  }
}
