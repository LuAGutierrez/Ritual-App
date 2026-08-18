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

**Decisión**: Al registrarse, el `display_name` se pasa como `options.data.display_name`. Un trigger de Supabase (`004_trigger_profiles_on_signup.sql`, corregido por `044_display_name_en_trigger_signup.sql`) crea el profile automáticamente con ese dato, leyéndolo de `raw_user_meta_data->>'display_name'`.

**Motivación**: Evita una segunda llamada a la API después del signUp. Si el usuario confirma email, el profile ya existe cuando llega.

**Bug encontrado y corregido (17/08)**: el trigger original (`004`) solo copiaba `id`/`email`, nunca leyó `display_name` — el nombre tipeado en el registro se perdía siempre. Existía un `.upsert()` client-side en `app/auth/page.tsx` que sí lo guardaba, pero solo corre si `signUp()` devuelve sesión inmediata; con confirmación de email obligatoria (estado actual en producción), eso nunca pasa, así que el upsert nunca se ejecutaba. Consecuencia real: `/onboarding` repreguntaba el nombre a todos los que se registraban por email/contraseña, no como fricción cosmética sino porque el nombre nunca se había guardado. Corregido en `044` para que el trigger lea `raw_user_meta_data->>'display_name'` directamente — probado de punta a punta (registro → confirmar email → onboarding salta al paso 2 sin repreguntar).

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

**Reversión (17/08)**: se sacaron los chips de la UI en `/juegos`. Motivo del usuario: darle al
cliente la posibilidad explícita de elegir categoría hace que se concentre únicamente en esa, en
contra del espíritu de variedad/descubrimiento que se buscaba con la selección automática de
contenido. Se evaluó sacar el mecanismo completo, pero se decidió dejarlo (`lib/categoriaPreferida.ts`
y el parámetro `categoriaPreferida` en los 6 `app/actions/*` de juegos) por si se quiere reactivar
más adelante con otro diseño — por ejemplo, controlado por el sistema en vez de por elección manual
del usuario. Sin UI que llame a `setCategoriaPreferida`, `getCategoriaPreferida()` siempre devuelve
`null`, así que hoy es código sin efecto: la cadena de selección de contenido queda funcionando solo
con techo de intensidad + variedad automática.

**Hallazgo de contenido relacionado** (post-mortem, no motivó la reversión pero quedó documentado):
al revisar cuánto contenido hay por categoría, la categoría "Reto" no tiene ningún ítem en ninguno de
los 6 juegos, y "¿Cuánto me conoces?"/"¿Quién de los dos?" usan categorías internas ("nosotros",
"comparación") que no son ninguna de las 7 seleccionables — para esos dos juegos en modo normal, el
filtro de categoría preferida nunca podía matchear nada. Además, casi todo el contenido picante de
los 6 juegos está categorizado como "Fantasías" — elegir cualquier otra categoría no tenía efecto
real sobre el modo picante de ningún juego. Si en el futuro se reactiva el mecanismo, conviene
revisar/ampliar el contenido por categoría antes.

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

## "Vincular pareja" en /ritual crea la pareja directo, sin pasar por /onboarding

**Decisión**: el botón "Vincular pareja" que aparece en `/ritual` cuando el usuario no tiene pareja
llama a `crearPareja()` directamente y muestra el link de invitación ahí mismo, en vez de redirigir a
`/onboarding`.

**Motivación**: `/onboarding` sigue existiendo para el primer registro (pide el nombre). Pero un
usuario que llega a `/ritual` en estado `no_couple` **siempre** ya tiene `display_name` guardado — el
redirect inteligente de `app/page.tsx` garantiza eso (sin nombre no se llega a `/ritual`). Mandarlo a
`/onboarding` de nuevo solo mostraba una pantalla intermedia ("Hola, {nombre}") con el mismo botón
"Crear pareja e invitar" — un click extra sin ningún valor. `/onboarding` sigue siendo el único
camino para quien recién se registra y todavía no tiene nombre.

---

## "¿Cuánto me conoces?" avisa si nadie se unió, en vez de un error genérico

**Decisión**: `app/juegos/conoces/page.tsx` ahora chequea `ctx.couple && !ctx.partnerProfile` apenas
carga la página, y muestra "Todavía no se unió nadie" + el link de invitación (mismo patrón que
`/ritual` y `/perfil`) en vez de dejar que el usuario toque "Empezar ronda" y se encuentre con un
error.

**Motivación**: de los 6 juegos, Conoces es el único que usa `lib/turnos.ts` (`siguienteTurno()`)
para decidir quién es el sujeto de la ronda — esa función necesita 2 miembros en `couple_members` y
devuelve `null` con uno solo, así que `startConocesRoundAction` fallaba y el usuario veía "No se pudo
empezar la ronda. Intentá de nuevo." — un mensaje que suena a falla transitoria cuando en realidad
nunca iba a funcionar sin que alguien se una. Los otros 5 juegos arman `user1_id`/`user2_id` directo
desde `couple_members` sin exigir el segundo miembro, así que no tienen este problema puntual (aunque
podrían compartir el "esperando genérico sin nombre real" que ya se corrigió en `/ritual` — no
verificado todavía juego por juego). Probado en local con cuenta real: pareja creada sin unir a
nadie, entrar a `/juegos/conoces` ya no ofrece "Empezar ronda" en absoluto.

