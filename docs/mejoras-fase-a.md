# Mejoras Fase A — Resumen y hallazgos

## Resumen

Fase A: lógica de "¿puedo jugar otra ronda?" centralizada en `game-gate.js` (`window.Ritual.canPlayAnotherRound(hasCompletedFirstRound, callback)`). Los tres juegos la usan y se eliminó la función duplicada `puedeNuevaRonda`. Logs de consola eliminados en `auth.js` (cuatro llamadas a `console.warn` / `console.log`).

---

## Hallazgos (pasada rápida)

- **Tailwind config duplicada** — Cada HTML (index, auth, precios, elegir-juego, juego-conexion, juego-picante, juego-eleccion, exito) incluye el mismo bloque `<script> tailwind.config = { ... } </script>` con colores wine/nude/ink y fuentes. Para reducir mantenimiento se podría extraer a un único script o a variables CSS compartidas en una iteración posterior.

- **Estructura de paywall y trial en páginas de juego** — Los tres HTML de juego (juego-conexion, juego-picante, juego-eleccion) repiten el mismo bloque: `#paywall-block`, `#game-content`, `#trial-notice` con las mismas clases y texto. El header (nav con Ritual + Volver) también es idéntico. Opción futura: partial o template si se añade una herramienta de build.

- **Flujo muy similar entre Conexión y Picante** — `juego-conexion.js` y `juego-picante.js` comparten la misma estructura (selector de nivel, lista barajada, anterior/siguiente, ronda completada, otra ronda, cambiar nivel). Se diferencian en nombres de variables (pregunta vs reto, zonaPregunta vs zonaReto). Unificar en un solo módulo sería un refactor mayor; dejado para valorar en Fase B o más adelante.

---

## Próximo paso

Fase B: mejoras de UX y robustez (mensajes cuando falta config o datos, "Volver", doble clic en Suscribirme, etc.).
