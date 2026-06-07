# Memoria nuestra — Plan de implementación

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Añadir el cuarto juego "Memoria nuestra": cada uno escribe en secreto su recuerdo, se revelan las dos respuestas y charlan. Sin rondas; siguiente pregunta hasta acabar el banco.

**Architecture:** Nuevo HTML y JS siguiendo el patrón de juego-eleccion (paywall, game-content, fases). Datos en `RitualDatos.memoria`; una baraja al entrar; fases: respuesta 1 → respuesta 2 → revelar → Siguiente (o pantalla "Se acabaron las memorias"). Mismo game-gate que el resto; actualizar texto del paywall a "las experiencias".

**Tech Stack:** HTML, JS vanilla, Tailwind, Supabase (solo gate de acceso). Verificación manual en navegador.

---

## Task 1: Datos — array `memoria` en datos-juegos.js

**Files:**
- Modify: `js/datos-juegos.js`

**Step 1: Añadir el bloque `memoria`**

Dentro de `window.RitualDatos`, después del cierre de `eleccion` (antes del `};` final), añadir:

```js
  memoria: [
    "¿Dónde nos besamos la primera vez?",
    "¿Qué película vimos en nuestra primera cita?",
    "¿Cuál fue el primer regalo que nos dimos?",
    "¿En qué lugar nos declaramos o dijimos «te quiero» por primera vez?",
    "¿Qué canción asociás a nosotros y por qué?",
    "¿Cuál fue nuestra primera pelea y cómo la recodás?",
    "¿Qué comida compartimos en una cita que nunca olvidaste?",
    "¿Qué momento nuestro te hace sonreír solo de pensarlo?",
    "¿Dónde nos conocimos y qué recordás de ese día?",
    "¿Qué viaje o salida fue un punto de inflexión para la relación?",
    "¿Qué cosa tonta nos hace reír a los dos?",
    "¿Cuál fue la primera vez que sentiste que esto era en serio?",
    "¿Qué tradición nuestra nació sin planearla?",
    "¿Qué detalle del otro te enamoró al principio?",
    "¿Qué momento te gustaría repetir tal cual?",
  ],
```

**Step 2: Verificar**

Abrir consola en cualquier página que cargue `datos-juegos.js`. Ejecutar `window.RitualDatos.memoria.length` → 15. `window.RitualShuffle(window.RitualDatos.memoria.slice())[0]` → alguna pregunta.

**Step 3: Commit**

```bash
git add js/datos-juegos.js
git commit -m "feat(datos): add memoria questions for fourth game"
```

---

## Task 2: Paywall — texto "las experiencias" en game-gate.js

**Files:**
- Modify: `js/game-gate.js`

**Step 1: Actualizar el texto del paywall**

En la función `showPaywall`, donde se asigna `desc.textContent` para el caso sin `result.needsEmailConfirmation`, cambiar:

De: `'Para jugar necesitás una suscripción activa. Suscribite y accedé a las tres experiencias.'`

A: `'Para jugar necesitás una suscripción activa. Suscribite y accedé a todas las experiencias.'`

**Step 2: Verificar**

Con sesión sin suscripción (o simulando paywall), el bloque debe mostrar "todas las experiencias".

**Step 3: Commit**

```bash
git add js/game-gate.js
git commit -m "copy: paywall text to 'todas las experiencias'"
```

---

## Task 3: elegir-juego.html — cuarta tarjeta Memoria nuestra

**Files:**
- Modify: `elegir-juego.html`

**Step 1: Añadir la tarjeta**

Dentro del `grid` de experiencias, después del `<a href="juego-eleccion.html">...</a>` (Experiencia 3), añadir:

```html
      <a href="juego-memoria.html" class="block p-6 sm:p-8 rounded-2xl bg-white/[0.03] border border-white/5 hover:border-wine/40 transition text-left no-underline">
        <span class="text-wine text-sm uppercase tracking-wider">Experiencia 4</span>
        <h2 class="font-display text-2xl text-nude mt-4 mb-3">Memoria nuestra</h2>
        <p class="text-nude-muted text-sm leading-relaxed">Escriban en secreto cómo recuerdan un momento. Después revelamos y charlan.</p>
        <span class="inline-block mt-4 text-wine-light text-sm">Jugar →</span>
      </a>
```

**Step 2: Verificar**

Abrir `elegir-juego.html`. Debe verse la cuarta tarjeta y el enlace a `juego-memoria.html`.

**Step 3: Commit**

```bash
git add elegir-juego.html
git commit -m "feat: add Memoria nuestra card to game picker"
```

---

## Task 4: juego-memoria.html — página del juego

**Files:**
- Create: `juego-memoria.html`

**Step 1: Crear el archivo**

Usar la misma estructura que `juego-eleccion.html`: mismo `<head>` (title "Memoria nuestra — Ritual"), mismo header con Volver, mismo bloque de paywall y game-content (paywall-block, paywall-block-desc, game-content, trial-notice, sin-datos). Dentro de game-content:

