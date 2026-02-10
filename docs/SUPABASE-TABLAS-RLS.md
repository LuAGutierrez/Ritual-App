# Cómo crear las tablas y RLS en Supabase

Pasos para hacer lo que indica TODO-FASE-2 (tablas `subscriptions`, opcional `profiles` y `game_progress`, y Row Level Security).

---

## 1. Dónde ejecutar el SQL

1. Entrá al **Dashboard** de Supabase → tu proyecto.
2. En el menú izquierdo: **SQL Editor**.
3. **New query**.
4. Copiá todo el contenido de **`supabase/migrations/001_tablas_y_rls.sql`** (o el bloque que quieras) y pegálo en el editor.
5. Clic en **Run** (o Ctrl+Enter).

Si no hay errores, las tablas y políticas quedan creadas.

---

## 2. Qué crea el script

### Tabla `profiles`

- **Uso:** Datos extra del usuario (nombre, etc.) ligados a `auth.users`.
- **Campos:** `id` ( = `auth.users.id`), `email`, `display_name`, `created_at`, `updated_at`, `trial_used` (boolean, default false; ver migración `002_trial_en_profiles.sql`).
- **Trigger:** Cuando se registra un usuario en Auth, se crea una fila en `profiles` con su `id` y `email`.
- **RLS:** Cada usuario solo puede **ver** y **actualizar** su propia fila (`auth.uid() = id`).
- **Nota:** La prueba gratuita de una vez se guarda en `profiles.trial_used`. Alternativa posible: una fila en `subscriptions` con `plan='trial'` y `status='trial_used'` (todo lo de acceso en una tabla).

### Tabla `subscriptions`

- **Uso:** Guardar suscripciones (Stripe o Mercado Pago): plan, estado, período.
- **Campos:**  
  - `user_id` → `auth.users(id)`  
  - `plan` ('monthly', 'gift', 'trial')  
  - `stripe_customer_id`, `stripe_subscription_id` (Stripe)  
  - `mp_subscription_id` (Mercado Pago; ver migración `003_mercadopago_subscription.sql`)  
  - `status` ('active', 'canceled', 'past_due', 'trialing')  
  - `current_period_start`, `current_period_end`  
  - `created_at`, `updated_at`
- **Constraint:** Una fila por usuario (`unique(user_id)`).
- **RLS:** Cada usuario solo puede **select**, **insert** y **update** donde `auth.uid() = user_id`.  
  Los webhooks (Stripe o Mercado Pago) que escriban en esta tabla deben usar la **service_role key** desde una Edge Function.

### Tabla `game_progress` (opcional)

- **Uso:** Guardar último nivel o pregunta por juego (para "seguir donde lo dejaron").
- **Campos:**  
  - `user_id`, `game_slug` ('conexion', 'picante', 'eleccion'), `level_slug`, `last_question_index`, `updated_at`
- **Constraint:** Una fila por usuario y juego (`unique(user_id, game_slug)`).
- **RLS:** Cada usuario solo puede **select**, **insert**, **update** y **delete** sus propias filas (`auth.uid() = user_id`).

---

## 3. Qué es RLS (Row Level Security)

- **RLS** hace que cada fila sea visible o editable solo si se cumple la **policy**.
- En estas políticas usamos `auth.uid()`: es el id del usuario logueado (de Supabase Auth). Si no hay sesión, `auth.uid()` es `null` y las políticas que exigen `auth.uid() = user_id` (o `= id`) no permiten acceso.
- Así, desde el front con la **anon key** un usuario solo ve/modifica **sus** suscripciones, **su** perfil y **su** progreso; no el de otros.

---

## 4. Cómo usarlo desde el front (ejemplo)

Después de login, para **leer la suscripción** del usuario actual:

```js
var { data, error } = await supabase
  .from('subscriptions')
  .select('*')
  .eq('user_id', session.user.id)
  .maybeSingle();
// data tendrá la fila si existe; si no, data === null
```

Para **guardar o actualizar** (cuando tengas Stripe):

```js
await supabase.from('subscriptions').upsert({
  user_id: session.user.id,
  plan: 'monthly',
  status: 'active',
  stripe_subscription_id: 'sub_xxx',
  current_period_end: '2025-03-08T00:00:00Z'
}, { onConflict: 'user_id' });
```

Para **progreso** (opcional):

```js
await supabase.from('game_progress').upsert({
  user_id: session.user.id,
  game_slug: 'conexion',
  level_slug: 'profundo',
  last_question_index: 3
}, { onConflict: 'user_id,game_slug' });
```

---

## 5. Si querés ejecutar por partes

- Solo perfiles: ejecutá el bloque desde `create table public.profiles` hasta el final de las políticas de `profiles`.
- Solo suscripciones: el bloque de `create table public.subscriptions` y sus políticas.
- Solo progreso: el bloque de `create table public.game_progress` y sus políticas.

Si ya creaste alguna tabla antes, podés comentar esa parte o usar `create table if not exists` y solo añadir las políticas que falten.

---

## Migraciones posteriores

- **`002_trial_en_profiles.sql`**: Añade en `profiles` la columna `trial_used` (boolean, default false) para registrar si el usuario ya usó la prueba gratuita. Ejecutala en SQL Editor después de `001_tablas_y_rls.sql`.

---

## Probar acceso a los juegos (sin Stripe)

Para que un usuario pueda entrar a los juegos, tiene que tener una fila en `subscriptions` con `status` = `'active'` o `'trialing'`. Para probar sin Stripe:

1. Registrate en la app y anotá tu **user id** (en Supabase → Authentication → Users → copiá el UUID del usuario).
2. En Table Editor → `subscriptions` → Insert row.
3. Completá: `user_id` = ese UUID, `plan` = `monthly`, `status` = `active`. Guardá.
4. Recargá un juego: deberías ver el contenido. Sin esa fila (o con otro status) verás el paywall "Suscribite para jugar".