# Diseño: Mejoras Fase A (código y consistencia)

**Fecha:** 2025-02-28  
**Alcance:** Enfoque 1 — mínimo y claro. Primero A, después B (UX y robustez).

---

## Resumen

Centralizar la lógica de "¿puede jugar otra ronda?" en `game-gate.js`, quitar todos los `console.*` de `auth.js` y hacer una pasada rápida de consistencia documentando hallazgos en `docs/mejoras-fase-a.md` para decidir después.

---

## Sección 1: game-gate.js

- Asegurar `window.Ritual = window.Ritual || {}` al inicio del IIFE.
- Añadir `window.Ritual.canPlayAnotherRound(hasCompletedFirstRound, callback)`:
  - Si `hasCompletedFirstRound === false` → `callback(true)` sin petición.
  - Si `hasCompletedFirstRound === true` → llamar `RitualAuth.checkGameAccess()`; según resultado llamar `callback(true)` o `callback(false)`; en error `callback(false)`.
- Implementar dentro del mismo IIFE del gate y asignar antes de ejecutar `runGate()`.

---

## Sección 2: Tres juegos

**Archivos:** `js/juego-conexion.js`, `js/juego-picante.js`, `js/juego-eleccion.js`.

- En cada uno: eliminar la función local `puedeNuevaRonda`.
- Reemplazar cada llamada por `window.Ritual.canPlayAnotherRound(primeraRondaCompletada, function(ok) { ... })`, manteniendo el mismo comportamiento (si `!ok` y existe `RitualShowPaywall`, llamarlo; si `ok`, ejecutar la acción actual).

---

## Sección 3: auth.js

- Quitar: `console.warn('auth.js cargado');`, `console.warn('getClient()', supabase);`, `console.warn('initClient Supabase key (first 10):', ...);`, y la línea `console.log('[Ritual] createMpSubscription catch:', e);` en el catch de `createMpSubscription`.

---

## Sección 4: Pasada rápida y documento

- Tras implementar 1–3, revisar `js/*.js` y HTML de juegos en busca de duplicación o inconsistencia obvia (solo anotar, sin cambios).
- Crear `docs/mejoras-fase-a.md` con: resumen de lo hecho en Fase A y lista de hallazgos (título, archivo/zona, descripción breve). Si no hay hallazgos, indicarlo. Opcional: "Próximo paso: Fase B".

---

## Próximo paso

Invocar skill **writing-plans** para generar el plan de implementación (tareas concretas y orden de ejecución).
