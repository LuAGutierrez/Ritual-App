# Rituales — Roadmap

Stack actual: **Next.js 14 (App Router) + TypeScript + Tailwind CSS + Supabase**

Última actualización: junio 2026

---

## Resumen

| Sprint | Estado |
|--------|--------|
| Sprint 1 — Core | ✅ Completo |
| Sprint 2 — Engagement | 🟡 Parcial (notificaciones implementadas; falta activar VAPID en prod) |
| Sprint 3 — Monetización | ❌ Pendiente |
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

## Sprint 2 — Engagement y retención 🟡 EN CURSO

### Historial ✅
- [x] Página `/historial` con los rituales completados por la pareja
- [x] Ver las respuestas propias y de la pareja en rituales pasados
- [x] Filtro por categoría
- [ ] Paginación (hoy límite fijo de 30 sesiones)
- [ ] Historial completo desbloqueable con premium (depende Sprint 3)

### Perfil ✅ (con detalles pendientes)
- [x] Página `/perfil` para editar nombre y avatar (emoji)
- [x] Estadísticas de la pareja (rituales completados, racha actual, racha máxima, categoría favorita)
- [x] Muestra nombre de pareja y comodines restantes
- [ ] Migración SQL para columna `avatar` en `profiles` (usada en código, falta en BD)
- [x] Preferencias de notificaciones (toggles + hora + zona horaria en `/perfil`)
- [ ] Edición de email / contraseña

### Notificaciones ✅ (requiere VAPID keys en producción)
- [x] Banner in-app cuando la pareja responde (Realtime en `/ritual`)
- [x] Web Push: "Tu pareja ya contestó, ¿y vos?"
- [x] Reminder diario configurable (hora + timezone en `/perfil`)
- [x] Prompt de permiso post-reveal (no en registro)
- [x] Cron horario en Vercel (`/api/cron/daily-reminder`)
- [ ] Configurar `VAPID_*`, `SUPABASE_SERVICE_ROLE_KEY` y `CRON_SECRET` en Vercel
- [ ] Generar claves: `npx web-push generate-vapid-keys`
- [ ] Diseño técnico: `docs/notificaciones-design.md`

### Mejoras de pareja (no planificadas aún)
- [ ] Notificación cuando la pareja se une al link de invitación
- [ ] Salir de pareja / re-vincular
- [ ] Nombre de la pareja (`couples.name`)

---

## Sprint 3 — Monetización ❌ PENDIENTE

> Existe infra legacy del proyecto HTML anterior (tabla `subscriptions`, Mercado Pago, `precios.html`, Edge Functions) pero **no está integrada** al flujo Next.js de Rituales.

### Premium
- [ ] Plan freemium definido: X rituales gratis → premium desbloquea categorías exclusivas, historial completo, rituales de IA
- [ ] Integrar **Stripe** (Checkout + Webhooks) en Next.js
  - Suscripción mensual/anual
  - Tabla `subscriptions` en Supabase (existe, sin uso en app)
- [ ] Paywall suave: mostrar ritual premium bloqueado, no bloquear la experiencia core
- [ ] Página `/precios` en App Router

### Rituales premium
- [ ] Rituales con `premium = true` (hoy todos son gratuitos)
- [ ] Categorías adicionales: viajes, planes, fantasías
- [ ] Rituales de temporada / eventos especiales

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
- [ ] Recuperación de contraseña / OAuth
- [ ] Cambiar el ritual del día (una vez por semana) si no les gustó
- [ ] Modo offline / PWA
- [ ] Invitar a un amigo / referido
- [ ] Grupos pequeños (amigos, familia) — expansión más allá de parejas
- [ ] Rituales de larga distancia con sincronización por zona horaria
- [ ] Múltiples idiomas (inglés como prioridad)
- [ ] App nativa (React Native / Expo)

---

## Bugs conocidos / deuda técnica

- [ ] Columna `avatar` en `profiles` — falta migración SQL
- [ ] Copy del comodín dice "automático" pero el uso es manual (botón)
- [ ] Estado `completed` en `SessionState` definido pero no usado; post-reveal el flujo de "Hasta mañana" es confuso
- [ ] `lib/rituals.ts` ya no se usa (reemplazado por `app/actions/ritual.ts`) — eliminar
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

lib/push/                       ← vapid, send, notify, client
public/sw.js                    ← Service worker para Web Push
```
