# Deuda técnica y oportunidades de mejora — Rituales

Última actualización: 17 de agosto de 2026

> Este documento registra problemas conocidos, deuda técnica y oportunidades de simplificación/refactorización.
> NO modificar código sin primero entender el impacto. Ver FLUJO.md y ARQUITECTURA.md.

---

## Bugs activos

### ~~`showPushPrompt` nunca se activa en /ritual~~ RESUELTO (julio 2026)
Se agregó `maybeShowPushPrompt()` que se llama post-reveal en `handleSubmit` y en el callback de Realtime.
Condición: `isSupported && !isPushPromptDismissed() && !prefs.push_enabled`.

### ~~Corte de día en racha/ritual a las 21:00 ART en vez de medianoche~~ RESUELTO (agosto 2026)
`getRitualOfDayAction`, `updateStreakAction` y `usarComodinAction` (`app/actions/ritual.ts`) calculaban "hoy" con
`new Date().toISOString().split('T')[0]`, que da la fecha en UTC. Como Vercel corre en UTC y Argentina es UTC-3,
el "día" cambiaba a las 21:00 ART — justo la franja de uso principal del producto ("ritual antes de dormir").
Esto podía crear dos sesiones distintas para la misma noche si cada miembro de la pareja abría la app antes y
después de esa hora, y podía romper la racha aunque hubieran respondido todas las noches. Fix: se agregó
`todayInArgentina()` (usa `toLocaleDateString('en-CA', { timeZone: 'America/Argentina/Buenos_Aires' })`) y
`addDaysToDateStr()`, reemplazando todos los cálculos de fecha del día en `ritual.ts` y en `streakEnRiesgo`
(`app/ritual/page.tsx`).

---

## Consultas N+1 y performance

### getUserContextAction hace 4 queries secuenciales
**Archivo**: `app/actions/ritual.ts:15`
**Problema**:
```
1. profiles WHERE id = user.id
2. couple_members WHERE user_id = user.id
3. couples WHERE id = membership.couple_id
4. couple_members WHERE couple_id = ... AND user_id != user.id
5. profiles WHERE id = partner.user_id
```
Son 5 queries (o 4 si no hay pareja) que podrían ser 1-2 con JOINs.
**Impacto**: Carga lenta del ritual (primera pantalla).
**Nota**: Supabase JS no soporta JOINs entre tablas arbitrarias fácilmente; se puede resolver con una DB function o con `select('*, couple:couple_members!inner(couple:couples(*))')`.

### getPerfilAction trae TODAS las sesiones para contar y categoría favorita
**Archivo**: `app/actions/perfil.ts:47`
**Problema**: Hace `.select('*, ritual:rituals(category)')` de todas las sesiones reveladas para contar y calcular la categoría favorita en JS. Con cientos de sesiones esto es costoso.
**Solución**: Usar `select('id', { count: 'exact' })` para el conteo, y una query con GROUP BY via RPC o función SQL para la categoría favorita.

---

## Código duplicado / redundante

### Patron auth check repetido en cada action
**Archivos**: Todos los archivos en `app/actions/`
**Problema**: Cada action hace:
```typescript
const { data: { user } } = await supabase.auth.getUser()
if (!user) return null // o { ok: false }
```
No es un problema grave (el middleware ya protege las rutas), pero es verboso.
**Nota**: No abstraer prematuramente — la duplicación aquí es clara y segura. Solo si se vuelve fuente de bugs.

### resolveState definida dentro del componente
**Archivo**: `app/ritual/page.tsx:52`
**Problema**: `resolveState` es una función pura (no usa estado ni props del componente) definida dentro del componente, lo que la hace recrear en cada render.
**Solución**: Moverla fuera del componente como función top-level.

---

## Deuda de UI/UX

