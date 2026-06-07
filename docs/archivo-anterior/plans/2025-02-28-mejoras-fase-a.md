# Mejoras Fase A — Plan de implementación

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Centralizar la lógica "¿puede jugar otra ronda?" en game-gate.js, quitar logs de auth.js y documentar hallazgos de una pasada de consistencia.

**Architecture:** Se expone `window.Ritual.canPlayAnotherRound(hasCompletedFirstRound, cb)` desde el gate; los tres juegos eliminan su función local y llaman a esta API. Auth deja de usar console. Tras los cambios, una pasada de lectura genera `docs/mejoras-fase-a.md` con hallazgos.

**Tech Stack:** Vanilla JS, HTML; Sin tests automatizados — verificación manual en navegador.

---

## Task 1: game-gate.js — exponer Ritual y canPlayAnotherRound

**Files:**
- Modify: `js/game-gate.js`

**Step 1: Asegurar window.Ritual al inicio del IIFE**

Tras la línea `(function() {`, añadir:

```js
  window.Ritual = window.Ritual || {};
```

**Step 2: Añadir la función canPlayAnotherRound**

Antes de `if (document.readyState === 'loading')` (donde empieza el init), añadir:

```js
  function canPlayAnotherRound(hasCompletedFirstRound, cb) {
    if (!hasCompletedFirstRound) {
      cb(true);
      return;
    }
    if (!window.RitualAuth) {
      cb(false);
      return;
    }
    window.RitualAuth.checkGameAccess().then(function(r) {
      cb(!!r && !!r.allowed);
    }).catch(function() {
      cb(false);
    });
  }
  window.Ritual.canPlayAnotherRound = canPlayAnotherRound;
```

**Step 3: Verificar**

Abrir en navegador una página de juego (ej. `juego-conexion.html`). En consola: `window.Ritual.canPlayAnotherRound(false, console.log)` → debe llamar a console.log con `true`. `window.Ritual.canPlayAnotherRound(true, console.log)` (con sesión/trial o localhost) → debe devolver true o false según acceso.

**Step 4: Commit**

```bash
git add js/game-gate.js
git commit -m "refactor(gate): expose canPlayAnotherRound on window.Ritual"
```

---

## Task 2: juego-conexion.js — usar Ritual.canPlayAnotherRound

**Files:**
- Modify: `js/juego-conexion.js`

**Step 1: Eliminar la función puedeNuevaRonda**

Borrar el bloque completo (aprox. líneas 56–62):

```js
    function puedeNuevaRonda(cb) {
      if (!primeraRondaCompletada) { cb(true); return; }
      if (!window.RitualAuth) { cb(false); return; }
      window.RitualAuth.checkGameAccess().then(function(r) {
        cb(!!r && !!r.allowed);
      }).catch(function() { cb(false); });
    }
```

**Step 2: Sustituir llamadas a puedeNuevaRonda**

Reemplazar cada `puedeNuevaRonda(function(ok) {` por `window.Ritual.canPlayAnotherRound(primeraRondaCompletada, function(ok) {`. Son 3 sitios: selector de nivel (forEach del nivel-btn), btn Otra ronda, y no debe quedar ninguna referencia a `puedeNuevaRonda`.

**Step 3: Verificar**

Abrir `juego-conexion.html`, elegir nivel, pasar preguntas hasta "Ronda completada", pulsar "Otra ronda" y "Cambiar nivel" y volver a elegir nivel. Comportamiento igual que antes.

**Step 4: Commit**

```bash
git add js/juego-conexion.js
git commit -m "refactor(conexion): use Ritual.canPlayAnotherRound"
```

---

## Task 3: juego-picante.js — usar Ritual.canPlayAnotherRound

**Files:**
- Modify: `js/juego-picante.js`

**Step 1: Eliminar la función puedeNuevaRonda**

Borrar el bloque completo de `function puedeNuevaRonda(cb) { ... }` (misma forma que en conexión).

**Step 2: Sustituir llamadas**

