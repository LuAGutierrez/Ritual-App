# Rituales — Diseño técnico: notificaciones web

Stack: Next.js 14 + Supabase + Vercel  
Alcance: **Fase A** (in-app) + **Fase B** (Web Push)  
Sin email automático. El email queda fuera del MVP; solo se consideraría en el futuro con **opt-in explícito** en `/perfil`.

---

## Objetivos

| Notificación | Canal | Cuándo |
|---|---|---|
| "Tu pareja ya respondió" | In-app + Push | Uno completa y el otro no |
| Reminder diario | Push | Hora configurable, si el ritual de hoy no está completo |

**Principios**
- Calmado, no urgente
- Pedir permiso en un momento emotivo (post-reveal), no en el registro
- Máximo 1 push por evento; máximo 1 reminder por día
- Sin email salvo que el usuario lo active manualmente en el futuro

---

## Arquitectura general

```
┌──────────────────────────────────────────────────────────────┐
│  FASE A — In-app (pestaña abierta)                           │
│                                                              │
│  couple_ritual_sessions UPDATE                               │
│       ↓ Realtime (ya existe en /ritual)                      │
│       ↓ Si partner completó y yo no → banner suave           │
└──────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│  FASE B — Web Push (pestaña cerrada)                         │
│                                                              │
│  Evento A: submitResponseAction                              │
│       ↓ API route /api/push/send-partner                     │
│       ↓ Busca subscriptions del partner                     │
│       ↓ Envía push con web-push                              │
│                                                              │
│  Evento B: Vercel Cron (cada hora)                           │
│       ↓ /api/cron/daily-reminder                             │
│       ↓ Usuarios con reminder_time = hora actual             │
│       ↓ Sin ritual completo hoy → push                       │
└──────────────────────────────────────────────────────────────┘
```

---

## Base de datos

### Migración `010_notification_prefs.sql`

```sql
-- Preferencias de notificación (1 fila por usuario)
create table public.notification_prefs (
  user_id          uuid primary key references auth.users(id) on delete cascade,
  push_enabled     boolean not null default false,
  partner_responded boolean not null default true,
  daily_reminder   boolean not null default true,
  reminder_time    time not null default '20:00',  -- hora local del usuario
  timezone         text not null default 'America/Argentina/Buenos_Aires',
  created_at       timestamptz default now(),
  updated_at       timestamptz default now()
);

alter table public.notification_prefs enable row level security;

create policy "prefs_select_own" on public.notification_prefs
  for select using (auth.uid() = user_id);

create policy "prefs_insert_own" on public.notification_prefs
  for insert with check (auth.uid() = user_id);

create policy "prefs_update_own" on public.notification_prefs
  for update using (auth.uid() = user_id);

-- Trigger: crear prefs al registrarse (junto al perfil)
create or replace function public.handle_new_user_prefs()
returns trigger as $$
begin
  insert into public.notification_prefs (user_id) values (new.id);
  return new;
end;
$$ language plpgsql security definer;
```

### Migración `011_push_subscriptions.sql`

```sql
-- Un usuario puede tener varios dispositivos/navegadores
create table public.push_subscriptions (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  endpoint   text not null unique,
  p256dh     text not null,
  auth       text not null,
  user_agent text,
  created_at timestamptz default now()
);

create index idx_push_subscriptions_user on public.push_subscriptions(user_id);

alter table public.push_subscriptions enable row level security;

create policy "subs_select_own" on public.push_subscriptions
  for select using (auth.uid() = user_id);

create policy "subs_insert_own" on public.push_subscriptions
  for insert with check (auth.uid() = user_id);

create policy "subs_delete_own" on public.push_subscriptions
  for delete using (auth.uid() = user_id);

-- El servidor (service_role) lee todas las subs para enviar push
-- → las API routes de envío usan createServiceClient(), no el cliente del usuario
```

### Log anti-spam (opcional pero recomendado)

```sql
create table public.notification_log (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  type       text not null,  -- 'partner_responded' | 'daily_reminder'
  sent_at    timestamptz default now()
);

create index idx_notification_log_user_type_date
  on public.notification_log(user_id, type, sent_at);
```

Evita mandar 2 reminders el mismo día o spamear "pareja respondió" si el usuario reabre la app.

---

## Variables de entorno

```env
# Generar con: npx web-push generate-vapid-keys
NEXT_PUBLIC_VAPID_PUBLIC_KEY=...
VAPID_PRIVATE_KEY=...
VAPID_SUBJECT=mailto:hola@rituales.app

# Solo en API routes / cron (nunca en el cliente)
SUPABASE_SERVICE_ROLE_KEY=...

# Proteger el cron de Vercel
CRON_SECRET=...
```

Agregar `.env.example` con estas vars (pendiente de deuda técnica del roadmap).

---

## Archivos nuevos

