# Arquitectura — Rituales

Última actualización: 17 de agosto de 2026

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
  AuthHashRedirect.tsx      <- Client component: maneja hash de auth en SSR Y es la landing pública
                               que ve un no-autenticado en `/` — debe tener contenido real (no solo un
                               spinner), lo lee el crawler de Google Brand Verification (ver DECISIONES.md)
  globals.css
  auth/
    page.tsx                <- Login / Registro / Google OAuth / Olvidé / Nueva contraseña
    callback/route.ts       <- Callback OAuth y recovery (token_hash)
  onboarding/
    page.tsx                <- Nombre -> Crear pareja -> Invite link
  unirse/[code]/
    page.tsx                <- Unirse a pareja por código
  privacidad/
    page.tsx                <- Política de privacidad (pública, requerida por Google OAuth branding)
  terminos/
    page.tsx                <- Términos de servicio (pública, requerida por Google OAuth branding)
  ritual/
    page.tsx                <- Ritual diario (Realtime + streak + comodín)
  historial/
    page.tsx                <- Historial: tabs "Rituales" (paginado, filtro categoría) / "Juegos"
                               (combinado de los 6 juegos, filtro por juego, migración `043`)
  perfil/
    page.tsx                <- Perfil, stats, avatar emoji, notificaciones, intensidad máxima,
                               sugerencia de subir techo
  precios/
    page.tsx                <- Checkout Premium (Mercado Pago, en producción real)
  juegos/
    page.tsx                <- Hub: 6 juegos, mensaje adaptativo por nivel, chips de categoría preferida
    eleccion/page.tsx           <- Elección (secret choice + reveal, Realtime)
    esto-o-aquello/page.tsx     <- Esto o Aquello (secret choice + reveal, Realtime)
    conoces/page.tsx            <- ¿Cuánto me conoces? (uno responde por el otro)
    quien-de-los-dos/page.tsx   <- ¿Quién de los dos? (secret choice + reveal, normal/picante)
    verdad-o-reto/page.tsx      <- Verdad o Reto (un solo dispositivo, consentimiento picante)
    ruleta-picante/page.tsx     <- Ruleta Picante (+18, aviso previo, gating premium)
  actions/
    ritual.ts               <- getUserContext, getRitualOfDay, submitResponse, streak, historial
    couple.ts               <- crearPareja, verificarInvitacion, unirseAPareja
    perfil.ts               <- getPerfilData, updatePerfil
    perfil-preferencias.ts  <- Intensidad máxima de la pareja (couples.intensidad_maxima)
    notifications.ts        <- get/update NotificationPrefs, setPushEnabled
    subscription.ts         <- isPremium, isCouplePremium
    eleccion.ts              <- start/submit ronda de Elección
    esto-aquello.ts          <- start/submit ronda de Esto o Aquello
    conoces.ts               <- start/submit ronda de ¿Cuánto me conoces?
    quien-de-los-dos.ts      <- start/submit ronda, modo normal/picante
    verdad-o-reto.ts         <- Selección de contenido con techo + variedad + categoría preferida
    ruleta-picante.ts        <- Ídem, +18
    picante-consent.ts       <- Consentimiento explícito para contenido +18
    contenido-rechazado.ts   <- Marcar item como "no me gusta" (excluir de futuras rondas)
    rondas-jugadas.ts        <- Registro server-side de rondas jugadas (couple_rondas_jugadas)
    juegos-stats.ts          <- Estadísticas agregadas (totalJuegos, etc.) para /perfil y niveles
    momentos.ts               <- Detección y registro de "Momentos" (couple_momentos)
    historial-juegos.ts      <- Historial combinado de los 6 juegos (get_historial_juegos, tab "Juegos")
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
  BottomNav.tsx              <- Nav bar inferior fija (Hoy / Juegos / Historial / Perfil)

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
  intensidad.ts             <- Filtro de contenido por techo de intensidad de la pareja
  categoriaPreferida.ts     <- Categoría "pegajosa" por sesión, sessionStorage (client-only)
  turnos.ts                 <- Utilidades para alternar turnos entre miembros de la pareja
  niveles.ts                <- Nivel de progresión emocional de la pareja (mensaje adaptativo del hub)
  juegos.ts                 <- Metadata compartida de los 6 juegos (nombres, rutas, emojis)

hooks/
  usePushNotifications.ts   <- Hook: subscribe, loading, isSupported

