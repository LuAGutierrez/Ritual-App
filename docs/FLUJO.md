# Flujos de usuario — Rituales

Última actualización: julio 2026

---

## 1. Registro y onboarding

```
/auth (tab Registrarse)
  → supabase.auth.signUp({ email, password, options.data.display_name })
  → Si Supabase no requiere confirmación: sesión activa → /ritual
  → Si requiere confirmación: mensaje "revisá tu email"
  → Email confirmado → /auth/callback?token_hash=... → /ritual

/onboarding (si no tiene display_name en profiles)
  paso 1: ingresar nombre → supabase profiles.update({ display_name })
  paso 2: opciones
    → "Crear pareja e invitar" → crearPareja() → link /unirse/[code]
    → "Explorar solo" → /ritual

/unirse/[code] (invitado)
  → verificarInvitacionAction(code) → supabase.rpc('check_invite_code')
  → Si ok: unirseAPareja(code) → supabase.rpc('join_couple_by_invite')
  → redirect /ritual
```

---

## 2. Ritual diario

```
/ritual (init)
  1. getUserContextAction() → profile + couple + partnerProfile
  2. getRitualOfDayAction(coupleId)
     → busca sesión existente hoy en couple_ritual_sessions
     → si no existe: crea sesión nueva con ritual determinístico
  3. getStreakAction(coupleId)
  4. subscribeToSession(coupleId, sessionId) → Supabase Realtime

Estados de sesión (SessionState):
  loading          → spinner
  no_couple        → CTA para vincular pareja
  waiting_self     → RitualCard (textarea + submit)
  waiting_partner  → WaitingState (mi respuesta + "esperando a X")
  revealed         → RevealCards (Framer Motion stagger)
  completed        → "Listo por hoy" + botón historial

Flujo de respuesta:
  handleSubmit → submitResponseAction(sessionId, response)
    → actualiza user1_response o user2_response según userId
    → si ambos completados: setea revealed_at
    → si solo uno completó: notifyPartnerResponded(partnerId) (push)

Realtime (postgres_changes UPDATE en couple_ritual_sessions):
  → actualiza session state en tiempo real
  → detecta si partner respondió primero → muestra PartnerRespondedBanner
  → si revealed: handleStreakUpdate(coupleId)
```

---

## 3. Streak y comodín

```
updateStreakAction(coupleId):
  → si first time: INSERT {current: 1, longest: 1, last_date: today}
  → si last_date == yesterday: current++, longest = max(longest, current)
  → si last_date otro: current = 1
  → llamado al entrar en estado 'revealed'

usarComodinAction(coupleId):
  → verifica wildcards_remaining > 0
  → verifica que la racha esté en riesgo (last_date no es hoy ni ayer)
  → descuenta wildcard y setea last_completed_date = ayer
  → solo desde /ritual o /perfil (manual)

Condición "racha en riesgo":
  streak.current_streak > 0
  && last_completed_date no es hoy
  && last_completed_date no es ayer
  && wildcards_remaining > 0
```

---

## 4. Push Notifications

```
Activación:
  → Post-reveal: PushPermissionPrompt aparece (si no fue dismissado)
  → usePushNotifications.subscribe() → navigator.serviceWorker
    → POST /api/push/subscribe → guarda en push_subscriptions
  → setPushEnabledAction(true) → notification_prefs.push_enabled = true

Notificación "Tu pareja respondió":
  → submitResponseAction → notifyPartnerResponded(partnerId)
  → verifica prefs.push_enabled && prefs.partner_responded
  → verifica !alreadyNotifiedToday('partner_responded')
  → sendPushToUser → fetch push_subscriptions → web-push.sendNotification

Reminder diario (cron 23:00 UTC):
  → GET /api/cron/daily-reminder
  → por cada usuario con push_enabled + daily_reminder
    → isReminderHour(reminder_time, timezone)
    → !alreadyNotifiedToday('daily_reminder')
    → ritual del día no completado (revealed_at IS NULL)
    → sendPushToUser + logNotification
```

---

## 5. Historial

```
/historial
  getHistorialAction(coupleId, categoria, offset)
    → isCouplePremiumAction(coupleId)
    → COUNT total sesiones reveladas (con/sin filtro categoría)
    → Si !premium && offset >= FREE_HISTORIAL_LIMIT: devuelve []
    → cappedLimit = premium ? limit : min(limit, FREE_LIMIT - offset)
    → devuelve sessions + hasMore + isPremium + totalCompleted

  Paginación: "Cargar más" append sessions (offset += sessions.length)
  Filtro: cambio de categoría resetea a offset=0

  Premium upsell: si !premium && totalCompletedAll > FREE_LIMIT && !hasMore
    → card con CTA a /precios
```

---

## 6. Auth recovery (recuperar contraseña)

```
/auth (tab login) → "Olvidé mi contraseña"
  → supabase.auth.resetPasswordForEmail(email, {redirectTo: /auth/callback?type=recovery})
  → Email con link → /auth/callback?token_hash=...&type=recovery
    → route.ts: supabase.auth.verifyOtp → redirect /auth?recovery=1
  → /auth con tab 'nueva_contraseña' activo
  → handleNewPassword → supabase.auth.updateUser({ password })
  → redirect /ritual

Fallback para links legacy (hash-based):
  → AuthHashRedirect detecta access_token en hash → /auth#access_token=...
  → auth/page.tsx useLayoutEffect detecta hash → tab 'nueva_contraseña'
  → initRecoverySession: setSession con access_token + refresh_token del hash
```

---

## 7. Redirect inteligente en root

```
/ (app/page.tsx — Server Component)
  → getUser()
  → !user → <AuthHashRedirect /> (client, maneja hash de recovery)
  → user sin couple → verifica display_name
    → sin display_name → /onboarding
    → con display_name → /ritual (puede invitar pareja desde allí)
  → user con couple → /ritual

middleware.ts:
  → rutas protegidas: /ritual, /onboarding, /historial, /perfil, /precios
  → !user → redirect /auth?redirect=pathname
```
