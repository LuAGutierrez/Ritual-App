# Rituales — Roadmap

Stack actual: **Next.js 14 (App Router) + TypeScript + Tailwind CSS + Supabase**

Última actualización: 16 de septiembre de 2026

---

## Resumen

| Sprint | Estado |
|--------|--------|
| Sprint 1 — Core | ✅ Completo |
| Sprint 2 — Engagement | ✅ Completo (reminder diario: 1x/día por plan Hobby) |
| Sprint 3 — Monetización (Mercado Pago, suscripción mensual) | ❌ Retirada — reemplazada por Sprint 5 |
| Juegos (evolución) | ✅ 6 juegos, metadata rica, Momentos, historial, personalización — ver sección propia |
| Sprint 4 — IA e insights | ✅ Completo (15/09) — Verdad o Reto con IA, Ritual con IA, insights emocionales |
| Sprint 5 — Sistema de créditos | ✅ Completo y en producción (14/09) — backend, UI, pago único, cutover y anti-farmeo |

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
- [x] Iconos PWA — ya resueltos con generación dinámica (`app/icon.tsx`, `app/icons/[size]/route.tsx`,
      `app/manifest.ts`), no PNGs estáticos. `icon`/`badge` agregados al `showNotification` del
      service worker (15/09) para que las notificaciones también los usen.
- [ ] Reminder por hora custom requiere Vercel Pro (Hobby = 1 cron/día)

### Mejoras de pareja (no planificadas aún)
- [ ] Notificación cuando la pareja se une al link de invitación
- [ ] Salir de pareja / re-vincular
- [ ] Nombre de la pareja (`couples.name`)

---

## Sprint 3 — Monetización ❌ RETIRADA (14/09, ver Sprint 5)

> Histórico: esto es lo que se construyó y funcionó en producción entre agosto y el 14/09/2026. El
> modelo de suscripción mensual completo (Premium, `lib/plans.ts`, paywall, `/precios` como checkout
> de suscripción) se reemplazó por el sistema de créditos — ver "Sprint 5" más abajo para el estado
> actual. Se deja esta sección sin borrar como registro de lo que se hizo y por qué.

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
- [x] **Techo de intensidad por juego** (`liviana`/`media`/`intensa`, default `intensa`), elegido con
      chips en la propia pantalla de cada uno de los 6 juegos, filtra el contenido elegible
      (`lib/intensidad.ts`). Originalmente vivía como `couples.intensidad_maxima` configurable desde
      `/perfil` (migración `038`) — revertido el 17/09/2026 porque casi nadie entraba a `/perfil` a
      configurarlo antes de jugar. Ver `docs/DECISIONES.md`.
- ~~**Sugerencia de subir el techo**: si `intensidad_maxima = 'liviana'` y la pareja ya jugó 10+
  rondas, `/perfil` sugiere probar Media~~ retirado junto con el punto anterior (17/09/2026): sin un
  techo persistido por pareja, no hay "sugerencia" que dar.
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

### Insight con IA en "¿Cuánto me conoces?" (16/09/2026)
Repaso de los 6 juegos para ver dónde sumar IA de forma "didáctica" (no solo picante) — este es el
primer resultado. En el reveal de una ronda, botón "✨ Generar insight" (5 créditos, tarifa
`conoces_insight` en `lib/credits.ts`) que le pide al modelo un párrafo corto comentando el
acierto/desacuerdo de esa ronda puntual.
- [x] Tabla `couple_conoces_insights` (migración `073`): una fila por ronda (`round_id` UNIQUE) —
  si cualquiera de los dos ya lo generó, el otro lo ve sin pagar de nuevo, y sobrevive a un refresh
  (`get_conoces_page_data()` lo devuelve junto al `round`/`stats`).
