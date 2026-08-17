# Rituales — Roadmap

Stack actual: **Next.js 14 (App Router) + TypeScript + Tailwind CSS + Supabase**

Última actualización: 17 de agosto de 2026

---

## Resumen

| Sprint | Estado |
|--------|--------|
| Sprint 1 — Core | ✅ Completo |
| Sprint 2 — Engagement | ✅ Completo (reminder diario: 1x/día por plan Hobby) |
| Sprint 3 — Monetización | ✅ Mercado Pago en **producción real** (no sandbox) desde el 17/08 |
| Juegos (evolución) | ✅ 6 juegos, metadata rica, Momentos, historial, personalización — ver sección propia |
| Sprint 4 — IA | ❌ Pendiente |

---

## Sprint 1 ✅ COMPLETO

### Infraestructura
- [x] Next.js 14 con App Router, TypeScript, Tailwind CSS
- [x] Supabase: Auth, Database, Realtime, RLS
- [x] Middleware de protección de rutas
- [x] Server Actions para operaciones que requieren auth (evita problema JWT en browser)
- [x] Deploy en Vercel
- [x] RLS para leer perfil de la pareja vinculada (`009_profiles_partner_read.sql`)

### Flujo de usuario
- [x] Registro e inicio de sesión (email + contraseña)
- [x] Onboarding: nombre → crear pareja + generar link de invitación
- [x] Unirse a pareja por código de invitación (`/unirse/[code]`)
- [x] Redirect inteligente según estado: sin auth → `/auth`, sin pareja → `/onboarding`, con pareja → `/ritual`
- [x] RPC seguro para validar y unirse por código (`008_invite_lookup.sql`)

### Ritual diario
- [x] Ritual determinístico por fecha (mismo ritual para toda la pareja)
- [x] Catálogo de ~200 rituales en 4 categorías (conexión, diversión, intimidad, reto)
- [x] Envío de respuesta individual
- [x] Estados: responder → esperar pareja → reveal
- [x] Reveal sincronizado con Supabase Realtime
- [x] Animación de reveal con Framer Motion
- [x] Streak de días consecutivos
- [x] Comodín de racha (uso manual desde `/ritual` y `/perfil`)

---

## Sprint 2 — Engagement y retención ✅ COMPLETO

### Historial ✅
- [x] Página `/historial` con los rituales completados por la pareja
- [x] Ver las respuestas propias y de la pareja en rituales pasados
- [x] Filtro por categoría
- [x] Paginación con "Cargar más" (15 por página)
- [ ] Historial completo desbloqueable con premium (depende Sprint 3)

### Perfil ✅
- [x] Página `/perfil` para editar nombre y avatar (emoji)
- [x] Estadísticas de la pareja (rituales completados, racha actual, racha máxima, categoría favorita)
- [x] Muestra nombre de pareja y comodines restantes
- [x] Columna `avatar` en `profiles` (`012_profiles_avatar.sql`)
- [x] Preferencias de notificaciones (toggles + hora + zona horaria en `/perfil`)
- [x] Recuperación de contraseña desde `/auth` ("Olvidé mi contraseña")
- [ ] Edición de email / contraseña desde `/perfil`

### Notificaciones ✅
- [x] Banner in-app cuando la pareja responde (Realtime en `/ritual`)
- [x] Web Push: "Tu pareja ya contestó, ¿y vos?"
- [x] Reminder diario configurable (hora + timezone en `/perfil`)
- [x] Prompt de permiso post-reveal (no en registro)
- [x] Cron diario en Vercel (`/api/cron/daily-reminder`, `0 23 * * *` = 20:00 ART)
- [x] `VAPID_*`, `SUPABASE_SERVICE_ROLE_KEY` y `CRON_SECRET` en Vercel
- [x] Diseño técnico: `docs/notificaciones-design.md`
- [ ] Iconos PWA (`icon-192.png`, `badge-72.png`) — opcional
- [ ] Reminder por hora custom requiere Vercel Pro (Hobby = 1 cron/día)

### Mejoras de pareja (no planificadas aún)
- [ ] Notificación cuando la pareja se une al link de invitación
- [ ] Salir de pareja / re-vincular
- [ ] Nombre de la pareja (`couples.name`)

---

## Sprint 3 — Monetización ✅ Mercado Pago en producción (no Stripe)

> Se reusa la infra legacy del proyecto HTML anterior (tabla `subscriptions`, Mercado Pago, Edge Functions) integrándola al flujo Next.js.

### Premium
- [x] Plan freemium definido: historial >30 rituales y categorías premium desbloquean con Premium (`lib/plans.ts`)
- [x] Integrar **Mercado Pago** (preapproval/suscripción recurrente + webhook) vía Edge Functions `create-mp-subscription` y `mp-webhook`
  - Tabla `subscriptions` en Supabase, con `mp_subscription_id` (migración `003`)
