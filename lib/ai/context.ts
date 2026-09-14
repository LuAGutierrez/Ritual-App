// Arma el contexto que se le pasa al modelo como tags entre corchetes
// en vez de párrafos -- ver docs/ROADMAP.md "Sistema de créditos",
// sección de optimización de tokens. Menos tokens de entrada = mismo
// costo con Groq (rate limit) y costo real más bajo el día que se
// migre a un proveedor pago (Together AI).
export type ContextInput = {
  animo: string             // elegido por el usuario en el momento (chip de UI: 'cansados' | 'con ganas' | 'jugando' | ...)
  tiempoDisponible: string  // '5m' | '15m' | '30m+'
  objetivo: string          // 'risas' | 'conexion' | 'deseo' | 'sorpresa'
  rachaActual: number
  categoriaFavorita?: string
  edadA?: number
  edadB?: number
}

export function buildContextTags(input: ContextInput): string {
  const partes = [
    input.edadA && input.edadB ? `[Edad: ${input.edadA}/${input.edadB}]` : null,
    `[Ánimo: ${input.animo}]`,
    `[Tiempo: ${input.tiempoDisponible}]`,
    `[Objetivo: ${input.objetivo}]`,
    `[Racha: ${input.rachaActual}d]`,
    input.categoriaFavorita ? `[Favorita: ${input.categoriaFavorita}]` : null,
  ]

  return partes.filter(Boolean).join(' ')
}