- [x] `app/actions/conoces-insight.ts`: mismo patrón cobro-antes-de-generar + refund-on-failure que
  `ritual-ia.ts`, pero sin la capa de caché genérica por tags — el insight es específico de una
  ronda, no de una combinación de contexto reutilizable entre parejas.
- [x] Prompt sin nombres reales ("Persona A" / "Persona B"), mismo criterio de privacidad que el
  resto de las features de IA — no se manda quién es quién a Groq.
- [x] `¿Quién de los dos?` queda como candidato natural para el mismo patrón después — no se tocó en
  este cambio a propósito, para no meter dos features nuevas juntas.
- [x] Ajuste de tono (mismo día): el insight salía "romántico" con `couples.intensidad_maxima =
  'intensa'` porque heredaba `GUIA_POR_INTENSIDAD` (guía de tono sensorial de `lib/ai/prompts.ts`,
  pensada para los juegos picantes) aunque `conoces_items` nunca es picante. Se agregó
  `buildNeutralSystemPrompt()` (mismo guardrail de seguridad, sin la guía romántica) y
  `buildConocesInsightSystemPrompt` ya no recibe `intensidad` -- el insight suena igual sin
  importar el techo de intensidad configurado.

**Bug encontrado y corregido de paso**: probando `ritual_profundo` con la misma combinación de
ánimo/tiempo/objetivo dos veces seguidas, siempre devolvía el mismo ritual. Causa: `generarConIAAction`
cachea por `(feature, context_key)` exacto en `ai_content_cache` — la segunda vez ni llamaba a la IA,
servía la fila cacheada. Fix en migración `074`: la clave pasa a `(feature, context_key, variant)` con
`variant` elegido al azar entre 5 opciones en cada pedido (`CACHE_VARIANTS` en `app/actions/ritual-ia.ts`)
— sigue ahorrando tokens una vez que las 5 variantes de una combinación popular ya existen, pero dos
pedidos seguidos con el mismo contexto ya no devuelven necesariamente lo mismo.

---

## Sprint 4 — IA y personalización ✅ COMPLETO (15/09/2026)

### Verdad o Reto con IA ✅
- [x] Generación de consignas con IA en la tab picante (Groq) — ver "Sprint 4: IA en Verdad o Reto" en memoria del proyecto

### Rituales con IA ✅ (cumplido vía Sprint 5, no gratis — con créditos)
- [x] Generación de rituales personalizados basados en contexto de la pareja — `ritual_profundo`
      en `/ritual-ia` (10 créditos), usa ánimo/tiempo/objetivo/racha, no el historial completo de
      respuestas (eso implicaría mandarle contenido íntimo al proveedor de IA, se evitó a propósito)
- [x] Modo "sorpresa" por estado de ánimo declarado — chip "Ánimo" en `/ritual-ia`
- [ ] Sugerencias de temas no explorados — no se construyó

### Insights emocionales ✅ (15/09/2026)
- [x] Resumen semanal de la pareja: `get_couple_insights()` (migración `069`) cuenta rituales
      revelados en los últimos 7 días, la categoría que más eligieron esa semana, y compara contra
      la semana anterior (más/menos/igual). Sección "Esta semana" en `/perfil`
      (`app/actions/insights.ts`), oculta si la pareja todavía no tiene actividad.
- [x] Detección de patrones: entre las categorías de rituales elegibles para la pareja, identifica
      la que menos jugaron en los últimos 30 días (piso de 8 rituales revelados en el mes para no
      generar ruido con parejas nuevas). Se muestra como sugerencia suave, no como alerta.
- Deliberadamente scoped a rituales (no juegos): los 6 juegos usan taxonomías de categoría propias
  y dispares entre sí, mezclar ambas fuentes en un solo "patrón" hubiera sido confuso — candidato a
  v2 si se pide.

