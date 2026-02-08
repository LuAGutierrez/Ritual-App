# Desplegar Ritual en Vercel

El sitio es estático (HTML, JS, CSS). Las Edge Functions corren en Supabase, no en Vercel.

---

## Opción 1: Conectar repo con Vercel (recomendado)

1. Subí el proyecto a **GitHub** (o GitLab / Bitbucket) si aún no está.
2. Entrá a [vercel.com](https://vercel.com) e iniciá sesión.
3. **Add New** → **Project** → importá el repo.
4. **Framework Preset:** Other (o dejá que lo detecte).
5. **Build Command:** dejá vacío.
6. **Output Directory:** `.` (raíz).
7. **Install Command:** podés dejarlo vacío; si Vercel instala dependencias no pasa nada, no se usan en el build.
8. Clic en **Deploy**.

Cada push a la rama principal desplegará automáticamente.

---

## Opción 2: CLI (primera vez o sin Git)

1. En la carpeta del proyecto:
   ```bash
   npx vercel
   ```
2. Si es la primera vez, te pedirá login (se abre el navegador) y que confirmes el proyecto.
3. Respondé las preguntas: nombre del proyecto, carpeta (.), etc.
4. Para **producción**:
   ```bash
   npx vercel --prod
   ```

---

## Después del deploy

- La URL será algo como `https://tu-proyecto.vercel.app`.
- **Mercado Pago:** En Supabase Secrets, configurá `MP_BACK_URL` con esa URL, por ejemplo:  
  `https://tu-proyecto.vercel.app/precios.html`
- **Dominio propio:** En el dashboard de Vercel → Project → Settings → Domains podés añadir tu dominio.

No hace falta configurar variables de entorno en Vercel para que el sitio funcione: la URL y la anon key de Supabase están en `js/supabase-config.js`. Si más adelante querés usar env vars (por ejemplo para no commitear la key), habría que añadir un paso de build que genere ese archivo.