types/
  index.ts                  <- Profile, Couple, Ritual, CoupleRitualSession, Streak, Subscription,
                               SessionState, UserContext, NotificationPrefs, HistorialJuegoEntry, ...

public/
  sw.js                     <- Service Worker para Web Push
  manifest.json              <- PWA manifest (avisos funcionan en iOS Safari)

supabase/
  config.toml
  migrations/
    001_tablas_y_rls.sql    <- profiles, subscriptions (legacy)
    002_trial_en_profiles.sql
    003_mercadopago_subscription.sql <- Legacy MP (activa, la usan create-mp-subscription/mp-webhook)
    004_trigger_profiles_on_signup.sql <- Auto-crea profile al registrar
    005_eleccion_remota.sql <- Legacy (sin uso activo, superseded por couple_eleccion_rounds)
    006_rituales_mvp.sql    <- couples, couple_members, rituals, sessions, streaks
    007_contenido_rituales.sql <- ~160 rituales adicionales
    008_invite_lookup.sql   <- RPCs: check_invite_code, join_couple_by_invite
    009_profiles_partner_read.sql <- RLS: leer perfil de pareja vinculada
    010_notifications.sql   <- notification_prefs, push_subscriptions, notification_log
    011_push_subs_update_policy.sql
    012_profiles_avatar.sql <- Columna avatar (emoji) en profiles
    015_eleccion_rounds.sql <- couple_eleccion_rounds (juego Elección)
    023_esto_aquello_rounds.sql <- couple_esto_aquello_rounds (juego Esto o Aquello)
    026_contenido_juegos_en_db.sql <- verdad_o_reto_items, esto_o_aquello_items, eleccion_prompts,
                             ruleta_picante_items (contenido de juegos desde DB, no arrays estáticos)
    028_conoces_rounds.sql  <- couple_conoces_rounds (juego ¿Cuánto me conoces?)
    031_momentos.sql        <- couple_momentos (sistema de hitos destacables)
    034_quien_de_los_dos.sql <- couple_quien_de_los_dos_rounds + modo normal/picante
    035_picante_consent.sql <- Consentimiento explícito contenido +18
    037_metadata_contenido.sql <- columnas intensidad/categoria en el contenido de los 6 juegos
    038_intensidad_maxima_pareja.sql <- couples.intensidad_maxima, couples.picante_habilitado
    040_rondas_jugadas.sql  <- couple_rondas_jugadas (VoR/Ruleta Picante, alimenta niveles y variedad)
    041/042_momento_primera_partida_*.sql <- Momento "primera partida" para VoR y Ruleta Picante
    043_historial_juegos.sql <- get_historial_juegos(): historial combinado de los 6 juegos
    044_display_name_en_trigger_signup.sql <- Fix: handle_new_user() ahora guarda display_name
                             desde raw_user_meta_data (antes solo copiaba id/email)
    045_invite_code_en_perfil.sql <- get_perfil_page_data() ahora expone inviteCode cuando la
                             pareja tiene un solo miembro, para poder recuperar el link

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

-- Juegos (además de couples arriba, columnas agregadas por 038):
couples
  + intensidad_maxima (liviana | media | intensa, default intensa)
  + picante_habilitado (bool)

couple_eleccion_rounds / couple_esto_aquello_rounds / couple_conoces_rounds / couple_quien_de_los_dos_rounds
  id, couple_id, option_a / option_b / pregunta (texto ya copiado del item, NO item_id)
  user1_choice / user2_choice (o subject_choice / guesser_choice para Conoces)
  revealed_at   <- seteado por la función SECURITY DEFINER submit_*_choice, no por trigger
  [ver DEUDA-TECNICA.md: no guardan categoria/intensidad propia]

couple_rondas_jugadas
  couple_id, juego (verdad_o_reto | ruleta_picante), item_id, categoria, created_at
  [única fuente que sí trackea categoría por ronda — alimenta variedad, niveles e historial de juegos]

couple_momentos
  couple_id, tipo (sorpresa | reto_doble | gran_desacuerdo | primera_partida_verdad_o_reto |
    primera_partida_ruleta_picante), created_at
  [hitos destacables detectados server-side, mostrados en /perfil]

verdad_o_reto_items / esto_o_aquello_items / eleccion_prompts / ruleta_picante_items
  id, texto/option_a+option_b/pregunta, categoria, intensidad, premium (Ruleta Picante)
  [mismo patrón que rituals — contenido versionado en DB, no arrays estáticos]
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