### rituals.premium: split gratis/créditos (15/09/2026, resuelve deuda técnica preexistente)
Los 30 rituales de viajes/planes/fantasías (migración `013`) habían quedado sin ningún mecanismo que
los sirviera desde que se retiró `subscriptions` (ver `docs/DEUDA-TECNICA.md`). Resuelto con un split
mitad y mitad (migración `069`):
- [x] 15 (5 por categoría) pasan a `premium = false` — gratis para siempre, ya entraron a la
      rotación diaria determinística normal (`get_ritual_page_data`).
- [x] Los otros 15 quedan reservados detrás de `unlock_rituales_especiales()`: desbloqueo
      **permanente por pareja**, pagado una sola vez con 30 créditos (`lib/credits.ts`,
      `RITUALES_ESPECIALES_COST`). Tarjeta en `/perfil` (`app/actions/rituales-especiales.ts`).
      Elegido en vez de un "sorteo bajo demanda" separado porque encaja directo en el mecanismo
      determinístico ya existente (mismo día → mismo ritual para toda la pareja) sin inventar un
      flujo de juego nuevo para simple contenido curado.
- [x] De paso se corrigió un bug latente en `get_ritual_page_data()`: el chequeo de "no repetir el
      ritual de ayer" tomaba la sesión de *cualquier* pareja al azar (inofensivo mientras el pool
      era 100% global e idéntico para todos); ahora que el pool puede diferir según si la pareja
      desbloqueó, quedó scoped a `couple_id`.
- `RitualCard.tsx`, `/historial` (filtro y labels) y `/perfil` (categoría favorita) ya tenían las
  labels/colores de viajes/planes/fantasías escritos de antes, sin usar — solo faltaba esta pieza.

---

## Sprint 5 — Sistema de créditos ✅ COMPLETO (14/09/2026)

Pivot de modelo de negocio: reemplaza la suscripción mensual de Mercado Pago por un pozo de
créditos compartido por pareja, gastado solo en generación con IA. El catálogo estático (rituales,
los 6 juegos, picante, historial) es gratis para siempre — ver `docs/DECISIONES.md`.

### Esquema y backend
- [x] `user_credits` (saldo individual pre-vinculación) y `couple_credits` (pozo compartido), con
      `credit_transactions` como ledger inmutable de auditoría (migración `055`)
- [x] `credit_packages` / `credit_purchases` para el cobro por pago único (migración `055`, nullable
      en `couple_id` desde la `063` para soportar compra en modo solo)
- [x] 50 créditos de bienvenida al registrarse, sumado a `handle_new_user()` (migración `056`)
- [x] Bono de 150 créditos fijos al vincular pareja, con chequeo de riesgo por `device_fingerprints`
      (`grant_pairing_bonus`, enganchado en `join_couple_by_invite`, migración `056`)
- [x] `consume_credits()`: RPC único de descuento, resuelve solo/pareja por `auth.uid()`, con
      `SELECT ... FOR UPDATE` (control de concurrencia) e idempotencia por `idempotency_key` (migración `057`)
- [x] `refund_credits()`, `grant_daily_streak_credits()` (1-2 créditos no acumulables, expiran a las
      24h, enganchado en `updateStreakAction`), `grant_purchase_credits()` (solo `service_role`)
- [x] `lib/ai/provider.ts` + `lib/ai/providers/{groq,together}.ts`: capa de proveedor intercambiable,
      hoy en Groq, lista para saltar a Together AI (modelos sin censura) con una env var
- [x] `lib/ai/context.ts` (`buildContextTags`): arma el contexto como tags cortas entre corchetes en
      vez de párrafos, para minimizar tokens de entrada
- [x] `lib/credits.ts`: tarifario (`ritual_simple` 5cr, `ritual_profundo` 10cr, `dinamica_ia` 15cr)
- [x] `app/actions/credits.ts`: balance, consumo, refund, checkout, listado de paquetes

### UI
- [x] `CreditsBadge` + `useCredits`: pozo en tiempo real vía Realtime (pareja) o refetch por evento
      `notifyCreditsChanged` (solo, sin Realtime posible) -- probado en vivo en navegador
