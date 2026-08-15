---
name: no-slop
description: Quality gate for this repo (Rituales) — read before saying any code change is "done", and before designing any new page/section/gallery. Catches the concrete failure modes that have actually happened in this project — unverified claims, hydration mismatches, timezone bugs, category-map drift, scope creep, generic div-card-with-emoji layouts — not generic advice. Triggers on finishing any edit to app/, components/, lib/, or supabase/migrations; on any new UI list/grid/gallery; and before any message that says "listo", "funciona", "debería andar", or similar.
---

# No-slop — antes de decir "listo"

Este proyecto ya se comió estos bugs una vez. No los repitas.

## 1. No afirmes que algo funciona sin probarlo

- "Debería funcionar" no es una verificación. Si tocaste una página o componente con estado/interacción,
  abrila en el navegador (Chrome ya conectado) y probá el flujo real, no solo que cargue.
- Corré `npx tsc --noEmit` después de cualquier cambio en `.ts`/`.tsx` antes de dar por terminado.
- Si agregaste una Server Action nueva, probá al menos el camino feliz end-to-end, no solo que compile.
- Si el cambio toca algo que depende de dos usuarios (Realtime, `couple_*`), no alcanza con un solo
  navegador: simulá el segundo lado (otra pestaña, o un `UPDATE` directo vía `execute_sql`) y confirmá
  que el primero lo recibe sin recargar. Decilo explícitamente si no lo probaste con dos personas reales.

## 2. Hidratación: nada de `Math.random()` / `new Date()` en el primer render

Ya pasó en `esto-o-aquello`: un `useState(() => shuffle(...))` corría en servidor y cliente con resultados
distintos y tiraba "Text content does not match server-rendered HTML".

- Cualquier aleatoriedad o fecha que afecte el HTML inicial de un client component va en `useEffect`
  (después del mount), nunca en el cuerpo del componente o en la inicialización de `useState`.
- Si ves ese error de hidratación en la consola/overlay de Next, es esto. No lo ignores ni lo tapes con
  un `suppressHydrationWarning`.

## 3. Fechas: siempre zona horaria de Argentina, nunca UTC crudo

`new Date().toISOString().split('T')[0]` da la fecha en UTC. Este server corre en UTC (Vercel, sin `TZ`
seteado) y el producto es para Argentina (ART = UTC-3) — usarlo corta el "día" a las 21:00 ART, justo la
franja de uso principal ("ritual antes de dormir"). Ya rompió la racha por esto una vez.

- Para cualquier lógica de "qué día es hoy" que afecte `session_date`, `last_completed_date`, streaks,
  o cualquier corte diario: usá `new Date().toLocaleDateString('en-CA', { timeZone: 'America/Argentina/Buenos_Aires' })`.
- Para sumar/restar días sobre una fecha así, no uses `new Date(dateStr)` a secas (ambigüedad de timezone
  al parsear `YYYY-MM-DD`). Construí con `Date.UTC(year, month-1, day)` y operá con métodos `UTC*`.
- Si agregás una fecha nueva en cualquier parte del código, preguntate: ¿esto corta el día a medianoche
  ART o a medianoche UTC? Si no estás seguro, no está bien.

## 4. `RitualCategory` y mapas `Record<RitualCategory, ...>`

Ya rompió el build una vez: se sacaron categorías de `CATEGORY_COLORS`/`CATEGORY_LABELS` en
`app/historial/page.tsx` sin sacarlas del type `RitualCategory` en `types/index.ts` (o viceversa).

- Si tocás `RitualCategory` en `types/index.ts`, grepeá `Record<RitualCategory` en todo el repo
  (hoy: `app/historial/page.tsx`, `components/RitualCard.tsx`) y actualizá cada mapa.
- `tsc --noEmit` lo detecta — pero solo si lo corrés. Ver punto 1.

## 5. No agregues lo que no te pidieron

- Nada de features, refactors, abstracciones o "ya que estoy" fuera del pedido concreto. Si ves algo que
  vale la pena arreglar de paso, decilo y preguntá — no lo hagas en silencio dentro del mismo commit.
- No comentarios explicando el QUÉ (los nombres ya lo dicen). Solo el PORQUÉ cuando no sea obvio
  (constraint oculto, workaround, bug histórico como los de este archivo).
