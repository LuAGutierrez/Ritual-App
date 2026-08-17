export type Intensidad = 'liviana' | 'media' | 'intensa'

const RANGO: Record<Intensidad, number> = { liviana: 0, media: 1, intensa: 2 }

// El techo lo elige la pareja en /perfil (couples.intensidad_maxima,
// migración 038). Se usa en el punto donde cada juego arma su pool de
// contenido, con el mismo criterio de fallback ya probado para
// rechazados/vistos: si el filtro deja muy pocas opciones, se ignora
// y se usa el pool sin filtrar en vez de trabar el juego.
export function dentroDelTecho(item: Intensidad, techo: Intensidad): boolean {
  return RANGO[item] <= RANGO[techo]
}