- [x] Paywall suave: historial limitado a 30, ritual del día siempre disponible
- [x] Página `/precios` en App Router con checkout
- [x] Link visible a `/precios` desde `/perfil` ("Conocer Premium")
- [x] Probar flujo completo en sandbox de Mercado Pago (checkout → webhook → premium activo) — verificado agosto 2026 con cuentas de test comprador/vendedor
- [x] Dominio propio (`rituales.site`) — desbloqueó el pase a producción real. `MP_BACK_URL` actualizado a `https://www.rituales.site/precios` (17/08). **`MP_ACCESS_TOKEN` ya es un token de producción** (no se cambió en esta sesión, ya estaba así) — el checkout de `/precios` redirige a `www.mercadopago.com.ar` y puede procesar **cobros reales**. Ver `docs/DEUDA-TECNICA.md`.
- [x] Registro por email/contraseña funciona para cualquier usuario, no solo el dueño de la cuenta — `mail.rituales.site` verificado en Resend (antes en modo sandbox, solo entregaba al dueño).
- [x] Google Sign-In muestra "Rituales" (nombre + logo) en el selector de cuenta en vez de la URL cruda de Supabase — resuelto vía Brand Verification de Google (gratuita), no vía dominio custom de Supabase (pago). Requirió que `app/AuthHashRedirect.tsx` mostrara contenido real (no solo un spinner) para que el crawler de verificación pudiera leer de qué trata la app. Correo de asistencia de la pantalla de consentimiento: `ritual.platform@gmail.com`.

### Rituales premium
- [x] Rituales con `premium = true` (migración `013`) — la selección diaria excluye premium para parejas free y las incluye para parejas premium (`getRitualOfDayAction`)
- [x] Categorías adicionales: viajes, planes, fantasías (30 rituales nuevos, todos premium)
- [ ] Rituales de temporada / eventos especiales
- [ ] Rituales de aniversario / hitos (requiere modelar fecha de aniversario en `couples`)

---

## Juegos (fuera de sprint, agosto 2026) ✅

Además del ritual diario, existe una sección `/juegos` para engagement fuera del ciclo de una vez al día.
Creció de 4 a **6 juegos**, y de contenido estático a un sistema con metadata rica, progresión de
intensidad, variedad, detección de "Momentos" y personalización por categoría.

### Los 6 juegos
- [x] Hub `/juegos` con las 6 opciones + mensaje adaptativo según nivel de la pareja (`lib/niveles.ts`)
- [x] Elección — match sincronizado por Realtime (`couple_eleccion_rounds`, migración `015`)
- [x] Esto o Aquello — match sincronizado por Realtime (`couple_esto_aquello_rounds`, migración `023`)
- [x] ¿Cuánto me conoces? — un miembro responde por el otro, se compara (`couple_conoces_rounds`, migración `028`)
- [x] ¿Quién de los dos? — elección secreta + reveal, con modo normal/picante (`couple_quien_de_los_dos_rounds`, migración `034`)
- [x] Verdad o Reto — un solo dispositivo, con consentimiento previo para picante (`035`)
- [x] Ruleta Picante — contenido +18, pantalla de aviso previo, gating premium
- [x] Tab "Juegos" en la nav bar inferior
- [x] Contenido dinámico desde DB en vez de arrays estáticos (migración `026`: `verdad_o_reto_items`, `esto_o_aquello_items`, `eleccion_prompts`, `ruleta_picante_items`, mismo patrón que `rituals`)

### Metadata, progresión y variedad
- [x] Metadata rica (`intensidad`, `categoria`) en el contenido de los 6 juegos (migración `037`)
- [x] **Techo de intensidad por pareja**: `couples.intensidad_maxima` (`liviana`/`media`/`intensa`, default `intensa`), configurable desde `/perfil`, filtra el contenido elegible en los 6 juegos (`lib/intensidad.ts`, migración `038`)
- [x] **Sugerencia de subir el techo**: si `intensidad_maxima = 'liviana'` y la pareja ya jugó 10+ rondas, `/perfil` sugiere probar Media (sin schema nuevo, reusa datos ya cargados)
- [x] Variedad por categoría: evita repetir la última categoría jugada dentro de la sesión (con fallback si el filtro deja <3 opciones), mismo patrón replicado en los 6 juegos
- [~] **Categoría preferida "pegajosa"**: se construyó (chips en el hub `/juegos`, sessionStorage vía `lib/categoriaPreferida.ts`, filtro en los 6 juegos) pero **los chips se sacaron de la UI el 17/08** — decisión de producto: darle al usuario la opción de elegir categoría hace que se enfoque solo en esa, en contra del espíritu de variedad/sorpresa de los juegos. El mecanismo (`lib/categoriaPreferida.ts` y el parámetro `categoriaPreferida` en las 6 acciones) queda intacto sin UI que lo dispare — sin chips, `getCategoriaPreferida()` siempre devuelve `null`, así que la cadena de selección de contenido queda funcionando solo con techo de intensidad + variedad. Ver `docs/DECISIONES.md`.
- [x] Rondas de Verdad o Reto y Ruleta Picante registradas server-side (`couple_rondas_jugadas`, migración `040`) — antes no sumaban al nivel de progresión emocional ni persistían variedad entre sesiones
- [x] Modo normal/picante en ¿Quién de los dos? con consentimiento (`app/actions/picante-consent.ts`)