- [x] `/ritual-ia`: selector de tier + chips de contexto (ánimo/tiempo/objetivo) + resultado --
      probado end-to-end con Groq real, los 3 tiers. `maxTokens` en 450 (no 260) tras confirmar contra
      la API real que Groq devuelve `json_validate_failed` con menos -- el razonamiento se come el budget
- [x] Entrada "Ritual con IA" en el hub `/juegos`
- [x] `/precios`: paquetes reales desde `credit_packages`, botón "Comprar" funcional (Checkout Pro)

### Pago único de créditos (reemplaza la suscripción recurrente)
- [x] `create-credit-checkout` (edge function nueva): Checkout Pro de MP, crea `credit_purchases` en
      `pending` y devuelve `init_point`. Soporta compra en modo solo o pareja
- [x] `mp-webhook`: rama nueva `type === 'payment'` que confirma contra la API de MP y llama
      `grant_purchase_credits`; la rama vieja `subscription_preapproval` queda intacta (no había
      necesidad de tocarla, ver cutover más abajo)
- [x] Ambas functions desplegadas a producción y probadas con requests reales (sin completar un pago
      real): `create-credit-checkout` sin auth devuelve `missing_auth`, `mp-webhook` con un payment id
      inexistente responde `ok:true` sin crashear
- No se tocó `create-mp-subscription`: queda desplegada pero inalcanzable desde la UI

### Anti-farmeo con fingerprint de dispositivo
- [x] `lib/deviceFingerprint.ts` (UUID persistente en `localStorage`) + RPC `record_device_fingerprint`
      (migración `065`), llamado en `/onboarding` y `/unirse/[code]` -- los dos puntos por los que pasa
      cualquiera antes de vincularse. `grant_pairing_bonus` ya consultaba esta tabla desde el
      principio pero nunca tenía datos -- ahora el anti-farmeo funciona de verdad

### Cutover: sin suscriptores reales que migrar
- [x] Antes de cancelar nada, se investigaron las 3 filas `subscriptions.status='active'` en
      producción: ninguna tenía `mp_subscription_id` ni `current_period_end` (el webhook siempre
      completa esos campos con un preapproval real autorizado) -- confirmando que eran filas de
      prueba/desarrollo, no clientes pagando. Se marcaron `canceled` (migración `064`). No hizo falta
      llamar a la API de MP ni compensar a nadie con créditos de cortesía

### Decisiones de diseño tomadas
- Reemplazo **total** de la suscripción Premium — no conviven los dos modelos
- Pool de vinculación: **150 fijo siempre**, no una transferencia variable del saldo individual
  restante — prioriza que el número sea predecible y comunicable en marketing
- Sin gating técnico de features de IA por estado de vinculación: Ritual Profundo y Dinámica de
  compatibilidad son llamables en solitario, la escasez de créditos (50 vs. 150 tras vincular) ya
  empuja a vincular pareja sin necesidad de bloquear nada por código
- Anti-farmeo: fingerprint + reglas server-side, sin verificación por SMS (fricción excesiva para
  una app de uso ocasional)
- Se mantiene Groq como proveedor (ya integrado, gratis en su tier actual) con miras a migrar a
  Together AI cuando se necesiten modelos sin las restricciones de contenido de Groq

### Retiro del gating de suscripción vieja (completo, catálogo estático 100% gratis)
- [x] `lib/plans.ts`, `app/actions/subscription.ts`, `app/actions/picante-trial.ts`,
      `components/PicanteUpsell.tsx` — borrados enteros, sin código muerto
- [x] Los 6 juegos: picante ya no se corta tras el primer uso, sin `isPremium`/`picanteUsado`/upsell
- [x] Historial sin límite de 30 — se reescribió también el RPC `get_historial_page_data`
      (migración `061`), el límite no vivía solo en el cliente