### ~~Navegación inconsistente (sin nav bar)~~ RESUELTO (agosto 2026)
Se agregó `components/BottomNav.tsx`, una nav bar inferior fija con 4 tabs (Hoy / Juegos / Historial / Perfil) usada en `/ritual`, `/juegos`, `/historial` y `/perfil`. El logout se movió de `/ritual` a `/perfil`.

### Spinner genérico como loading state
**Problema**: Todas las páginas muestran el mismo spinner mientras cargan datos. No hay skeleton screens.
**Impacto**: Experiencia percibida de carga más lenta.

### Header duplicado en cada página
**Archivos**: `app/ritual/page.tsx`, `app/historial/page.tsx`, `app/perfil/page.tsx`, `app/precios/page.tsx`
**Problema**: Cada página implementa su propio header con estructura similar (título + botones de nav). Código duplicado.
**Solución**: Extraer un componente `PageHeader` o un layout compartido.

---

## Codigo/archivos potencialmente obsoletos

### Migración legacy de eleccion-remoto (superseded)
**Archivos**: `supabase/migrations/005_eleccion_remota.sql`, `supabase/functions/eleccion-remoto`
**Estado**: El juego "Elección" del roadmap se implementó de cero en agosto 2026 como `couple_eleccion_rounds`
(migración `015`) + `app/actions/eleccion.ts` + `app/juegos/eleccion/page.tsx`, usando `couple_id` y Realtime
en vez del sistema de salas con código (`remote_eleccion_rooms`) que requería la Edge Function porque el
proyecto legacy no tenía auth de pareja. La tabla `remote_eleccion_rooms` y la función `eleccion-remoto`
quedan sin uso — se pueden eliminar cuando se confirme que no hay referencias externas.
**Riesgo**: Bajo. No interfieren con el flujo actual.

### Migración legacy de MercadoPago (activa)
**Archivos**: `supabase/migrations/003_mercadopago_subscription.sql`
**Estado**: `create-mp-subscription` y `mp-webhook` SÍ están integradas — `/precios` las invoca para el checkout.
`check-game-access` sigue sin uso.
**Accion recomendada**: ninguna, documentado para referencia.

### `~/.cursor` directory en raíz del proyecto
**Path**: `C:\Users\Usuario\Downloads\Parejas Juego\~\.cursor`
**Problema**: Hay un directorio `~/` en la raíz del proyecto, probablemente creado por error con `mkdir ~` en Windows. Contiene una carpeta `.cursor` vacía.
**Accion**: Verificar si es accidental y eliminar si es el caso. No está en `.gitignore`.

---

## Mejoras pendientes identificadas

### Timezone hardcodeada como default ART
**Archivo**: `app/actions/notifications.ts:12`
```typescript
timezone: 'America/Argentina/Buenos_Aires',
```
**Impacto**: Si la app escala internacionalmente, los nuevos usuarios tendrán el default incorrecto.
**Solución**: Detectar timezone del browser al guardar las prefs por primera vez (`Intl.DateTimeFormat().resolvedOptions().timeZone`).

### Sin índices explícitos en DB para queries frecuentes
**Queries frecuentes**:
- `couple_ritual_sessions WHERE couple_id = X AND session_date = today`
- `couple_members WHERE user_id = X`
- `notification_log WHERE user_id = X AND type = Y AND sent_at >= today`
**Accion**: Revisar `EXPLAIN ANALYZE` en Supabase Dashboard cuando haya volumen real.

### Historial: offset basado en `sessions.length` puede romper con filtros
**Archivo**: `app/historial/page.tsx:89`
```typescript
await loadHistorial(ctx.couple.id, categoria, sessions.length, true)
```
Si el usuario cambia el filtro y luego hace load more, el offset podría ser incorrecto. Actualmente se resetea en `handleCategoria`, así que está mitigado, pero frágil.

### getHistorialAction: query de count separada del fetch de datos
**Archivo**: `app/actions/ritual.ts:229`
**Problema**: Hay 2-3 queries por llamada a `getHistorialAction` (count total, count filtrado, datos). Podría optimizarse con una query que retorne count en el mismo select (`{ count: 'exact' }`).

