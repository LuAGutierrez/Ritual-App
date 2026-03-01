# Mejoras Fase B — UX y robustez

## Resumen

- **Supabase no configurado:** En `auth.html` y `precios.html` se muestra un mensaje y se ocultan o deshabilitan los controles de login/suscripción cuando `RitualSupabase` no está habilitado.
- **Volver:** En las páginas de juego y en elegir-juego, el botón "Volver" usa `history.back()` solo si el referrer es del mismo origen; si no, redirige a `elegir-juego.html` (juegos) o `index.html` (elegir-juego).
- **Doble clic en Suscribirme:** El botón se deshabilita al inicio del click; se quitaron los `console.log` de precios.
- **Juegos sin datos:** Si falta `RitualDatos` o el bloque del juego, se muestra "No hay contenido disponible" con enlace a elegir experiencias y se oculta el selector/pasos.

## Archivos tocados

- `auth.html`, `auth-page.js` — mensaje y ocultar formularios cuando no hay config.
- `precios.html`, `precios.js` — mensaje, deshabilitar Prueba/Suscribirme, doble clic y logs.
- `juego-conexion.html`, `juego-picante.html`, `juego-eleccion.html`, `elegir-juego.html` — script de Volver con fallback.
- Los tres HTML de juego — bloque `#sin-datos`; los tres JS de juego — mostrar fallback y ocultar UI cuando no hay datos.