- [x] `app/LandingPage.tsx`, `/perfil`, `/terminos`, `/privacidad`: copy actualizada (incluye mención
      a Groq como procesador de datos para la IA, que antes faltaba)
- ~~Deliberadamente NO tocado: `get_ritual_page_data` sigue seleccionando `WHERE premium = false`~~
  RESUELTO el 15/09 — ver "rituals.premium: split gratis/créditos" en Sprint 4 más arriba.
- ~~`get_perfil_page_data()` todavía calcula un campo `isPremium`~~ RESUELTO el 14/09 junto con el
  retiro completo de `subscriptions` — ver `docs/DEUDA-TECNICA.md`.

### Bugs reales encontrados y corregidos en el camino (no solo leídos — probados)
- **RLS recursivo preexistente, no relacionado a Sprint 5**: `couple_members_select` (migración 006)
  causaba recursión infinita (`42P17`) en el Postgres de la Supabase CLI local, rompiendo cualquier
  login/navegación en local. Arreglado en `060` (función `SECURITY DEFINER` `my_couple_id()`). Sin
  evidencia de que afecte al proyecto remoto (versión de Postgres distinta), pero era un bug real y
  latente ahí también.
- **`grant_pairing_bonus` expuesta como RPC pública sin autorización** (introducido en la propia
  `056`): cualquier autenticado podía llamarla directo con IDs ajenos y poner en cero el saldo de
  cualquier cuenta. Encontrado por `mcp__supabase__get_advisors` corrido en producción después de
  aplicar las migraciones -- corregido en minutos con `062` (mismo `REVOKE EXECUTE` que ya tenía
  `grant_purchase_credits`).
- **`grant_pairing_bonus` rompía la vinculación entera en el caso de riesgo detectado**: con
  `v_amount = 0`, el `INSERT` a `credit_transactions` violaba `CHECK(amount <> 0)` (migración 055) --
  la excepción se propagaba y hacía fallar `join_couple_by_invite` completo, no solo el bono.
  Encontrado por el primer test que de verdad ejercitó ese camino (`tests/sql/device-fingerprint.test.ts`,
  escrito recién al construir el anti-farmeo). Corregido en `066` (no loguear en el ledger si el monto
  es 0; el guard de "ya otorgado" se movió a chequear `couple_credits`, que sí se crea siempre).
  Estuvo mal en producción una ventana corta dentro de esta misma sesión -- sin usuarios reales en
  ese lapso, impacto real nulo.

### ~~Hallazgo: infraestructura huérfana en producción~~ RESUELTO (2026-09-14)
Se confirmó que no había tabla `gifts` (nunca se creó, o ya no existía) y se borraron las 3 edge
functions de regalos (`get-gift-status`, `claim-gift`, `create-mp-gift`) de producción. De paso se hizo
una barrida más amplia de todo lo detectado como sin uso: ver "Retiro de infraestructura huérfana" en
`docs/DEUDA-TECNICA.md` para el detalle completo (edge functions legacy, tablas sin referencias,
simplificación de `mp-webhook`).

### Pendiente
- [x] Onboarding: opción "vincular ahora, en este mismo teléfono" (14/09) -- botón + confirmación
      de dos pasos (`components/VincularAhoraMismoTelefono.tsx`) en las 3 pantallas donde se puede
      estar esperando a la pareja (`/onboarding` paso 3, y las dos pantallas de espera de `/ritual`:
      recién creada la pareja, y al volver otro día sin que nadie se haya unido todavía). Sin backend
      nuevo: reusa `crearPareja`/`signOut`/el `redirect` que `/auth` y `/unirse/[code]` ya soportaban.
      Probado end-to-end en producción con 2 cuentas reales (creadas y borradas en la misma sesión):
      signOut → `/auth?redirect=/unirse/CODE&tab=registro` → registro → confirmar email → login →
      join automático → reveal compartido. Bono de 150 créditos se otorga normal (`risk_flagged: false`),
      confirmado por SQL -- el anti-farmeo de la 056 solo dispara en el *segundo* uso del mismo
      dispositivo, no en el primer vínculo real.