- Contenido/copy nuevo (rituales, juegos, prompts) va en español rioplatense con voseo, tono consistente
  con lo existente en `lib/juegos.ts` y las migraciones de `rituals` — no genérico ni traducido.

## 6. Diseño: no la primera idea genérica

El patrón "card genérica" (`bg-ritual-bg-soft border border-white/8 rounded-2xl p-6`, documentado como
"Card de contenido" en `docs/DESIGN-SYSTEM.md`) es un piso para contenido simple, no la respuesta por
defecto para cualquier pantalla o galería nueva. Ejemplo real ya en el repo: `/juegos` es una columna de
divs con borde redondeado, emoji a la izquierda, título y descripción — es el patrón más obvio posible,
repetido para cada ítem.

- Antes de armar una lista, grid o galería nueva (juegos, categorías, opciones, features), pensá 2-3
  composiciones distintas y elegí una que no sea "columna de cards idénticas con ícono a la izquierda".
  Alternativas: grid asimétrico, tamaños de card variables según jerarquía, tipografía grande
  (`font-display`) como elemento visual en vez de ícono, numeración u orden como parte del diseño,
  composición editorial en vez de lista repetida ítem por ítem.
- Nada de emoji sueltos como "ícono" de cada entrada de una galería (🎲⚡🔥💫 al lado de cada card). Si
  hace falta un glifo, diseñalo como SVG de línea fina consistente con `components/BottomNav.tsx`
  (`stroke="currentColor"`, geometría simple, sin relleno), no eches mano al emoji más obvio de Unicode
  como atajo.
- Esto no es licencia para romper el sistema de diseño — paleta, tipografía y el tono oscuro/nocturno de
  `docs/DESIGN-SYSTEM.md` siguen firmes. Es licencia para variar la COMPOSICIÓN dentro de esa identidad,
  no para inventar una estética nueva por pantalla.
- Si dudás entre la opción obvia y una menos obvia, elegí la menos obvia y mostrá las dos si hace falta
  confirmar — no asumas que la primera idea es la mejor solo porque compila más rápido.

## 7. Migraciones y funciones SQL: ejecutá la función, no la leas nomás

Ya pasó: `check_invite_code` se marcó `STABLE` en la migración 021 mientras hacía un `INSERT` para
rate-limiting adentro. Postgres tira "INSERT is not allowed in a non-volatile function" al ejecutarla —
pero leyendo el SQL nada de eso saltaba a la vista, y `tsc --noEmit` no lo detecta porque no es un error
de TypeScript. Rompió el link de invitación entero en producción hasta que alguien lo probó de verdad.

- Antes de dar por buena una función `STABLE`/`IMMUTABLE`, releela línea por línea buscando
  `INSERT`/`UPDATE`/`DELETE` en el cuerpo. Si escribe algo, no puede ser `STABLE` ni `IMMUTABLE` — sacale
  la marca (default `VOLATILE`).
- Nunca alcanza con leer la migración y "parece correcta". Después de aplicarla (`npx supabase db push`),
  llamá la función real vía RPC (o el flujo de la app que la dispara) y mirá que no tire error — no
  solo que la migración se haya aplicado sin errores de sintaxis.
- Si la función depende de `auth.uid()` (la mayoría de las `SECURITY DEFINER` de este repo), probarla con
  `execute_sql` como superusuario no sirve: no hay sesión de usuario. Hay que dispararla desde el flujo
  real de la app (navegador logueado, o un usuario de test) para que el `auth.uid()` no sea `NULL`.
- Si el flujo involucra "usuario nuevo que nunca pasó por acá" (unirse a pareja, primer registro, primer
  invite), probalo con una cuenta de test nueva, no con tu cuenta ya-onboardeada — el camino de "primera
  vez" (primer `INSERT` en una tabla, primera fila de un estado) es justo el que no se ejercita si siempre
  reusás la misma cuenta.

## 8. Antes de commitear

- `git status` y `git diff` — confirmá que lo que vas a commitear es lo que de verdad cambiaste, nada de
  un `git add -A` a ciegas.
- Separá commits por concern real, no por "todo lo que hice hoy" en uno solo.
- Si el cambio toca `supabase/migrations/`, confirmá que se aplicó (`npx supabase migration list --linked`
  muestra Local y Remote alineados) antes de decir que está listo.