---

## "¿Quién de los dos?" también avisa si nadie se unió

**Decisión**: mismo fix que Conoces, aplicado a `app/juegos/quien-de-los-dos/page.tsx`.

**Motivación**: acá el bug era distinto al de Conoces pero el síntoma era el mismo. Este juego arma
`user1_id`/`user2_id` directo desde `couple_members` (no usa `siguienteTurno()`), así que
`startQuienDeLosDosRoundAction` sí crea la ronda con `user2_id: null` sin fallar -- el usuario podía
elegir una opción y quedaba en "Ya elegiste / Esperando a tu pareja..." **para siempre**, sin ningún
indicio de que nadie se había unido ni forma de invitar desde ahí. Confirmado en vivo antes del fix:
"Empezar ronda" funcionaba, se podía elegir, y quedaba colgado en la pantalla de espera genérica
(`ctx?.partnerProfile?.display_name ?? 'tu pareja'`). Ahora se corta antes: si `ctx.couple` existe
pero `ctx.partnerProfile` no, se muestra el link de invitación en vez de dejar arrancar una ronda que
nunca iba a poder revelarse. Quedan los otros 3 juegos (Elección, Esto o Aquello, Verdad o Reto/Ruleta
Picante) sin verificar todavía para este mismo escenario.

---

## Elección y Esto o Aquello también avisan si nadie se unió; Verdad o Reto/Ruleta Picante no lo necesitan

**Decisión**: mismo fix aplicado a `app/juegos/eleccion/page.tsx` y
`app/juegos/esto-o-aquello/page.tsx`. Verdad o Reto y Ruleta Picante quedan sin cambios: revisados y
confirmado que no tienen este bug.

**Motivación**: mismo bug de silent-hang que en "¿Quién de los dos?" -- Elección y Esto o Aquello
arman `user1_id`/`user2_id` directo desde `couple_members` e insertan con `user2_id: user2 || null`,
así que la ronda se crea igual, el usuario puede elegir una opción y queda colgado para siempre en
"Ya elegiste / Esperando a {ctx?.partnerProfile?.display_name ?? 'tu pareja'}..." sin ningún indicio
de que nadie se unió. Se corta antes con el mismo patrón: si `ctx.couple` existe pero
`ctx.partnerProfile` no, se muestra el link de invitación en vez de dejar arrancar la ronda.

Verdad o Reto y Ruleta Picante son distintos por diseño: no importan `UserContext`, no tienen
concepto de pareja ni de `couple_members` en absoluto -- son juegos de un solo dispositivo, sin
mecánica de dos personas ni reveal sincronizado. No hay bug de esta clase para corregir ahí.

Probado en local con cuenta real sin pareja unida: `/juegos/eleccion` y `/juegos/esto-o-aquello`
muestran "Todavía no se unió nadie" + link de invitación en vez de dejar elegir una opción;
`/juegos/verdad-o-reto` funciona normal (no hay pantalla de espera que mostrar, es local). Con esto
quedan los 4 juegos de dos personas (Conoces, Quién de los dos, Elección, Esto o Aquello) cubiertos
para este escenario.

---

## Refrescar ctx.partnerProfile cuando llega el reveal por Realtime

**Decisión**: en el callback de `postgres_changes` de `/ritual`, si `ctxRef.current?.partnerProfile`
todavía es `null`, se vuelve a pedir `getUserContextAction()` y se actualiza `ctx` si ahora sí trae
un partner.

**Motivación**: si la pareja se unió *después* de que cargaste `/ritual` (estabas parado en la
pantalla de espera cuando se unió y respondió), el reveal llegaba igual por Realtime -- pero
`ctx.partnerProfile` había quedado en `null` desde la carga inicial de la página, así que
`RevealCards` mostraba "Tu pareja" en vez del nombre real. Recargando la página se veía bien (porque
ahí sí se vuelve a pedir todo), pero en vivo no. Se usa un `ctxRef` (no `ctx` directo) para no forzar
que `subscribeToSession` se recree cada vez que cambia el contexto. Probado en local con dos cuentas
reales: A responde y queda esperando: B se une y responde vía API (mismo camino que usaría su
navegador) sin tocar la pestaña de A -- el nombre real aparece solo, sin recargar.

---

## "Esperando pareja" distingue si nadie se unió todavía

**Decisión**: en `/ritual`, cuando el estado es `waiting_partner` (ya respondiste, falta el otro
lado), se distingue si `ctx.partnerProfile` existe o no. Si no existe, se muestra "Todavía no se
unió nadie" + el link de invitación (armado desde `ctx.couple.invite_code`, que siempre viaja en el
contexto), en vez del `WaitingState` genérico ("Tu pareja aún no respondió").

