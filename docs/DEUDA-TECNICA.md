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

### ~~Infraestructura huérfana (eleccion-remoto, MercadoPago legacy, regalos, tablas sin uso)~~ RESUELTO (2026-09-14)
Barrida completa de todo lo detectado como sin uso, ahora que el proyecto no tiene usuarios reales
("aún no ve la luz") y se podía actuar sin riesgo de romper algo en producción:

- **Edge functions borradas de producción y del repo**: `eleccion-remoto` (superseded por
  `couple_eleccion_rounds` + Realtime desde agosto 2026), `create-mp-subscription` (inalcanzable desde
  la UI desde el pivot a créditos del Sprint 5), `check-game-access` (gating del proyecto HTML legacy,
  gateaba por `subscriptions` con slugs de juego que ya no existen), `get-gift-status`/`claim-gift`/
  `create-mp-gift` (infraestructura de una iteración de "regalos" nunca integrada al repo actual, sin
  tabla `gifts` ni referencia en ningún lado).
- **`mp-webhook` simplificado**: se sacó la rama `subscription_preapproval`/`subscription_authorized_payment`
  (dead code sin `create-mp-subscription` para generar preapprovals nuevos). Solo queda el flujo de
  `payment` para créditos. Redeployado y probado con requests reales (payment inexistente y
  subscription_preapproval ambos devuelven `ok:true` sin crashear).
- **Tablas dropeadas** (migración `067_drop_tablas_huerfanas.sql`, sin FKs entrantes, cero referencias
  en código): `game_progress` (legacy de la migración `001`, 0 filas) y `couple_picante_trial`
  (gateaba la prueba gratis de picante, sin lectores desde que el Sprint 5 sacó el paywall entero).
- `remote_eleccion_rooms` (la tabla que en teoría acompañaba a `eleccion-remoto`) no existía en la base
  de producción — nada que dropear ahí.
- `supabase/config.toml` limpiado de las entradas `verify_jwt` de las 3 funciones borradas.

### ~~subscriptions y isPremium (RPC get_perfil_page_data)~~ RESUELTO (2026-09-14, segunda pasada)
Se confirmó cero lectores de `isPremium` en toda la UI (`grep -rn "\.isPremium"` sin resultados) y de
`get_is_couple_premium()` (RPC sin ningún llamador, solo mencionada en migraciones viejas). Migración
`068_retirar_subscriptions.sql`:
- `get_perfil_page_data()` redefinida sin el cálculo de `isPremium` (leía `subscriptions`) ni la clave
  en el jsonb devuelto. `PerfilData` (`app/actions/perfil.ts`) actualizado en el mismo cambio.
- `get_is_couple_premium()` dropeada — no tenía llamador.
- Tabla `subscriptions` dropeada (sus 3 filas eran de prueba, ya canceladas desde la migración `064`;
  sin FKs entrantes).
- `profiles.trial_used` (migración `002`, prueba gratuita del proyecto legacy) dropeada — sin ningún
  lector en el código actual.
- Verificado: `tsc --noEmit` limpio, `get_perfil_page_data()` corre sin error, advisories de seguridad
  sin novedades nuevas post-cambio.

Las migraciones históricas `003_mercadopago_subscription.sql` / `005_eleccion_remota.sql` /
`002_trial_en_profiles.sql` se dejan sin tocar como registro inmutable de schema ya aplicado — nunca se
borran migraciones pasadas, solo se agregan nuevas que revierten lo que ya no se necesita.

### `~/.cursor` directory en raíz del proyecto
Ya no existe (verificado 2026-09-14) — se ve que se limpió en otra sesión o nunca se creó de forma persistente.

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
- **El nombre tipeado al registrarse se perdía siempre.** El trigger `handle_new_user()` (migración
  `004`) solo copiaba `id`/`email` a `profiles`, nunca leyó `display_name`. Había un `.upsert()`
  client-side pensado para cubrir eso, pero solo corre si `signUp()` devuelve sesión inmediata — con
  confirmación de email obligatoria (estado actual) eso nunca pasa. Consecuencia: `/onboarding`
  repreguntaba el nombre a todos los registros por email/contraseña. Corregido en la migración `044`
  para que el trigger lea `raw_user_meta_data->>'display_name'`. Ver `docs/DECISIONES.md`.
- **El link de invitación se perdía si no lo copiabas en el momento.** Solo se mostraba una vez, al
  crear la pareja (`/onboarding` o `/ritual`); si el usuario navegaba a otro lado sin copiarlo, no
  había forma de recuperarlo desde la app — el `invite_code` seguía vivo en `couples` pero ningún
  otro lugar lo mostraba. Corregido en la migración `045`: `/perfil` ahora lo muestra (con botón de
  copiar) siempre que la pareja tenga un solo miembro.
