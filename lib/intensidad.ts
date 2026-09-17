export type Intensidad = 'liviana' | 'media' | 'intensa'

const RANGO: Record<Intensidad, number> = { liviana: 0, media: 1, intensa: 2 }

// El techo se elige en la propia pantalla de cada juego, efímero por
// sesión (antes era couples.intensidad_maxima configurado en /perfil,
// migración 038 -- se sacó el 17/09/2026, ver docs/DECISIONES.md: casi
// nadie entraba a /perfil a configurarlo antes de jugar). Se usa en el
// punto donde cada juego arma su pool de contenido, con el mismo
// criterio de fallback ya probado para rechazados/vistos: si el filtro
// deja muy pocas opciones, se ignora y se usa el pool sin filtrar en
// vez de trabar el juego.
export function dentroDelTecho(item: Intensidad, techo: Intensidad): boolean {
  return RANGO[item] <= RANGO[techo]
}
