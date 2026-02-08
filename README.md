# Ritual — Momentos que acercan

Web de experiencias en pareja para conectar (preguntas, retos, elección mutua). MVP orientado a San Valentín y suscripción barata.

## Estructura del proyecto

```
Parejas Juego/
├── index.html          # Landing: hero, beneficios, cómo funciona, qué incluye, CTA
├── precios.html        # Precios: prueba gratis, suscripción, regalo (paywall simulado)
├── juego-conexion.html # Experiencia 1: preguntas íntimas (suave / profundo / vulnerable)
├── juego-picante.html  # Experiencia 2: retos sugerentes por niveles
├── juego-eleccion.html # Experiencia 3: elección mutua → premio si coinciden
├── css/
│   └── styles.css      # Estilos base (tipografía, transiciones)
├── js/
│   ├── app.js            # Lógica compartida (menú móvil, paywall simulado)
│   ├── auth.js           # Auth Supabase (signIn, signUp, signOut, updateNavAuth)
│   ├── auth-page.js      # Lógica de auth.html (tabs, formularios)
│   ├── datos-juegos.js   # Preguntas y retos de los 3 juegos
│   ├── index.js          # Lógica de index.html (logout en nav)
│   ├── precios.js        # Lógica de precios.html (paywall buttons, logout)
│   ├── juego-conexion.js # Lógica de juego Conexión profunda
│   ├── juego-picante.js  # Lógica de juego Picante progresivo
│   ├── juego-eleccion.js # Lógica de juego Elección mutua
│   └── supabase-config.js # URL + anon key de Supabase
├── TODO-FASE-2.md      # Lista para siguiente fase (Stripe, auth, BD)
└── README.md
```

## Cómo probar el MVP

1. Abrí `index.html` en el navegador (doble clic o servidor local).
2. Para desarrollo con recarga: `npx serve .` o `python -m http.server 8080` en la raíz del proyecto.
3. Navegá: Landing → Precios → En “Qué incluye” entrá a cada juego.

## Stack

- **HTML + JS** (vanilla).
- **Tailwind CSS** (CDN): tema oscuro, vino/nude/ink, Cormorant Garamond + Outfit.
- **Supabase**: config en `js/supabase-config.js`; integrar cuando haya auth y BD.

## Próximos pasos

Ver **TODO-FASE-2.md** para: Stripe, login, Supabase real, legal, despliegue.
