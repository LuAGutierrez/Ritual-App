# Mejoras Fase A — Resumen y hallazgos

## Resumen

Fase A: lógica de "¿puedo jugar otra ronda?" centralizada en `game-gate.js` (`window.Ritual.canPlayAnotherRound(hasCompletedFirstRound, callback)`). Los tres juegos la usan y se eliminó la función duplicada `puedeNuevaRonda`. Logs de consola eliminados en `auth.js` (cuatro llamadas a `console.warn` / `console.log`).

---

## Hallazgos (pasada rápida) — corregidos

- **Tailwind config duplicada** — Corregido: creado `js/tailwind-config.js` como única fuente; todos los HTML cargan ese script en lugar del bloque inline.

- **Estructura de paywall y trial en páginas de juego** — Corregido: creado `docs/fragments/game-common.html` como fuente única del bloque común (header, paywall, game-content, trial-notice, sin-datos). Al editar, copiar a los tres HTML de juego. Ver `docs/fragments/README.md`.

- **Flujo muy similar entre Conexión y Picante** — Corregido: creado `js/juego-niveles.js` con la lógica unificada; `juego-conexion.js` y `juego-picante.js` son wrappers que llaman a `Ritual.initJuegoNiveles(opts)` con distintas opciones.

---

## Próximo paso

Fase B: mejoras de UX y robustez (mensajes cuando falta config o datos, "Volver", doble clic en Suscribirme, etc.).
