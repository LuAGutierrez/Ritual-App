# Decisiones técnicas — Rituales

Última actualización: 17 de agosto de 2026

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

**Actualización (agosto 2026)**: este componente también es la landing pública que ve cualquier
visitante no-autenticado en `/` — incluido el crawler de Google Brand Verification. Originalmente
solo mostraba un `<PageLoader />` (un spinner sin texto), lo cual bastaba para un humano (redirige
en un instante) pero hacía que Google rechazara la verificación de marca con "no se explica el
propósito de la app", porque el crawler lee el HTML inicial, no el resultado del `useEffect`. Se
agregó markup real (título + descripción de la app) antes del spinner/redirect. Ver la entrada de
Google Brand Verification más abajo.

---

## Patrón "secret choice + reveal" reusado 4 veces

**Decisión**: Elección, Esto o Aquello, ¿Quién de los dos? y (con variante) ¿Cuánto me conoces?
comparten el mismo esqueleto: cada miembro elige en privado, un `SECURITY DEFINER` guarda la
elección y setea `revealed_at` cuando ambas están cargadas, el cliente lo detecta por Realtime.

**Motivación**: confirma que el mecanismo (elegir en secreto + revelar sincronizado) es independiente
del contenido (prompts de elección vs. preguntas de "quién de los dos" vs. comparar percepciones en
Conoces) — agregar un juego nuevo con este mecanismo es mayormente contenido + una tabla + una función
SQL calcada de las anteriores, no diseño nuevo.

**Trampa a evitar** (aprendida probando el reveal manualmente): `revealed_at` se setea *dentro* de la
función `SECURITY DEFINER`, no por un trigger de DB. Un `UPDATE` crudo de las columnas de respuesta
sin pasar por la función real no dispara el reveal — hay que invocar la función (o simular con
`set local role authenticated; set local request.jwt.claims = ...`) para probar el flujo de verdad.

---

## Techo de intensidad por pareja, no por ronda

**Decisión**: `couples.intensidad_maxima` (`liviana`/`media`/`intensa`, default `intensa`) es un único
valor configurable desde `/perfil` que filtra el contenido elegible en los 6 juegos, en vez de pedir
la intensidad deseada en cada ronda.

**Motivación**: menos fricción — la pareja lo configura una vez y no tiene que decidirlo en cada
partida. El default es `intensa` (sin restringir) para no imponer un techo que nadie pidió.

**Limitación conocida**: no hay tracking de qué intensidad tuvo cada ronda jugada individualmente,
solo el techo configurado. La sugerencia de "subir el techo" en `/perfil` usa una señal más simple ya
disponible (`totalJuegos >= 10` con techo en `liviana`) en vez de contar rondas por intensidad real,
justamente porque ese dato no existe. Ver `docs/DEUDA-TECNICA.md`.

---

## Categoría preferida "pegajosa" en sessionStorage, no en DB

**Decisión**: la categoría elegida en los chips del hub `/juegos` se guarda en `sessionStorage`
(`lib/categoriaPreferida.ts`), no en una columna de `couples` ni en el servidor.

**Motivación**: es una preferencia de "ahora, en esta sesión de juego", no una configuración
permanente de la pareja (a diferencia del techo de intensidad, que sí vive en DB). `sessionStorage`
sobrevive la navegación entre el hub y cada juego (páginas distintas, sin árbol de componentes
compartido) pero se resetea sola en una pestaña nueva o sesión nueva — comportamiento deseado, no
hace falta un botón de "olvidar preferencia" más que el `✕` que ya limpia el filtro activo.

**Explícitamente descartado**: persistirla entre dispositivos/sesiones. Igual que el resto del estado
de variedad (última categoría jugada, `ultimaCategoriaRef`), queda intencionalmente efímera.

---

## Sin modelo formal de turnos

**Decisión**: `lib/turnos.ts` son utilidades puntuales para alternar entre miembros de la pareja
(ej. quién es el "adivinador" en ¿Cuánto me conoces?), no un sistema de turnos con estado persistido.

**Motivación**: ningún juego actual necesita recordar de una sesión a otra "a quién le toca" — cada
ronda nueva decide el turno de forma determinística o aleatoria en el momento. Construir un modelo de
turnos con estado en DB sería anticipar un requisito que ningún juego pide hoy.

---

## Google Brand Verification en vez de dominio custom pago de Supabase

**Decisión**: para que el selector de cuenta de Google mostrara "Rituales" (nombre + logo) en vez de
la URL cruda del proyecto de Supabase durante el login con Google, se usó **Google Brand
Verification** (gratuita, en Google Cloud Console → Google Auth Platform → Información de la marca),
no el add-on de dominio custom de Supabase (pago).

**Motivación**: la hipótesis inicial (que hacía falta el dominio custom pago) era incorrecta — se
corrigió tras un caso real reportado por el usuario (otra app, sin plan pago de Supabase, mostraba
igual el nombre propio). Brand Verification exige: nombre de la app, dominios autorizados verificados
en Search Console, y links reales (no vacíos) a home/privacidad/términos — de ahí `app/privacidad/`,
`app/terminos/` y el fix de `AuthHashRedirect` de esta misma sesión.

**Nota operativa**: el "correo de asistencia al usuario" de la pantalla de consentimiento solo puede
elegirse entre emails de la cuenta de Google logueada en ese momento (o grupos que administre) — para
usar `ritual.platform@gmail.com` en vez del email personal del dueño, hubo que darle a esa cuenta rol
IAM Owner en el proyecto de GCP y loguearse con ella para seleccionarse a sí misma; no hay forma de
hacerlo por API o en nombre de otra cuenta.

---

## MP_BACK_URL apuntando al dominio propio, no a *.vercel.app

**Decisión**: la Edge Function `create-mp-subscription` usa el secret `MP_BACK_URL` =
`https://www.rituales.site/precios` en vez del fallback hardcodeado `https://rituales.vercel.app/precios`.

**Motivación**: Mercado Pago rechaza `back_url` en dominios `*.vercel.app` cuando el checkout corre en
modo producción (no en sandbox). Al investigar este fix se confirmó que `MP_ACCESS_TOKEN` ya es un
token de producción (no configurado en esta sesión) — el checkout de `/precios` puede procesar cobros
reales desde este cambio. Ver `docs/DEUDA-TECNICA.md`.