### Momentos (detección automática de hitos)
- [x] Sistema de "Momentos" (`couple_momentos`, migración `031`) — hitos destacables que se muestran en `/perfil`
- [x] Momento sorpresa (`033`), Momento reto doble (`036`), Momento gran desacuerdo (`039`)
- [x] Momento "primera partida" para Verdad o Reto (`041`) y Ruleta Picante (`042`)
- [x] `app/actions/momentos.ts` centraliza la detección y el registro

### Historial e insights
- [x] Tab "Juegos" dentro de `/historial` (junto a "Rituales") — lista combinada de rondas jugadas en los 6 juegos, con filtro por juego, vía `get_historial_juegos` (migración `043`, `app/actions/historial-juegos.ts`). Sin paywall.
- [x] `app/actions/juegos-stats.ts` + `app/actions/rondas-jugadas.ts` para estadísticas y registro de rondas
- [x] `app/actions/perfil-preferencias.ts` para intensidad máxima y preferencias desde `/perfil`
- [ ] Variantes de Elección con consecuencia/doble apuesta (specs ya escritas en `docs/archivo-anterior/ELECCION-OPCIONES-2-Y-3.md`)

**Límite conocido**: las 4 tablas de ronda con reveal (`couple_eleccion_rounds`, `couple_esto_aquello_rounds`,
`couple_conoces_rounds`, `couple_quien_de_los_dos_rounds`) no guardan `item_id` ni `categoria`/`intensidad`
propia, solo el texto ya copiado — el historial de juegos puede mostrar qué se jugó y el resultado para esos
4 juegos, pero no su categoría (sí para Verdad o Reto/Ruleta Picante, vía join a su tabla de contenido). Ver
`docs/DEUDA-TECNICA.md`.

---

## Sprint 4 — IA y personalización ❌ PENDIENTE

### Rituales con IA
- [ ] Generación de rituales personalizados basados en historial de la pareja
- [ ] Modo "sorpresa": la IA elige el ritual según el estado emocional declarado
- [ ] Sugerencias de temas no explorados

### Insights emocionales
- [ ] Resumen semanal de la pareja ("Esta semana conectaron en intimidad")
- [ ] Detección de patrones (categorías que evitan, temas recurrentes)

---

## Backlog sin sprint asignado

- [ ] Landing pública en Next.js (hoy `/` solo redirige según estado)
- [ ] Recuperación de contraseña / OAuth (recovery desde `/auth` ✅; OAuth pendiente)
- [ ] Cambiar el ritual del día (una vez por semana) si no les gustó
- [ ] Modo offline / PWA
- [ ] Invitar a un amigo / referido
- [ ] Grupos pequeños (amigos, familia) — expansión más allá de parejas
- [ ] Rituales de larga distancia con sincronización por zona horaria
- [ ] Múltiples idiomas (inglés como prioridad)
- [ ] App nativa (React Native / Expo)

---

## Bugs conocidos / deuda técnica

- [x] Columna `avatar` en `profiles` — migración en repo (`012_profiles_avatar.sql`)
- [x] Copy del comodín decía "automático" — corregido (uso manual)
- [x] Post-reveal confuso — pantalla "Listo por hoy" + estado `completed`
- [x] `lib/rituals.ts` eliminado
- [x] `README.md` actualizado para Next.js
- [x] Archivos HTML del proyecto anterior eliminados del root (`auth.html`, `precios.html`, `juego-*.html`, `js/`, `css/`)
- [x] `.env.example` con vars de Supabase, VAPID y cron
- [x] RLS bloqueaba lectura del nombre de la pareja — corregido en `009_profiles_partner_read.sql`
- [x] Google Sign-In mostraba la URL cruda de Supabase en vez de "Rituales" — resuelto vía Brand Verification (ver Sprint 3)
- [x] Registro con email/contraseña roto para cualquiera que no fuera el dueño de la cuenta (Resend sandbox) — resuelto al verificar `mail.rituales.site`
- [x] Mercado Pago no aceptaba `back_url` en `*.vercel.app` en producción — resuelto con `MP_BACK_URL` apuntando a `rituales.site`

---

## Arquitectura de referencia

