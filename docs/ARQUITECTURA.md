# Arquitectura — Rituales

Última actualización: julio 2026

## Stack

| Capa | Tecnología |
|------|-----------|
| Framework | Next.js 14 App Router |
| Lenguaje | TypeScript |
| Estilos | Tailwind CSS (design system propio) |
| Backend / DB | Supabase (Auth, PostgreSQL, Realtime, RLS) |
| Animaciones | Framer Motion |
| Push Notifications | Web Push API + `web-push` (VAPID) |
| Deploy | Vercel (Hobby plan, 1 cron/día) |
| Service Worker | `/public/sw.js` |

---

## Estructura de directorios

```
app/
  page.tsx                  <- Redirect inteligente según estado auth/pareja
  layout.tsx                <- HTML root, metadata, viewport
  AuthHashRedirect.tsx      <- Client component para manejar hash de auth en SSR
  globals.css
  auth/
    page.tsx                <- Login / Registro / Olvidé / Nueva contraseña
    callback/route.ts       <- Callback OAuth y recovery (token_hash)
  onboarding/
    page.tsx                <- Nombre -> Crear pareja -> Invite link
  unirse/[code]/
    page.tsx                <- Unirse a pareja por código
  ritual/
    page.tsx                <- Ritual diario (Realtime + streak + comodín)
  historial/
    page.tsx                <- Historial paginado con filtro por categoría
  perfil/
    page.tsx                <- Perfil, stats, avatar emoji, notificaciones
  precios/
    page.tsx                <- Pricing page (CTA deshabilitado, Sprint 3)
  actions/
    ritual.ts               <- getUserContext, getRitualOfDay, submitResponse, streak, historial
    couple.ts               <- crearPareja, verificarInvitacion, unirseAPareja
    perfil.ts               <- getPerfilData, updatePerfil
    notifications.ts        <- get/update NotificationPrefs, setPushEnabled
    subscription.ts         <- isPremium, isCouplePremium
  api/
    cron/daily-reminder/    <- GET: cron Vercel 23:00 UTC (20:00 ART)
    push/subscribe/         <- POST: registrar dispositivo Web Push
    push/unsubscribe/       <- DELETE: quitar dispositivo Web Push
  error.tsx
  global-error.tsx
  not-found.tsx

components/
  RitualCard.tsx            <- Formulario para responder el ritual del día
  WaitingState.tsx          <- Pantalla de espera (ya respondiste, tu pareja no)
  RevealCards.tsx           <- Reveal animado con Framer Motion
  StreakBadge.tsx           <- Badge de racha de días
  PartnerRespondedBanner.tsx<- Banner "tu pareja ya respondió"
  PushPermissionPrompt.tsx  <- Prompt post-reveal para activar notificaciones
  NotificationPrefsSection.tsx <- Toggles de preferencias push en /perfil

lib/
  supabase/
    client.ts               <- Browser client (Realtime, signOut)
    server.ts               <- Server client (Server Actions, middleware)
    service.ts              <- Service role client (cron, push backend)
  push/
    vapid.ts                <- VAPID keys desde env
    send.ts                 <- sendPushToUser, alreadyNotifiedToday, logNotification
    notify.ts               <- notifyPartnerResponded, isReminderHour
    client.ts               <- Browser: suscripción push, isPushPromptDismissed
  plans.ts                  <- FREE_HISTORIAL_LIMIT, listas de features, PREMIUM_PRICE

hooks/
  usePushNotifications.ts   <- Hook: subscribe, loading, isSupported

types/
  index.ts                  <- Profile, Couple, Ritual, CoupleRitualSession, Streak,
                               Subscription, SessionState, UserContext, NotificationPrefs

public/
  sw.js                     <- Service Worker para Web Push

supabase/
  config.toml
  migrations/
    001_tablas_y_rls.sql    <- profiles, subscriptions (legacy)
    002_trial_en_profiles.sql
    003_mercadopago_subscription.sql <- Legacy MP (sin uso activo)
    004_trigger_profiles_on_signup.sql <- Auto-crea profile al registrar
    005_eleccion_remota.sql <- Legacy (sin uso activo)
    006_rituales_mvp.sql    <- couples, couple_members, rituals, sessions, streaks
    007_contenido_rituales.sql <- ~160 rituales adicionales
    008_invite_lookup.sql   <- RPCs: check_invite_code, join_couple_by_invite
    009_profiles_partner_read.sql <- RLS: leer perfil de pareja vinculada
    010_notifications.sql   <- notification_prefs, push_subscriptions, notification_log
    011_push_subs_update_policy.sql
    012_profiles_avatar.sql <- Columna avatar (emoji) en profiles

middleware.ts               <- Protección de rutas autenticadas
vercel.json                 <- Cron schedule
```

