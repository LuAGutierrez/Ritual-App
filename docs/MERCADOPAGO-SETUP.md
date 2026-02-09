# Mercado Pago — Ritual

Integración de suscripción mensual con Mercado Pago: el usuario paga en MP y el webhook actualiza la tabla `subscriptions` para dar acceso a los juegos.

---

## 1. Cuenta y aplicación en Mercado Pago

1. Creá una [cuenta de vendedor](https://www.mercadopago.com.ar/hub/registration/landing) en Mercado Pago.
2. Entrá a [Tus integraciones](https://www.mercadopago.com.ar/developers/panel/app) y creá una aplicación (o usá una existente).
3. En **Credenciales** copiá el **Access Token** (producción para cobrar de verdad; pruebas para testear).

---

## 2. Secrets en Supabase

En el proyecto de Supabase: **Project Settings → Edge Functions → Secrets**. Añadí:

| Secret | Descripción |
|--------|-------------|
| `MP_ACCESS_TOKEN` | Access Token de Mercado Pago (producción o prueba). |
| `MP_BACK_URL` | URL a la que MP redirige tras el pago. Ej: `https://tudominio.com/precios.html` (se añade `?mp=success` si no tiene query). |
| `MP_AMOUNT` | (Opcional) Monto por mes. Default `2.99`. |
| `MP_CURRENCY_ID` | (Opcional) Moneda: `ARS`, `BRL`, `MXN`, `CLP`, `COP`, `PEN`, `UYU`. Default `ARS`. |

---

## 3. Desplegar Edge Functions

En la raíz del proyecto:

```bash
npx supabase login
npx supabase link --project-ref TU_REF
npx supabase functions deploy create-mp-subscription
npx supabase functions deploy mp-webhook
```

---

## 4. Webhook en Mercado Pago

La URL del webhook tiene que ser **pública** (Supabase te da una URL por función).

1. URL del webhook:  
   `https://TU_REF.supabase.co/functions/v1/mp-webhook`
2. En [Tus integraciones](https://www.mercadopago.com.ar/developers/panel/app) → tu app → **Webhooks** → **Configurar notificaciones**.
3. **URL de producción:** pegá la URL de arriba.
4. Eventos: activá **Planes y suscripciones** (o al menos `subscription_preapproval` y, si querés, `subscription_authorized_payment`).
5. Guardá. Opcional: usá la clave secreta para [validar la firma](https://www.mercadopago.com.ar/developers/es/docs/your-integrations/notifications/webhooks) de las notificaciones (en Ritual por ahora no se valida).

**Importante:** Para Suscripciones, en algunos países MP pide configurar la URL de notificación **al crear el pago**. Si en tu panel no ves “Planes y suscripciones”, en la creación del preapproval podés enviar `notification_url` (revisá la [referencia de la API](https://www.mercadopago.com.ar/developers/es/reference/subscriptions/_preapproval/post)).

---

## 5. Migración en la base de datos

Ejecutá en Supabase → SQL Editor el contenido de:

`supabase/migrations/003_mercadopago_subscription.sql`

(añade la columna `mp_subscription_id` a `subscriptions`).

---

## 6. Flujo resumido

1. Usuario en **precios** hace clic en **Suscribirme** (debe estar logueado).
2. El front llama a la Edge Function **create-mp-subscription** (con JWT).
3. La función crea un preapproval en MP (suscripción pendiente) y devuelve `init_point`.
4. El front redirige al usuario a `init_point` (checkout de Mercado Pago).
5. El usuario paga en MP; MP redirige a `MP_BACK_URL` (ej. precios.html?mp=success).
6. MP envía un POST al **mp-webhook** con el id de la suscripción.
7. La función **mp-webhook** consulta el preapproval en MP; si `status === "authorized"`, hace upsert en `subscriptions` (user_id desde `external_reference`, status `active`, `mp_subscription_id`).
8. **check-game-access** ya considera cualquier fila en `subscriptions` con status `active` o `trialing`, así que el usuario pasa a tener acceso a los juegos.

---

## Moneda y montos

Mercado Pago no soporta EUR. Usá una de las monedas soportadas (ARS, BRL, MXN, etc.) y configurá `MP_AMOUNT` y `MP_CURRENCY_ID` en los secrets según tu precio (ej. ARS 500, MXN 59, etc.).

---

## Checklist — ¿Qué falta? (sitio en rituales.vercel.app)

Cuando ya tenés la página en **rituales.vercel.app** y el webhook de MP configurado, revisá esto:

| Revisión | Dónde | Qué verificar |
|----------|--------|----------------|
| **MP_BACK_URL** | Supabase → Project Settings → Edge Functions → Secrets | Debe ser exactamente `https://rituales.vercel.app/precios.html` para que, al volver de Mercado Pago, el usuario llegue a tu sitio. |
| **MP_ACCESS_TOKEN** | Mismo lugar | Access Token de Mercado Pago (producción para cobrar de verdad). |
| **Edge Functions desplegadas** | Supabase Dashboard o `npx supabase functions list` | Las tres: `check-game-access`, `create-mp-subscription`, `mp-webhook`. |
| **Migración 003** | Supabase → SQL Editor | Ejecutaste `003_mercadopago_subscription.sql` (columna `mp_subscription_id` en `subscriptions`). |
| **URL del webhook en MP** | Mercado Pago → Tus integraciones → Webhooks | Debe apuntar a **Supabase**, no a Vercel: `https://recuvrrkejnuftdfzbyr.supabase.co/functions/v1/mp-webhook`. Eventos: Planes y suscripciones. |
| **Prueba de punta a punta** | rituales.vercel.app | Entrá a precios → Iniciar sesión → Suscribirme → deberías ir a MP; tras pagar (o en prueba), volvés a precios y el usuario debería tener acceso a los juegos. |
