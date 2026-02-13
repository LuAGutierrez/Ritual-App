# Cómo revisar bien Supabase (mismo proyecto que la app)

Si cerraste sesión, entrás de nuevo con tu correo y te crea token, pero en el dashboard no ves usuarios ni datos, **la app está hablando con otro proyecto** (o con credenciales distintas) que el que tenés abierto. Esto es cómo verificarlo y revisar todo.

---

## 1. Qué proyecto usa la app DESPLEGADA

La app en **rituales.vercel.app** puede estar usando credenciales que no son las del repo (por ejemplo variables de entorno en Vercel en el build). Tenés que ver qué URL usa la versión en vivo.

### Opción A — Ver el JavaScript en vivo

1. Entrá a **https://rituales.vercel.app**
2. **Ctrl+U** (ver código fuente) o F12 → pestaña **Sources** / **Red**
3. Buscá el script de config: en **Sources**, abrí algo como `js/supabase-config.js` (o el nombre que tenga), o en **Network** recargá y abrí ese archivo.
4. Buscá la URL de Supabase, por ejemplo: `https://XXXXXXXX.supabase.co`
5. Anotá el **ref** del proyecto: la parte `XXXXXXXX` (ej. `recuvrrkejnuftdfzbyr`).

Esa es la URL (y el proyecto) que usa la app en producción.

### Opción B — Decodificar el token (estando logueado)

1. En **rituales.vercel.app** iniciá sesión.
2. F12 → **Application** → **Local Storage** → `https://rituales.vercel.app`
3. Buscá una clave tipo `sb-XXXXXXXX-auth-token` o que contenga "supabase" / "auth". Abrila y copiá el **access_token** (el string largo que empieza con `eyJ...`).
4. Entrá a **https://jwt.io** y pegá ese token en "Encoded".
5. En **Payload** buscá algo como:
   - `ref`: es el id del proyecto (ej. `recuvrrkejnuftdfzbyr`)
   - o `iss` / `aud` que contenga el ref del proyecto.

Ese **ref** es el proyecto donde Supabase creó tu sesión. Tiene que ser el mismo que ves en el dashboard.

---

## 2. Confirmar que el dashboard es ESE proyecto

1. Entrá a **https://supabase.com/dashboard**
2. En la lista de proyectos, abrí el que quieras revisar.
3. **Project Settings** (engranaje abajo a la izquierda) → pestaña **API**.
4. Ahí ves:
   - **Project URL**: tiene que ser exactamente `https://XXXXXXXX.supabase.co` donde `XXXXXXXX` es el mismo que viste en el paso 1 (en el JS desplegado o en el JWT).
   - **Project API keys** → la clave **anon public** es la que usa el front.

Si la **Project URL** no coincide con la que usa la app, estás mirando **otro proyecto**. Abrí el proyecto cuya URL sea la que aparece en rituales.vercel.app (o en el JWT).

---

## 3. Dónde revisar todo en ESE proyecto

Una vez que confirmaste que es el mismo proyecto:

| Dónde | Qué revisar |
|-------|-------------|
| **Authentication** → **Users** | Usuarios que se registraron / iniciaron sesión. Si la app crea token al ingresar, después de un login exitoso tiene que aparecer (o actualizarse) un user con ese email. |
| **Authentication** → **Providers** → **Email** | Que "Email" esté habilitado. Si querés exigir confirmación de correo, "Confirm email" debe estar ON. |
| **Table Editor** | Tablas que use la app: `profiles`, `subscriptions`, etc. Revisá que existan y que tengan filas si ya hubo registro/uso. |
| **Database** → **Roles** | No hace falta tocar nada si no cambiaste permisos. |
| **Edge Functions** | Si usás `check-game-access`, que esté desplegada en este mismo proyecto. |

Si en **Authentication → Users** no aparece nadie después de un login exitoso en la app, entonces la app **no** está usando este proyecto (porque el login sí crea/usar usuario en el proyecto al que apunta la URL/anon key).

---

## 4. Si la app desplegada usa otra URL que tu repo

- En el **repo** tenés en `js/supabase-config.js` algo como:
  - `https://recuvrrkejnuftdfzbyr.supabase.co`
- En **rituales.vercel.app** (paso 1) viste otra URL (otro `XXXXXXXX`).

Entonces en **Vercel** algo está cambiando la config en el build:

1. Vercel → proyecto rituales → **Settings** → **Environment Variables**.
2. Si hay `SUPABASE_URL`, `SUPABASE_ANON_KEY` (o parecidos), revisá qué valores tienen. Esos son los que podría estar usando el build.
3. Si querés que use el mismo proyecto que el repo, o bien:
   - Borrá esas variables y que el build use solo lo que está en `supabase-config.js`, o
   - Poné en Vercel la misma **Project URL** y **anon public** que en el dashboard del proyecto que querés usar.

Si no tenés variables de Supabase en Vercel, el build suele servir los JS tal cual; en ese caso la URL en el repo y la que ves en "View Source" / JS en rituales.vercel.app deberían ser la misma.

---

## 5. Resumen rápido

1. Ver **qué URL/ref** usa la app en **rituales.vercel.app** (JS en vivo o JWT).
2. En Supabase, abrir **solo** el proyecto cuya **Project URL** sea esa.
3. En ese proyecto: **Authentication → Users** y **Table Editor** para ver usuarios y tablas.
4. Si no coinciden, corregir **Vercel** (env) o el proyecto que tenés abierto en el dashboard.

Así revisás bien todo Supabase y te asegurás de que estás mirando el mismo proyecto con el que se loguea la app.