Reemplazar cada `puedeNuevaRonda(function(ok) {` por `window.Ritual.canPlayAnotherRound(primeraRondaCompletada, function(ok) {`. Son 2 sitios.

**Step 3: Verificar**

Abrir `juego-picante.html`, elegir nivel, completar una ronda, "Otra ronda". Comportamiento igual.

**Step 4: Commit**

```bash
git add js/juego-picante.js
git commit -m "refactor(picante): use Ritual.canPlayAnotherRound"
```

---

## Task 4: juego-eleccion.js — usar Ritual.canPlayAnotherRound

**Files:**
- Modify: `js/juego-eleccion.js`

**Step 1: Eliminar la función puedeNuevaRonda**

Borrar el bloque completo de `function puedeNuevaRonda(cb) { ... }`.

**Step 2: Sustituir llamada**

Reemplazar la única llamada `puedeNuevaRonda(function(ok) {` por `window.Ritual.canPlayAnotherRound(primeraRondaCompletada, function(ok) {` en el handler de btn Otra.

**Step 3: Verificar**

Abrir `juego-eleccion.html`, elegir opciones, revelar, pulsar "Otra". Comportamiento igual.

**Step 4: Commit**

```bash
git add js/juego-eleccion.js
git commit -m "refactor(eleccion): use Ritual.canPlayAnotherRound"
```

---

## Task 5: auth.js — quitar console.warn y console.log

**Files:**
- Modify: `js/auth.js`

**Step 1: Quitar los tres console.warn**

- Eliminar la línea: `console.warn('auth.js cargado');`
- Dentro de `getClient()`, eliminar: `console.warn('getClient()', supabase);`
- Dentro de `initClient()`, eliminar: `console.warn('initClient Supabase key (first 10):', window.RitualSupabase.anonKey?.slice(0,10));`

**Step 2: Quitar el console.log del catch**

En el `catch` de `createMpSubscription`, eliminar la línea:  
`if (typeof console !== 'undefined' && console.log) console.log('[Ritual] createMpSubscription catch:', e);`

**Step 3: Verificar**

Recargar una página que use auth (index, precios, auth). Consola sin mensajes de auth al cargar ni al hacer login/registro. Probar "Suscribirme" (puede fallar por config); no debe aparecer log del catch.

**Step 4: Commit**

```bash
git add js/auth.js
git commit -m "chore(auth): remove console.warn and console.log"
```

---

## Task 6: Pasada rápida y docs/mejoras-fase-a.md

**Files:**
- Create: `docs/mejoras-fase-a.md`

**Step 1: Revisar js/**  

Leer `js/*.js` en busca de: mismos bloques de lógica repetidos, mismo patrón de manejo de errores o DOM, constantes/config duplicadas. Anotar archivo y línea o zona.

**Step 2: Revisar HTML de juegos**

Revisar `juego-conexion.html`, `juego-picante.html`, `juego-eleccion.html`: estructura del paywall, botones, ids. Anotar si hay copy-pega evidente.

**Step 3: Escribir docs/mejoras-fase-a.md**

Contenido:

- **Resumen:** "Fase A: lógica de otra ronda centralizada en game-gate.js (Ritual.canPlayAnotherRound), logs eliminados en auth.js."
- **Hallazgos:** Lista de ítems con título corto, archivo(s) y descripción breve. Si no hay ninguno: "No se detectó duplicación obvia en la pasada."
- Opcional: "Próximo paso: Fase B (UX y robustez)."

**Step 4: Commit**

```bash
git add docs/mejoras-fase-a.md
git commit -m "docs: add Phase A summary and consistency pass findings"
```

---

## Execution

Plan completo. Dos opciones de ejecución:

1. **Subagent-Driven (esta sesión)** — Ir tarea por tarea en esta sesión, revisando entre tareas.
2. **Manual** — Seguir el plan vos mismo; los pasos están en `docs/plans/2025-02-28-mejoras-fase-a.md`.

¿Querés que implemente yo las tareas ahora (Task 1 a 6) en esta sesión?