```
app/
  page.tsx                 ← Redirect según auth / pareja
  AuthHashRedirect.tsx     ← Landing pública para no-autenticados; contenido real (no solo spinner) porque
                              lo lee el crawler de Google Brand Verification
  auth/page.tsx            ← Login, registro, Google OAuth, recuperar contraseña
  onboarding/page.tsx      ← Nombre + crear pareja + invite link
  unirse/[code]/page.tsx   ← Unirse a pareja existente
  privacidad/page.tsx      ← Política de privacidad (pública)
  terminos/page.tsx        ← Términos de servicio (pública)
  ritual/page.tsx          ← Ritual diario (Realtime + streak + comodín)
  historial/page.tsx       ← Historial: tabs "Rituales" / "Juegos", filtros, paginación
  perfil/page.tsx          ← Perfil, stats, comodín, intensidad máxima, sugerencia de techo
  precios/page.tsx         ← Checkout Premium (Mercado Pago)
  juegos/
    page.tsx               ← Hub: 6 juegos + chips de categoría preferida
    eleccion/page.tsx
    esto-o-aquello/page.tsx
    conoces/page.tsx
    quien-de-los-dos/page.tsx
    verdad-o-reto/page.tsx
    ruleta-picante/page.tsx
  actions/
    couple.ts              ← Crear / unirse a pareja
    ritual.ts              ← Ritual, streak, historial, contexto de usuario
    perfil.ts              ← Perfil y estadísticas
    perfil-preferencias.ts ← Intensidad máxima y preferencias desde /perfil
    notifications.ts       ← Preferencias de notificaciones
    subscription.ts        ← Estado de Premium
    eleccion.ts / esto-aquello.ts / conoces.ts / quien-de-los-dos.ts
                            ← Rondas server-side de los 4 juegos con reveal (secret choice + reveal)
    verdad-o-reto.ts / ruleta-picante.ts
                            ← Consentimiento picante, contenido rechazado
    picante-consent.ts     ← Consentimiento para contenido +18
    contenido-rechazado.ts ← Marcar contenido como "no me gusta" (excluir de futuras rondas)
    rondas-jugadas.ts      ← Registro server-side de rondas (VoR / Ruleta Picante)
    juegos-stats.ts        ← Estadísticas agregadas de juegos
    momentos.ts            ← Detección y registro de "Momentos"
    historial-juegos.ts    ← Historial combinado de los 6 juegos (tab "Juegos")
  api/
    push/subscribe         ← Registrar dispositivo push
    push/unsubscribe       ← Quitar dispositivo push
    cron/daily-reminder    ← Reminder diario (Vercel Cron)
lib/
  supabase/
    client.ts              ← Browser client (Realtime, signOut)
    server.ts              ← Server client (Server Actions, middleware)
  plans.ts                 ← Límites del plan free/premium
  intensidad.ts            ← Filtro por techo de intensidad de la pareja
  categoriaPreferida.ts    ← Categoría "pegajosa" por sesión (sessionStorage)
  turnos.ts                ← Utilidades de turnos entre miembros de la pareja
  niveles.ts               ← Nivel de progresión emocional de la pareja (mensaje adaptativo del hub)
  juegos.ts                ← Metadata compartida de los 6 juegos (nombres, rutas, emojis)
  push/                    ← vapid, send, notify, client
components/
  RitualCard.tsx           ← Responder ritual
  WaitingState.tsx         ← Esperando respuesta de pareja
  RevealCards.tsx          ← Reveal de respuestas
  StreakBadge.tsx          ← Badge de racha
  BottomNav.tsx            ← Nav bar inferior (Hoy / Juegos / Historial / Perfil)
types/index.ts             ← Interfaces TypeScript
middleware.ts              ← Protección de rutas autenticadas
supabase/migrations/       ← 001 a 043 (ver DECISIONES.md y ARQUITECTURA.md para el detalle de cada una)
  001_tablas_y_rls.sql     ← profiles, subscriptions
  006_rituales_mvp.sql     ← couples, rituals, sessions, streaks (core)
  015_eleccion_rounds.sql  ← Elección (couple_eleccion_rounds)
  023_esto_aquello_rounds.sql ← Esto o Aquello
  026_contenido_juegos_en_db.sql ← Contenido de los 6 juegos desde DB
  028_conoces_rounds.sql   ← ¿Cuánto me conoces?
  031_momentos.sql         ← couple_momentos
  034_quien_de_los_dos.sql ← ¿Quién de los dos?
  037_metadata_contenido.sql ← intensidad/categoria en el contenido
  038_intensidad_maxima_pareja.sql ← couples.intensidad_maxima
  040_rondas_jugadas.sql   ← couple_rondas_jugadas (VoR/Ruleta Picante)
  043_historial_juegos.sql ← get_historial_juegos (tab "Juegos" del historial)

public/sw.js                ← Service worker para Web Push
```
