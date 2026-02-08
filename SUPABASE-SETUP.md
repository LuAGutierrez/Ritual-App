# Cómo configurar Supabase para Ritual

## 1. Registrarte en Supabase

1. Entrá a **https://supabase.com**
2. Clic en **Start your project**
3. Iniciá sesión con **GitHub**, **Google** o **email** (te envían un link para confirmar)
4. Aceptá los términos si te los piden

## 2. Crear un proyecto

1. En el dashboard, clic en **New Project**
2. Elegí o creá una **Organization** (podés usar la que viene por defecto)
3. Completá:
   - **Name**: por ejemplo `ritual` o `parejas-juego`
   - **Database Password**: anotala en un lugar seguro (la vas a necesitar para ver la base de datos)
   - **Region**: la más cercana a tu público (ej. South America si es para LATAM)
4. Clic en **Create new project** y esperá 1–2 minutos a que se cree

## 3. Copiar URL y Anon Key
  
1. En el menú izquierdo, entrá a **Project Settings** (icono de engranaje)
2. En la pestaña **API** vas a ver:
   - **Project URL** → esa es tu `SUPABASE_URL` (ej. `https://abcdefghijk.supabase.co`)
   - **Project API keys** → la que dice **anon** **public** es tu `SUPABASE_ANON_KEY` (empieza tipo `eyJhbGc...` y es larga)
3. Clic en el ícono de copiar al lado de cada una y guardalas

## 4. Pegar en el proyecto

Abrí **js/supabase-config.js** y reemplazá:

```js
var SUPABASE_URL = '';  // pegá acá la Project URL
var SUPABASE_ANON_KEY = ''; // pegá acá la anon public key
```

por tus valores, por ejemplo:

```js
var SUPABASE_URL = 'https://abcdefghijk.supabase.co';
var SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...';
```

**Importante:** La **anon key** es pública (va en el front). No subas nunca la **service_role key** al código del navegador; esa es solo para backend o scripts seguros.

## 5. Incluir el script en las páginas (cuando uses Supabase)

Cuando quieras usar la base de datos, cargá el cliente en tu HTML (antes de tus scripts):

```html
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
<script src="js/supabase-config.js"></script>
<script>
  if (window.RitualSupabase && window.RitualSupabase.enabled) {
    window.supabase = supabase.createClient(
      window.RitualSupabase.url,
      window.RitualSupabase.anonKey
    );
  }
</script>
```

Así solo se crea el cliente si configuraste URL y key.

---

**Resumen:** Registro en supabase.com → New Project → Project Settings → API → copiás URL y anon key → las pegás en `js/supabase-config.js`.

---

## Auth con email y contraseña

La app usa **email + contraseña** (no magic link). Para que funcione:

1. En el dashboard de Supabase: **Authentication** → **Providers** → **Email**.
2. Dejá **Email** habilitado.
3. (Opcional para MVP) Si querés que al crear cuenta el usuario entre sin confirmar por email: desactivá **Confirm email**. Si lo dejás activado, el usuario debe hacer clic en el link que le llega al correo antes de poder entrar.

---

## Edge Function: acceso a juegos (no bypasseable)

La decisión de si un usuario puede jugar (suscripción activa o prueba gratuita) se toma **solo en el servidor** con la Edge Function `check-game-access`. Así no se puede saltar el paywall desde el cliente.

**Desplegar la función:**

1. **CLI en el proyecto:** ya está como dependencia (`npm install supabase --save-dev`). Usá `npx supabase` en la raíz del proyecto.
2. **Login (una vez):** `npx supabase login` — se abre el navegador para autorizar.
3. **Vincular proyecto:** `npx supabase link --project-ref TU_REF` (el ref está en la URL del proyecto en el dashboard, ej. `recuvrrkejnuftdfzbyr`).
4. **Desplegar:** `npx supabase functions deploy check-game-access`.
5. La función usa las variables de entorno que Supabase inyecta (`SUPABASE_URL`, `SUPABASE_ANON_KEY`); no hace falta configurar nada más.

Si la función no está desplegada, las páginas de juego mostrarán el paywall. **Desarrollo local:** en `http://localhost:...` o `http://127.0.0.1:...` el gate se bypasea (entrás sin login ni Edge Function); en producción no aplica.

---

## Mercado Pago (suscripción mensual)

Para cobrar con Mercado Pago: Edge Functions **create-mp-subscription** (crear suscripción y devolver link de pago) y **mp-webhook** (recibir notificaciones y actualizar `subscriptions`). Credenciales, webhook y pasos en **`docs/MERCADOPAGO-SETUP.md`**.