```
public/
  sw.js                          ← Service worker (recibe y muestra push)

lib/
  push/
    vapid.ts                     ← Claves VAPID
    send.ts                      ← sendPushToUser(userId, payload)
  supabase/
    service.ts                   ← Cliente con service_role (solo server)

hooks/
  usePushNotifications.ts        ← Pedir permiso + registrar subscription

components/
  PartnerRespondedBanner.tsx     ← Banner in-app Fase A
  PushPermissionPrompt.tsx       ← Modal post-reveal Fase B

app/
  api/
    push/
      subscribe/route.ts         ← POST: guardar subscription
      unsubscribe/route.ts       ← DELETE: quitar subscription
      send-partner/route.ts      ← POST: notificar al partner (interno)
    cron/
      daily-reminder/route.ts    ← GET: cron horario (protegido con CRON_SECRET)

  actions/
    notifications.ts             ← getPrefs, updatePrefs, registerPush, unregisterPush
```

### Cambios en archivos existentes

| Archivo | Cambio |
|---|---|
| `app/ritual/page.tsx` | Banner Fase A + prompt push post-reveal |
| `app/perfil/page.tsx` | Sección "Notificaciones" con toggles y hora |
| `app/actions/ritual.ts` | Tras `submitResponseAction`, llamar envío push al partner |
| `app/layout.tsx` | Registrar service worker al montar |
| `types/index.ts` | Tipos `NotificationPrefs`, `PushSubscription` |
| `vercel.json` | Cron job para reminder |
| `docs/ROADMAP.md` | Marcar progreso al implementar |

---

## Fase A — In-app (1 día)

### Comportamiento

Cuando Realtime detecta un `UPDATE` en `couple_ritual_sessions` y:
- el partner completó (`userX_completed_at` nuevo)
- yo aún no completé
- estado = `waiting_self` (o equivalente)

→ Mostrar banner suave arriba del ritual:

```
┌─────────────────────────────────────────────┐
│  ✦  Luciano ya respondió. ¿Y vos?           │
│                              [ Responder → ]  │
└─────────────────────────────────────────────┘
```

### Implementación

**`components/PartnerRespondedBanner.tsx`**
- Props: `partnerName`, `onDismiss`
- Estilo: `bg-ritual-gold/8 border border-ritual-gold/20`, sin animación agresiva
- Se oculta al responder o al dismiss

**`app/ritual/page.tsx`** — en el handler de Realtime existente:

```typescript
// Dentro del callback de postgres_changes UPDATE
const newState = resolveState(updated, userId)
setState(newState)

// Fase A: banner si partner respondió y yo no
if (newState === 'waiting_self' && wasWaitingPartner) {
  setShowPartnerBanner(true)
}
```

No requiere permisos ni tablas nuevas. Mejora inmediata con lo que ya hay.

---

## Fase B — Web Push (2–3 días)

### 1. Service worker — `public/sw.js`

```javascript
self.addEventListener('push', (event) => {
  const data = event.data?.json() ?? {}
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/icon-192.png',
      badge: '/badge-72.png',
      data: { url: data.url ?? '/ritual' },
    })
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  event.waitUntil(clients.openWindow(event.notification.data.url))
})
```

### 2. Hook — `hooks/usePushNotifications.ts`

```typescript
export function usePushNotifications() {
  async function subscribe() {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return false

    const permission = await Notification.requestPermission()
    if (permission !== 'granted') return false

    const reg = await navigator.serviceWorker.register('/sw.js')
    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    })

    await fetch('/api/push/subscribe', {
      method: 'POST',
      body: JSON.stringify(sub.toJSON()),
    })

    await updateNotificationPrefs({ push_enabled: true })
    return true
  }

  return { subscribe, isSupported: ... }
}
```

### 3. Cuándo pedir permiso — `PushPermissionPrompt.tsx`

**Momento:** justo después del primer reveal exitoso (no en registro, no en onboarding).

```
┌─────────────────────────────────────────────┐
│  ✦  ¿Querés que te avisemos?                │
│                                             │
│  Te escribimos solo cuando Luciano responda │
│  o si se les pasó el ritual del día.        │
│                                             │
│  [ Activar avisos ]    [ Ahora no ]         │
└─────────────────────────────────────────────┘
```

- "Activar avisos" → `subscribe()` del hook
- "Ahora no" → cerrar; no volver a mostrar en 7 días (`localStorage`)
- Link "Configurar después" → `/perfil`

### 4. Envío al partner — `lib/push/send.ts`

```typescript
import webpush from 'web-push'

export async function sendPushToUser(
  userId: string,
  payload: { title: string; body: string; url?: string }
) {
  const subs = await serviceClient
    .from('push_subscriptions')
    .select('*')
    .eq('user_id', userId)

  for (const sub of subs.data ?? []) {
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        JSON.stringify(payload)
      )
    } catch (err) {
      if (err.statusCode === 410) {
        // Subscription expirada → borrar
        await serviceClient.from('push_subscriptions').delete().eq('id', sub.id)
      }
    }
  }
}
```