- Título: "Experiencia 4", "Memoria nuestra", subtítulo "Escriban en secreto. Después revelamos."
- `id="paso-1"`: texto "Persona 1: escribí tu respuesta (la otra no mira)." + `<p id="pregunta-texto" class="font-display text-lg text-nude mb-4"></p>` + `<textarea id="textarea-1" ... rows="4" class="w-full ...">` + botón `id="btn-listo-1"` "Listo, pasale al otro".
- `id="paso-2"` class="hidden": mismo texto de pregunta (duplicado o se rellena por JS), "Persona 2: escribí tu respuesta.", textarea `id="textarea-2"`, botón `id="btn-revelar"` "Revelar".
- `id="paso-3"` class="hidden": `id="pregunta-revelar"` (pregunta), dos bloques con `id="respuesta-1"` y `id="respuesta-2"` (etiqueta "Uno" / "Dos" y el texto), botón `id="btn-siguiente"` "Siguiente".
- `id="paso-4"` class="hidden": p con `id="fin-mensaje"` "Se acabaron las memorias por ahora.", enlace o botón "Volver a experiencias" a `elegir-juego.html`.

Scripts en orden: supabase, supabase-config, app, auth, datos-juegos, game-gate, juego-memoria. Inline script para btn-volver (referrer o elegir-juego.html).

**Step 2: Verificar**

Abrir `juego-memoria.html`. Debe cargar; con acceso debe verse paso-1 (y la pregunta vacía hasta que juego-memoria.js la rellene). Sin datos debe mostrarse sin-datos.

**Step 3: Commit**

```bash
git add juego-memoria.html
git commit -m "feat: add juego-memoria.html page structure"
```

---

## Task 5: juego-memoria.js — lógica del juego

**Files:**
- Create: `js/juego-memoria.js`

**Step 1: IIFE e init**

Al cargar (o tras `ritual-game-access-granted`), si `RitualGameAccess === false` return. Si no hay `window.RitualDatos || !window.RitualDatos.memoria` o array vacío, mostrar sin-datos y ocultar pasos; return. Copia barajada: `var preguntas = window.RitualShuffle(window.RitualDatos.memoria.slice()); var index = 0;`. Referencias a todos los IDs (paso-1..4, pregunta-texto, textarea-1, textarea-2, respuesta-1, respuesta-2, btn-listo-1, btn-revelar, btn-siguiente, fin-mensaje).

**Step 2: Mostrar una pregunta (fase 1)**

Función `mostrarPregunta()`: si `index >= preguntas.length`, mostrar paso-4 (ocultar 1,2,3), return. Pregunta actual = `preguntas[index]`. Rellenar pregunta-texto en paso-1 y en paso-2 (o un solo elemento que se clona/muestra en ambos). Limpiar textarea-1 y textarea-2. Ocultar paso-2, paso-3, paso-4; mostrar paso-1.

**Step 3: Paso 1 → Paso 2**

btn-listo-1 click: guardar `respuesta1 = textarea-1.value.trim()` (permir vacío). Ocultar paso-1, mostrar paso-2; rellenar la pregunta en paso-2; focus en textarea-2.

**Step 4: Paso 2 → Revelación**

btn-revelar click: guardar `respuesta2 = textarea-2.value.trim()`. Ocultar paso-1 y paso-2; mostrar paso-3. En respuesta-1 mostrar respuesta1 || "—"; en respuesta-2 mostrar respuesta2 || "—". Pregunta en paso-3 con el mismo texto.

**Step 5: Siguiente**

btn-siguiente click: index++. Llamar a mostrarPregunta() (siguiente pregunta o pantalla fin).

**Step 6: Inicio**

Llamar a mostrarPregunta() al iniciar (cuando hay datos y acceso).

**Step 7: Verificar**

Flujo completo: elegir Memoria nuestra → escribir persona 1 → Listo → escribir persona 2 → Revelar → ver las dos respuestas → Siguiente → siguiente pregunta. Probar respuesta vacía en uno o ambos → se muestra "—". Probar hasta acabar la lista → "Se acabaron las memorias". Volver desde header y reentrar → baraja nueva (no persistir).

**Step 8: Commit**

```bash
git add js/juego-memoria.js
git commit -m "feat: add juego-memoria.js game logic"
```

---

## Task 6: Paywall copy en páginas HTML (opcional consistencia)

**Files:**
- Modify: `juego-conexion.html`, `juego-picante.html`, `juego-eleccion.html`

**Step 1:** En cada uno, dentro del paywall-block, cambiar el p con id `paywall-block-desc` de "las tres experiencias" a "todas las experiencias" para coincidir con game-gate.

**Step 2: Commit**

```bash
git add juego-conexion.html juego-picante.html juego-eleccion.html
git commit -m "copy: paywall desc to 'todas las experiencias' in game pages"
```

---

## Execution

Plan guardado en `docs/plans/2025-03-01-memoria-nuestra.md`. Dos opciones de ejecución:

1. **Subagent-Driven (esta sesión)** — Ir tarea por tarea en esta sesión, revisando entre tareas.
2. **Sesión paralela** — Abrir una sesión nueva con executing-plans en el worktree y ejecutar por lotes con checkpoints.

¿Querés que implemente las tareas ahora (Tasks 1–6) en esta sesión?