---

## Limitaciones de arquitectura actuales

### Ritual determinístico puede repetirse
El algoritmo `dayOfYear % rituals.length` hace que los rituales se repitan anualmente (o antes si hay pocos). Con ~200 rituales en el catálogo y una pareja activa, empezarían a ver repeticiones desde el año 2. No es crítico pero debe considerarse al agregar contenido.

### Un solo comodín por pareja (hardcoded en migración)
`wildcards_remaining DEFAULT 1` en la migración. Si se quiere dar más comodines (feature premium?), requiere migración o UI para recargarlo.

### Pareja de exactamente 2 personas
El modelo `user1_id / user2_id` en `couple_ritual_sessions` asume exactamente 2 miembros. El ROADMAP menciona "grupos pequeños" como expansión futura — requeriría refactor significativo del modelo de sesiones.

### Las 4 tablas de ronda con reveal no guardan `item_id`/`categoria`/`intensidad` propia
**Archivos**: `couple_eleccion_rounds`, `couple_esto_aquello_rounds`, `couple_conoces_rounds`, `couple_quien_de_los_dos_rounds`.
**Problema**: solo guardan el texto ya copiado (`option_a`/`option_b`/`pregunta`), no el `item_id` del contenido original ni su `categoria`/`intensidad`. La tab "Juegos" de `/historial` (`get_historial_juegos`, migración `043`) puede mostrar qué se jugó y el resultado para estos 4 juegos, pero no la categoría — sí puede para Verdad o Reto/Ruleta Picante, que sí persisten `categoria` vía `couple_rondas_jugadas` + join a su tabla de contenido.
**Solución** (no hecha, deliberadamente fuera de la pasada de agosto 2026): ampliar las 4 tablas con `item_id`/`categoria`, tocando los 4 `submit_*_choice` (`SECURITY DEFINER`) + backfill. Beneficio marginal frente al costo, se dejó documentado como límite conocido.

### Sin tracking de intensidad por ronda jugada
No existe ningún lugar que registre qué intensidad tuvo cada ronda individual (solo el techo máximo configurado por la pareja, `couples.intensidad_maxima`). "Sugerir subir el techo" en `/perfil` usa una señal más simple ya disponible (`totalJuegos >= 10` con techo en `liviana`) en vez de "cuántas rondas jugaron ya en Liviana", que requeriría este tracking.

### Momento "nueva categoría descubierta" no implementado
De los tipos de Momento posibles, se implementaron sorpresa, reto doble, gran desacuerdo y primera partida (VoR/Ruleta Picante) — un Momento por "la pareja probó una categoría que nunca había jugado" quedó deliberadamente fuera, sin fecha planeada.

---

## Resuelto (agosto 2026, sesión del 17/08)

Tres bloqueos de producción, todos relacionados con no tener un dominio propio verificado:

- **Google Sign-In mostraba la URL cruda de Supabase** en vez de "Rituales" en el selector de cuenta.
  No era un problema de dominio custom pago de Supabase (como se pensó al principio) sino de **Google
  Brand Verification** (gratuita) — requería que `app/AuthHashRedirect.tsx` mostrara contenido real
  (no solo un spinner) para que el crawler de verificación pudiera leer de qué trata la app.
- **Registro con email/contraseña roto para cualquiera que no fuera el dueño de la cuenta** — Resend
  en modo sandbox sin dominio verificado. Se resolvió al verificarse `mail.rituales.site`.
- **Mercado Pago rechazaba el checkout en producción** por `back_url` en `*.vercel.app`. Se resolvió
  actualizando `MP_BACK_URL` a `https://www.rituales.site/precios`. Al probar el fix se descubrió que
  `MP_ACCESS_TOKEN` **ya era un token de producción** (no cambiado en esta sesión) — el checkout de
  `/precios` puede procesar cobros reales desde ahora.
