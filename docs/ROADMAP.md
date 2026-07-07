# Rituales — Roadmap

Stack actual: **Next.js 14 (App Router) + TypeScript + Tailwind CSS + Supabase**

Última actualización: junio 2026

---

## Resumen

| Sprint | Estado |
|--------|--------|
| Sprint 1 — Core | ✅ Completo |
| Sprint 2 — Engagement | ✅ Completo (reminder diario: 1x/día por plan Hobby) |
| Sprint 3 — Monetización | 🚧 En progreso (Mercado Pago) |
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

## Sprint 3 — Monetización 🚧 EN PROGRESO (Mercado Pago, no Stripe)

> Se reusa la infra legacy del proyecto HTML anterior (tabla `subscriptions`, Mercado Pago, Edge Functions) integrándola al flujo Next.js.

### Premium
- [x] Plan freemium definido: historial >30 rituales y categorías premium desbloquean con Premium (`lib/plans.ts`)
- [x] Integrar **Mercado Pago** (preapproval/suscripción recurrente + webhook) vía Edge Functions `create-mp-subscription` y `mp-webhook`
  - Tabla `subscriptions` en Supabase, con `mp_subscription_id` (migración `003`)
- [x] Paywall suave: historial limitado a 30, ritual del día siempre disponible
- [x] Página `/precios` en App Router con checkout
- [x] Link visible a `/precios` desde `/perfil` ("Conocer Premium")
- [ ] Probar flujo completo en sandbox de Mercado Pago (checkout → webhook → premium activo)
- [ ] Dominio propio para pasar de sandbox a producción (MP no acepta `back_url` en `*.vercel.app` en producción)

### Rituales premium
- [x] Rituales con `premium = true` (migración `013`) — la selección diaria excluye premium para parejas free y las incluye para parejas premium (`getRitualOfDayAction`)
- [x] Categorías adicionales: viajes, planes, fantasías (30 rituales nuevos, todos premium)
- [ ] Rituales de temporada / eventos especiales
- [ ] Rituales de aniversario / hitos (requiere modelar fecha de aniversario en `couples`)

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

---

## Arquitectura de referencia

```
app/
  page.tsx              ← Redirect según auth / pareja
  auth/page.tsx         ← Login y registro
  onboarding/page.tsx   ← Nombre + crear pareja + invite link
  unirse/[code]/page.tsx← Unirse a pareja existente
  ritual/page.tsx       ← Ritual diario (Realtime + streak + comodín)
  historial/page.tsx    ← Historial de rituales completados
  perfil/page.tsx       ← Perfil, stats y comodín
  actions/
    couple.ts           ← Crear / unirse a pareja
    ritual.ts           ← Ritual, streak, historial, contexto de usuario
    perfil.ts           ← Perfil y estadísticas
    notifications.ts    ← Preferencias de notificaciones
  api/
    push/subscribe      ← Registrar dispositivo push
    push/unsubscribe    ← Quitar dispositivo push
    cron/daily-reminder ← Reminder diario (Vercel Cron)
lib/
  supabase/
    client.ts           ← Browser client (Realtime, signOut)
    server.ts           ← Server client (Server Actions, middleware)
components/
  RitualCard.tsx        ← Responder ritual
  WaitingState.tsx      ← Esperando respuesta de pareja
  RevealCards.tsx       ← Reveal de respuestas
  StreakBadge.tsx       ← Badge de racha
types/index.ts          ← Interfaces TypeScript
middleware.ts           ← Protección de rutas autenticadas
supabase/migrations/
  001_tablas_y_rls.sql  ← profiles, subscriptions
  006_rituales_mvp.sql  ← couples, rituals, sessions, streaks (core)
  007_contenido_rituales.sql ← ~160 rituales adicionales
  008_invite_lookup.sql ← RPC invitación segura
  009_profiles_partner_read.sql ← RLS nombre de pareja
  010_notifications.sql         ← prefs, push_subscriptions, notification_log
  011_push_subs_update_policy.sql
  012_profiles_avatar.sql       ← emoji avatar en profiles

lib/push/                       ← vapid, send, notify, client
public/sw.js                    ← Service worker para Web Push
```
