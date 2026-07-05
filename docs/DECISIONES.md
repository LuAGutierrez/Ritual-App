# Decisiones técnicas — Rituales

Última actualización: julio 2026

---

## Server Actions en lugar de API Routes para operaciones con auth

**Decisión**: Toda la lógica de negocio que requiere sesión usa `'use server'` (Server Actions) en lugar de endpoints `/api/`.

**Motivo**: El token JWT de Supabase en el browser puede estar desactualizado en ciertas situaciones. Las Server Actions acceden a las cookies de sesión del servidor (via `@supabase/ssr`), que siempre están frescos. Además simplifica el código: no hay `fetch`, no hay manejo de errores HTTP, los tipos se comparten directamente.

**Excepción**: Las API Routes se usan donde no hay usuario autenticado que inicie la acción:
- `/api/cron/daily-reminder` — iniciado por Vercel, no por el usuario
- `/api/push/subscribe` y `/api/push/unsubscribe` — la suscripción push es del navegador

---

## Tres Supabase clients distintos

| Client | Archivo | Cuándo usarlo |
|--------|---------|---------------|
| Server (anon) | `lib/supabase/server.ts` | Server Actions, middleware — accede con la sesión del usuario |
| Browser (anon) | `lib/supabase/client.ts` | Client Components — Realtime, signOut |
| Service (service_role) | `lib/supabase/service.ts` | Cron, push backend — bypasa RLS, nunca en browser |

---

## Ritual determinístico por fecha

**Decisión**: El ritual del día se elige como `rituals[dayOfYear % total].id`, no aleatoriamente.

**Motivación**:
- Toda la pareja ve el mismo ritual aunque abran la app en momentos distintos.
- No requiere un sistema de scheduling o selección en la DB.
- Predecible y reproducible.

**Limitación**: Si se agregan rituales, el índice del día cambia para fechas futuras. No es un problema mientras el catálogo crezca ordenadamente por `created_at`.

---

## RLS en todas las tablas

**Decisión**: RLS habilitado en todas las tablas. Los usuarios solo pueden ver y editar sus propios datos o los de su pareja vinculada.

**Políticas clave**:
- `couple_members`: el usuario ve su propia membresía y la de los miembros de su pareja.
- `profiles`: RLS permite leer el perfil de la pareja vinculada (`009_profiles_partner_read.sql`).
- `couple_ritual_sessions`: solo miembros de la pareja pueden leer/escribir.
- `push_subscriptions`: el service client bypasa RLS para enviar notificaciones.

---

## Realtime solo para couple_ritual_sessions

**Decisión**: Solo la tabla `couple_ritual_sessions` está en `supabase_realtime`.

**Motivación**: Es la única tabla donde un cambio de otro usuario (la pareja respondiendo) debe reflejarse inmediatamente en el UI. El resto de datos (perfil, streak, etc.) no necesita sincronización en tiempo real.

---

## Reveal automático en submitResponseAction

**Decisión**: Cuando el segundo usuario responde, `submitResponseAction` setea `revealed_at` en el mismo UPDATE, en el servidor.

**Motivación**: Garantiza que el reveal sea atómico. No hay race condition donde ambos usuarios crean que deben revelar. El Realtime subscription en el cliente detecta el `revealed_at` y transiciona el estado automáticamente.

---

## Premium a nivel de pareja, no de usuario

**Decisión**: `isCouplePremiumAction` retorna `true` si cualquiera de los dos miembros tiene suscripción activa.

**Motivación**: La app es una experiencia compartida. Si uno paga, la pareja accede. Esto reduce la fricción de conversión y es un argumento de venta ("un sólo pago para los dos").

---

## freemium: límite de historial (no bloqueo del ritual)

**Decisión**: El plan gratuito limita el historial a `FREE_HISTORIAL_LIMIT = 30` sesiones. El ritual diario siempre está disponible.

**Motivación**: El ritual es el producto core. Bloquearlo generaría abandono inmediato. El historial es un "archivo de recuerdos" que tiene valor incremental — paywall suave aquí maximiza conversión sin destruir retención.

---

## Push notifications post-reveal, no en registro

**Decisión**: El prompt de permisos push se muestra después del primer reveal, no al registrarse.

**Motivación**: El usuario en ese momento ya experimentó el valor del producto (vio las respuestas con su pareja). La probabilidad de aceptar el permiso es mucho mayor que al inicio. Evita la fatiga de permisos en onboarding.

---

## Wildcard (comodín) manual

**Decisión**: El comodín protege la racha pero el usuario debe activarlo explícitamente.

**Motivación**: La activación manual crea un momento de agencia — el usuario "decide" proteger su racha. Más memorable y con más peso emocional que un mecanismo automático invisible.

---

## Vercel Hobby (1 cron/día)

**Decisión actual**: El cron de reminder corre 1 vez al día a las 23:00 UTC.

**Limitación**: No se pueden enviar reminders a la hora exacta configurada por el usuario (porque requeriría múltiples crons o Vercel Pro). La solución actual: el cron filtra por `isReminderHour(prefs.reminder_time, timezone)` — solo notifica a quienes tienen su hora configurada cerca de las 23:00 UTC (20:00 ART por defecto).

**Migración a Pro**: Si el plan sube, simplemente cambiar el schedule en `vercel.json` y agregar más horarios.

---

## display_name en signUp + trigger en DB

**Decisión**: Al registrarse, el `display_name` se pasa como `options.data.display_name`. Un trigger de Supabase (`004_trigger_profiles_on_signup.sql`) crea el profile automáticamente con ese dato.

**Motivación**: Evita una segunda llamada a la API después del signUp. Si el usuario confirma email, el profile ya existe cuando llega.

---

## AuthHashRedirect en root

**Decisión**: `app/page.tsx` es Server Component (para el redirect según estado). Pero los links de recovery de Supabase vienen con hash (`#access_token=...`) que el servidor no puede leer. Se resuelve con `AuthHashRedirect`, un client component que detecta el hash y redirige a `/auth`.

**Motivación**: Mantener `page.tsx` como Server Component (mejor performance, redirect sin JS) y manejar el edge case de auth via hash solo en el cliente cuando es necesario.