- [x] `get-gift-status`/`claim-gift`/`create-mp-gift`/`gifts` — borradas (ver "Retiro de infraestructura huérfana" en `docs/DEUDA-TECNICA.md`)

---

## Backlog sin sprint asignado

- [x] Landing pública en Next.js — ya existe (`app/LandingPage.tsx`, servida desde `/` para
      visitantes sin sesión vía `AuthHashRedirect`), esta nota estaba desactualizada
- [x] Recuperación de contraseña / OAuth — ambos ya existen (`/auth`: recovery + "Continuar con
      Google" vía `signInWithOAuth`), esta nota estaba desactualizada
- [x] Cambiar el ritual del día (15/09/2026) — `cambiar_ritual_del_dia()` (migración `070`), botón
      "¿No les gustó? Pedir otro ritual" en `/ritual`. Solo mientras nadie respondió todavía (cambiar
      después dejaría una respuesta ya dada apuntando a otra pregunta) y máximo 1 vez por semana por
      pareja (`couples.ritual_changed_at`). Ritual nuevo elegido al azar (no determinístico como el
      del día, acá el pedido es explícitamente "otra cosa") entre los elegibles para la pareja.
- [x] Modo offline (versión simple, 15/09/2026) — `public/sw.js` ahora cachea el shell: HTML de
      navegación (red primero, cache como respaldo) y assets estáticos de `_next/static` (cache
      primero, son inmutables por el hash en el nombre). Se registra siempre desde
      `components/ServiceWorkerRegister.tsx` (antes solo se registraba al activar notificaciones
      push). `/ritual` guarda el último contexto/sesión/racha cargado con éxito en `localStorage`
      (`lib/offlineCache.ts`) y, si el Server Action de carga falla por falta de conexión (no por
      "no autenticado", son casos distintos), muestra ese último ritual en **solo lectura** con un
      aviso "Sin conexión" — sin poder responder ni cambiar de ritual, eso sigue requiriendo red.
      Probado de verdad: build de producción, apagar el server y recargar — la landing cargó
      completa desde cache sin backend disponible. No implementado: cola de escrituras offline
      (responder sin conexión y sincronizar después) ni offline para el resto de las páginas
      (`/juegos`, `/historial`) — alcance explícitamente acotado a "ver tu ritual de hoy sin señal".
- [x] Invitar a un amigo / referido (15/09/2026) — sistema separado del invite de pareja
      (`couples.invite_code`): cada usuario tiene su propio `profiles.referral_code` (6
      caracteres, mismo patrón), compartible como `/auth?tab=registro&ref=CODE`. El referente
      gana 30 créditos cuando el referido **realmente arranca** (queda emparejado con su propia
      pareja vía `join_couple_by_invite`), no por el solo registro — evita regalar créditos por un
      email vacío que nunca vuelve. Anti-farmeo reutiliza `device_fingerprints` (mismo patrón que
      `grant_pairing_bonus`). Tarjeta "Invitá a un amigo" en `/perfil`
      (`app/actions/referrals.ts`, migración `071`). Funciona también con Google (15/09/2026,
      migración `072`): el código viaja como `?ref=` en la URL de vuelta del callback OAuth (Google
      no deja inyectar `raw_user_meta_data` como sí hace `signUp()`) y se linkea ahí con
      `link_referral_for_new_oauth_user()` -- SECURITY DEFINER para poder leer
      `auth.users.created_at` y confirmar que la cuenta se acaba de crear (ventana de 5 minutos),
      así una cuenta ya existente no puede activar el bono de un amigo clickeando su link meses
      después.
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
  intensidad.ts            ← Filtro por techo de intensidad elegido por juego (chips, no persistido)
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
