---
name: qe-triaje
description: QE triage for this repo (Rituales) — classify the SCOPE of verification a change needs (Trivial/Mediano/Grande) before writing or running any tests, so trivial copy/CSS tweaks don't get full E2E treatment and risky changes (auth, pagos, migraciones, config global) don't get skipped. Triggers at the start of any code task, before deciding how to verify it — complements no-slop (which governs HOW to verify once you know the tier). State the triage line before finishing the task.
---

# QE Triaje — Análisis de Impacto Gradual

Hay una pirámide chica de tests: `npm run test:unit` (Vitest, siempre), `npm run test:sql`
(RPCs/RLS contra `npx supabase start`) y `npm run test:e2e` (Playwright, landing / auth / ritual).
"Testear" acá significa: correr esa suite según el nivel, `tsc --noEmit`, y para cambios 🔴 de UI
probar de verdad en el navegador. El navegador no se reemplaza en flujos visuales; los tests
automatizan lo que ya nos rompió (fecha ART, RLS, invite, humo de login).
**[[no-slop]]** define **cómo** verificar hidratación, timezone y migraciones una vez que sabés el nivel.

No son la misma pregunta: esta skill triaje corre primero, al planificar el cambio. No-slop corre al
final, antes de decir "listo". Un cambio 🟢 Trivial nunca dispara el checklist de no-slop porque no toca
nada con estado/interacción — no hay contradicción, son puertas distintas.

## 1. Clasificá el cambio antes de tocar código

### 🟢 TRIVIAL — sin acción de testing
- Copys, textos, traducciones.
- CSS/HTML puro (márgenes, colores, padding) sin lógica de estado.
- Elementos de UI estáticos, botones sin handler o con un handler trivial (ej. `router.push` fijo)
  y sin efecto secundario.
- Diffs de menos de ~20 líneas en un componente aislado, sin nada río abajo que dependa del cambio.
- **Acción**: `npx tsc --noEmit`. Si tocaste `.ts`/`.tsx`, `npm run test:unit`. No abras el navegador para esto, no
  redactes un "plan de pruebas" para un cambio de color.

### 🟡 MEDIANO — verificación focalizada
- Funciones puras, helpers, hooks nuevos o modificados (`lib/*.ts`).
- Componentes con estado local simple (un toggle, un formulario chico) sin escritura a la base.
- Refactors aislados que no cambian ninguna firma que otro archivo consuma.
- **Acción**: `npx tsc --noEmit` + `npm run test:unit` + probar el camino feliz y el borde obvio (campo vacío, valor límite)
  en el navegador si hay interacción real. No hace falta tocar otras pantallas ni simular una segunda
  persona.

### 🔴 GRANDE / ALTO RIESGO — verificación completa
- Cualquier `supabase/migrations/*.sql` nuevo: columnas, RPCs, RLS, triggers.
- Auth, sesión, `middleware.ts`, Server Actions que escriben datos de pareja/pago.
- Mercado Pago, Web Push, cualquier cosa que mande plata o notifique a alguien.
- Flujos de dos personas (`couple_ritual_sessions`, `couple_*_rounds`, invitación/reveal) —
  cualquier cosa donde "funciona" depende de lo que ve el OTRO lado de la pareja.
- Diffs grandes en lógica de negocio (referencia: la barra de 300 líneas de la versión genérica de
  esta skill sirve como orden de magnitud, no como número mágico en un repo de este tamaño).
- **Acción**:
  1. `npx tsc --noEmit` y `npm run test:unit`.
  2. Si tocaste migraciones o RPCs: `npx supabase start` (si no está) y `npm run test:sql`.
  3. Camino feliz de punta a punta en el navegador, con cuenta real (no asumir que compila = que anda).
     Si el cambio toca landing, auth o `/ritual`, `npm run test:e2e`.
  4. Si es una función/RPC de Postgres: ejecutarla de verdad con `set local role authenticated` +
     `request.jwt.claims`, o vía el flujo real de la app — nunca alcanza con leerla (ver no-slop §7,
     el caso `check_invite_code` marcado `STABLE` con un `INSERT` adentro).
  5. Si depende de dos personas (Realtime, invitación, reveal): simulá el segundo lado de verdad —
     otra cuenta real, no un mock. El patrón que ya funcionó en este repo: registrar una cuenta B
     descartable y pegarle a las RPCs (`join_couple_by_invite`, `submit_*_choice`) vía REST con su
     `access_token` real, sin tocar la pestaña/sesión de la cuenta A que estás observando.
  6. Limpiar los datos de prueba (SQL) al terminar — no dejar cuentas/parejas de QA colgadas en prod.

## 2. Regla de riesgo oculto: pocas líneas no significa trivial

Aunque el diff tenga menos de 5 líneas, subilo automáticamente a 🔴 GRANDE si toca:
1. `middleware.ts`, `.env*`, cualquier config de auth/CORS/rutas protegidas.
2. Una tabla o RPC compartida por varias pantallas (`profiles`, `couples`, `couple_members`,
   `couple_ritual_sessions`).
3. Sesión, cookies, tokens, o cualquier cosa que decida quién es el usuario.
4. Parámetros que le pegan a Mercado Pago, Resend, Google OAuth o Web Push.

Ya pasó en este repo: la migración `004` que solo copiaba `id`/`email` en el trigger de signup era
"chica" pero rompía el guardado del nombre para cualquier registro por email — ese es exactamente el
tipo de cambio de 3 líneas que la regla de arriba obliga a tratar como 🔴, no como 🟢.

## 3. Formato de respuesta

Antes de dar por terminada una tarea de código, mostrá esta línea (una vez, no por archivo):

```
[QE Triaje]: <🟢 TRIVIAL | 🟡 MEDIANO | 🔴 GRANDE>
[Justificación]: <por qué esta categoría, en una frase>
[Plan de pruebas]: <qué se hizo — ninguna / tsc + test:unit / tsc + unit + sql + e2e / navegador + RPC real + limpieza>
```

Si mientras trabajás el alcance real resulta mayor al que pensabas al arrancar (por ejemplo, un cambio
que parecía 🟡 termina tocando una RPC compartida), subí la categoría y decilo — no ajustes la
justificación para que encaje con el testing que ya hiciste.