---

## Modelo de datos

```
profiles
  id (uuid, FK auth.users)
  email
  display_name
  avatar (emoji string)
  created_at

couples
  id (uuid)
  invite_code (6 chars uppercase, único)
  name (null — pendiente usar)
  created_at

couple_members
  user_id (FK profiles) PK
  couple_id (FK couples) PK
  joined_at

rituals
  id (uuid)
  category  (conexion | diversion | intimidad | reto)
  prompt    (pregunta del ritual)
  challenge (reto opcional)
  difficulty (1-3)
  premium   (bool, todos false hoy)
  created_at

couple_ritual_sessions
  id (uuid)
  couple_id
  ritual_id
  session_date (date, UNIQUE con couple_id)
  user1_id / user2_id
  user1_response / user2_response
  user1_completed_at / user2_completed_at
  revealed_at    <- trigger del reveal

streaks
  couple_id (PK)
  current_streak
  longest_streak
  last_completed_date
  wildcards_remaining (default 1)

subscriptions
  user_id (PK)
  plan (monthly | trial)
  status (active | canceled | past_due | trialing)
  current_period_end
  [campo mp_* legacy]

notification_prefs
  user_id (PK)
  push_enabled
  partner_responded
  daily_reminder
  reminder_time (HH:MM:SS)
  timezone

push_subscriptions
  user_id, endpoint, p256dh, auth, created_at

notification_log
  user_id, type (daily_reminder | partner_responded), sent_at
  [usado para deduplicación: alreadyNotifiedToday]
```

---

## Flujo de Supabase clients

```
Browser (Client Component)
  └── lib/supabase/client.ts  (anon key, Realtime, signOut)

Server (Server Actions, middleware)
  └── lib/supabase/server.ts  (anon key + cookies SSR)

Backend sin usuario (cron, push)
  └── lib/supabase/service.ts (service_role key — bypasa RLS)
```

---

## Cron

```
vercel.json: "0 23 * * *" (UTC) = 20:00 ART
Ruta: /api/cron/daily-reminder
Auth: Bearer CRON_SECRET en header Authorization
Lógica:
  1. Trae todos los usuarios con push_enabled=true y daily_reminder=true
  2. Filtra por reminder_time/timezone (isReminderHour)
  3. Descarta si ya notificó hoy (notification_log)
  4. Descarta si el ritual de hoy ya está revelado
  5. Envía push y loguea
```

---

## Selección de ritual del día

```typescript
// Determinístico por fecha — toda la pareja ve el mismo ritual
dayOfYear = getDayOfYear(new Date())
ritualId = rituals[dayOfYear % rituals.length].id

// Solo rituales premium=false en selección actual
// Un ritual por pareja por día (UNIQUE couple_id + session_date)
```

---

## Variables de entorno requeridas

```env
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY    (cron + push backend)
NEXT_PUBLIC_VAPID_PUBLIC_KEY
VAPID_PRIVATE_KEY
VAPID_SUBJECT                (mailto:)
CRON_SECRET                  (Bearer token para /api/cron)
```
