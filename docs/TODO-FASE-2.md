# Ritual — TODO Fase 2

Lista clara para la siguiente fase después del MVP.

---

## Monetización y acceso real

- [ ] Integrar **Stripe** (Checkout o Payment Element) para:
  - Prueba gratuita (si aplica)
  - Suscripción mensual recurrente
  - Regalo (pago único + enlace de activación)
- [ ] Poner `Ritual.bypassPaywall = false` y conectar el paywall a suscripción activa en BD.
- [ ] Guardar en Supabase: `subscriptions` (user_id, plan, stripe_subscription_id, status, ends_at).

---

## Autenticación y usuarios

- [ ] Login simple: email + magic link (Supabase Auth) o email + contraseña.
- [ ] No obligar registro para "probar gratis" si el flujo de marketing lo permite; sí para suscripción.
- [ ] Tabla `users` o uso de `auth.users` + perfil en `profiles` (nombre, preferencias opcionales).

---

## Supabase

- [ ] Rellenar `js/supabase-config.js` con URL y anon key del proyecto.
- [ ] Crear tablas y RLS: ver **SUPABASE-TABLAS-RLS.md** y ejecutar el SQL en `supabase/migrations/001_tablas_y_rls.sql` (SQL Editor de Supabase).
  - Tablas: `profiles`, `subscriptions`, opcional `game_progress`.
  - RLS ya incluido en el script para que cada usuario solo vea/edite sus datos.

---

## Producto y contenido

- [ ] Añadir más preguntas/retos por nivel (conexión, picante, elección) desde BD o JSON.
- [ ] Panel interno (o script) para editar contenido sin tocar código.
- [x] "Regalar esta experiencia": flujo de pago (MP Checkout Pro) + enlace para activar (tabla gifts, create-mp-gift, claim-gift, activar.html).

---

## Legal y copy

- [ ] Página de **Términos y condiciones** y **Política de privacidad**.
- [ ] Checkbox de aceptación y edad (18+) en registro o antes del pago.
- [ ] Ajustar copy de precios cuando el precio final esté definido (ej. 2,99 €/mes).

---

## UX y técnico

- [ ] Página "Mis experiencias" o dashboard simple tras login (acceso a los 3 juegos).
- [ ] Recordar último nivel/juego para volver donde lo dejaron.
- [ ] Favicon y meta OG para compartir.
- [ ] Despliegue (Vercel, Netlify o similar) con dominio propio.

---

## No prioritario para MVP fase 2

- App móvil nativa.
- Notificaciones push.
- Múltiples idiomas (mantener español neutro de momento).