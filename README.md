# Ritual — Momentos que acercan

Web de experiencias en pareja para conectar (preguntas, retos, elección mutua). MVP orientado a San Valentín y suscripción barata.

## Estructura del proyecto

```
Parejas Juego/
├── index.html          # Landing: hero, beneficios, cómo funciona, qué incluye, CTA
├── auth.html           # Login / registro (email + contraseña)
├── precios.html        # Precios: prueba gratis, suscripción (Mercado Pago)
├── juego-conexion.html # Experiencia 1: preguntas íntimas (suave / profundo / vulnerable)
├── juego-picante.html  # Experiencia 2: retos sugerentes por niveles
├── juego-eleccion.html # Experiencia 3: elección mutua → premio si coinciden
├── css/
│   └── styles.css      # Estilos base (tipografía, transiciones)
├── js/
│   ├── app.js            # Lógica compartida (menú móvil, paywall)
│   ├── auth.js           # Auth Supabase (signIn, signUp, signOut, updateNavAuth)
│   ├── auth-page.js      # Lógica de auth.html (tabs, formularios)
│   ├── datos-juegos.js   # Preguntas y retos de los 3 juegos
│   ├── game-gate.js      # Comprueba acceso (Edge Function check-game-access)
│   ├── index.js          # Lógica de index.html (logout en nav)
│   ├── precios.js        # Lógica de precios.html (paywall, Mercado Pago, logout)
│   ├── juego-conexion.js # Lógica de juego Conexión profunda
│   ├── juego-picante.js  # Lógica de juego Picante progresivo
│   ├── juego-eleccion.js # Lógica de juego Elección mutua
│   └── supabase-config.js # URL + anon key de Supabase
├── docs/               # Documentación
│   ├── SUPABASE-SETUP.md     # Configurar Supabase (URL, key, auth, Edge Functions)
│   ├── SUPABASE-TABLAS-RLS.md # Tablas, RLS y migraciones
│   ├── TODO-FASE-2.md        # Próximos pasos (Stripe, legal, UX)
│   ├── MERCADOPAGO-SETUP.md  # Mercado Pago: credenciales, webhook
│   ├── DEPLOY-VERCEL.md      # Despliegue en Vercel
│   ├── GIT-GITHUB.md         # Git y GitHub
│   └── DECISIONES-PREGUNTAS.md
├── supabase/
│   ├── migrations/     # SQL: tablas, RLS, trial, Mercado Pago
│   └── functions/     # Edge Functions: check-game-access, create-mp-subscription, mp-webhook
├── vercel.json
└── README.md
```

## Cómo probar el MVP

1. Abrí `index.html` en el navegador (doble clic o servidor local).
2. Para desarrollo con recarga: `npx serve .` o `python -m http.server 8080` en la raíz del proyecto.
3. Navegá: Landing → Precios → En “Qué incluye” entrá a cada juego.

## Stack

- **HTML + JS** (vanilla).
- **Tailwind CSS** (CDN): tema oscuro, vino/nude/ink, Cormorant Garamond + Outfit.
- **Supabase**: auth, BD, Edge Functions. Config en `js/supabase-config.js`. Ver **docs/SUPABASE-SETUP.md**.

## Documentación

- **Setup Supabase:** docs/SUPABASE-SETUP.md  
- **Tablas y RLS:** docs/SUPABASE-TABLAS-RLS.md  
- **Mercado Pago:** docs/MERCADOPAGO-SETUP.md  
- **Deploy Vercel:** docs/DEPLOY-VERCEL.md  
- **Próximos pasos:** docs/TODO-FASE-2.md  