### 5. Trigger en `submitResponseAction`

Al final de `submitResponseAction`, si solo uno completó:

```typescript
// Fire-and-forget (no bloquear la respuesta al usuario)
const partnerId = isUser1 ? session.user2_id : session.user1_id
if (partnerId && !updated.revealed_at) {
  fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/push/send-partner`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-internal-secret': process.env.INTERNAL_API_SECRET },
    body: JSON.stringify({ partnerId, responderName: profile.display_name }),
  })
}
```

**Copy del push:**
- Título: `Rituales`
- Cuerpo: `{nombre} ya respondió. ¿Y vos?`
- URL: `/ritual`

### 6. Reminder diario — `app/api/cron/daily-reminder/route.ts`

**`vercel.json`:**
```json
{
  "crons": [{
    "path": "/api/cron/daily-reminder",
    "schedule": "0 * * * *"
  }]
}
```

Corre cada hora. Para cada usuario con `daily_reminder = true` y `push_enabled = true`:

1. Convertir `reminder_time` + `timezone` a hora actual
2. Si coincide (ventana de 1 hora):
3. Verificar si tiene pareja y si la sesión de hoy **no** tiene `revealed_at`
4. Verificar `notification_log` — no enviar si ya mandó `daily_reminder` hoy
5. Enviar push:

```
Título: Rituales
Cuerpo: El ritual de hoy los espera.
URL: /ritual
```

### 7. Configuración en `/perfil`

Nueva sección debajo del avatar:

```
Notificaciones
─────────────────────────────────
☑ Avisarme cuando mi pareja responda
☑ Recordatorio diario del ritual
   Hora: [ 20:00 ▼ ]

Estado: ● Activas  /  ○ Desactivadas
[ Activar avisos ]  (si push_enabled = false)
```

Server Actions en `app/actions/notifications.ts`:
- `getNotificationPrefsAction()`
- `updateNotificationPrefsAction(prefs)`
- `unregisterPushAction()` — borra subs y pone `push_enabled = false`

---

## Seguridad

| Ruta | Protección |
|---|---|
| `/api/push/subscribe` | Usuario autenticado (session cookie) |
| `/api/push/send-partner` | Header `x-internal-secret` — solo llamada server-side |
| `/api/cron/daily-reminder` | Header `Authorization: Bearer ${CRON_SECRET}` (Vercel lo manda automático) |
| Lectura de `push_subscriptions` de otros usuarios | Solo `service_role` en API routes |

---

## UX / copy (tono Rituales)

| Situación | Copy |
|---|---|
| Pedir permiso | "¿Querés que te avisemos?" |
| Push pareja respondió | "{nombre} ya respondió. ¿Y vos?" |
| Push reminder | "El ritual de hoy los espera." |
| Banner in-app | "{nombre} ya respondió. ¿Y vos?" |
| Permiso denegado | "Podés activar los avisos desde tu perfil cuando quieras." |

**Nunca usar:** URGENTE, ¡no te lo pierdas!, tu pareja espera, etc.

---

## Limitaciones conocidas

| Plataforma | Web Push |
|---|---|
| Chrome / Firefox desktop | ✅ |
| Chrome Android | ✅ |
| Safari macOS | ✅ (desde macOS 13+) |
| Safari iOS | ⚠️ Solo si instaló la PWA ("Agregar a inicio") |
| In-app sin permiso | ✅ Fase A funciona igual |

Para iOS sin PWA, Fase A (banner in-app) sigue siendo la red de seguridad.

---

## Email — fuera del MVP

No se implementa. Si en el futuro se agrega:
- Solo con toggle explícito en `/perfil`: "Recibir recordatorios por email"
- Nunca como fallback automático
- Nunca sin que el usuario lo active

---

## Orden de implementación

```
1. [ ] Migraciones 010 + 011 (+ notification_log)
2. [ ] Fase A: PartnerRespondedBanner en /ritual
3. [ ] lib/push/send.ts + service client
4. [ ] public/sw.js + registro en layout
5. [ ] API subscribe / unsubscribe
6. [ ] Hook usePushNotifications + PushPermissionPrompt post-reveal
7. [ ] Trigger push en submitResponseAction
8. [ ] Sección notificaciones en /perfil
9. [ ] Cron daily-reminder + vercel.json
10. [ ] Iconos PWA (icon-192.png, badge-72.png)
11. [ ] Actualizar ROADMAP
```

**Estimación total:** 3–4 días de desarrollo.

---

## Dependencia npm

```bash
npm install web-push
npm install -D @types/web-push
```

`web-push` solo se usa en API routes (server-side), nunca en el cliente.