**Motivación**: el mensaje genérico daba a entender que la pareja ya estaba vinculada y solo faltaba
que conteste hoy — pero si nadie se unió nunca, el reveal no depende de que "responda", depende de
que exista alguien del otro lado. Con el mensaje viejo, un usuario podía quedar esperando
indefinidamente sin entender por qué. Reportado por el usuario al preguntar cómo funciona el
circuito cuando la pareja no se unió.

---

## Invite link recuperable desde /perfil, no solo al crear la pareja

**Decisión**: `get_perfil_page_data()` (migración `045`) devuelve `inviteCode` cuando la pareja
existe pero tiene un solo miembro, y `/perfil` lo muestra con un botón de copiar.

**Motivación**: el link de invitación solo aparecía una vez, en la pantalla que sigue a "Crear pareja
e invitar"/"Vincular pareja". Si el usuario se iba de ahí sin copiarlo (por apuro, o por tocar
"Ir al ritual de hoy" antes de copiar), quedaba sin forma de invitar a su pareja — el `invite_code`
seguía existiendo en la tabla `couples`, pero ningún otro lugar de la UI lo mostraba. Reportado por
el usuario sobre su propia cuenta real.

---

## MP_BACK_URL apuntando al dominio propio, no a *.vercel.app

**Decisión**: la Edge Function `create-mp-subscription` usa el secret `MP_BACK_URL` =
`https://www.rituales.site/precios` en vez del fallback hardcodeado `https://rituales.vercel.app/precios`.

**Motivación**: Mercado Pago rechaza `back_url` en dominios `*.vercel.app` cuando el checkout corre en
modo producción (no en sandbox). Al investigar este fix se confirmó que `MP_ACCESS_TOKEN` ya es un
token de producción (no configurado en esta sesión) — el checkout de `/precios` puede procesar cobros
reales desde este cambio. Ver `docs/DEUDA-TECNICA.md`.

---

## "Una picante gratis" persistida por pareja, no en estado local de React

**Decisión**: nueva tabla `couple_picante_trial` (migración `046`, una fila por `(couple_id, juego)` —
la fila existe si ya se usó). `app/actions/picante-trial.ts` agrega `getPicanteTrialUsadoAction` /
`marcarPicanteTrialUsadoAction`, usados en los 5 juegos con modo picante (Elección, Esto o Aquello,
¿Quién de los dos?, Verdad o Reto, Ruleta Picante) en vez del `useState(false)` local que tenían.

**Motivación**: el límite de "una ronda picante gratis antes del paywall" vivía en un `useState` por
componente — se reseteaba solo con refrescar la página, y cada integrante de la pareja tenía su propio
contador en su propio dispositivo (Premium es a nivel de pareja, pero este límite no lo era).
Reportado por el usuario: jugó picante una vez, le pidió premium, pero su pareja pudo jugar una más
desde su propio celular. Probado en vivo con dos cuentas reales: después del fix, el intento de la
pareja B queda visible para A vía RLS (`SELECT` compartido), y el límite sobrevive un refresh completo
de la página.

---

## Una sola ronda activa por pareja en los 4 juegos de reveal simultáneo

**Decisión**: índice único parcial `UNIQUE (couple_id) WHERE revealed_at IS NULL` en las 4 tablas de
ronda (`couple_eleccion_rounds`, `couple_esto_aquello_rounds`, `couple_conoces_rounds`,
`couple_quien_de_los_dos_rounds`, migración `047`). Los `start*RoundAction` atrapan el conflicto
(`error.code === '23505'`) y devuelven la ronda existente en vez de fallar. Además, el listener de
Realtime de cada juego ahora ignora el evento de una ronda con `id` distinto mientras la propia sigue
sin revelar, en vez de hacer `setRound(payload.new)` a ciegas para cualquier fila de la pareja.

**Motivación**: reportado por el usuario en ¿Cuánto me conoces? — adivinó, esperó, su pareja respondió,
y a ella le seguía apareciendo "Ya respondiste, esperando que tu pareja adivine" para siempre.
Reproducido en vivo: nada impedía que existieran dos rondas sin revelar a la vez para la misma pareja
(típicamente los dos tocando "Empezar ronda"/"Jugar de nuevo" casi al mismo tiempo). Con una cuenta de
prueba parada en "Respondé sobre vos" sin haber contestado, insertar una segunda ronda hizo que su
pantalla saltara sola a la ronda nueva — la vieja (donde la otra persona ya había adivinado) quedaba
huérfana, esperando una respuesta que nunca iba a llegar porque nadie la tenía abierta. Confirmado que
el mismo patrón (`setRound(payload.new)` sin filtrar por id) existía en los 4 juegos, no solo en
Conoces. Con el índice único aplicado, se reintentó el mismo insert directo dos veces (con una ronda
activa distinta cada vez) y en ambas la base lo rechazó con `23505` — el escenario ya no puede
ocurrir, no solo se disimula en el cliente.
