# Documentación — Rituales

> App de rituales diarios para parejas. Next.js 14 + Supabase + Vercel.

## Archivos de documentación

| Archivo | Contenido |
|---------|-----------|
| [ARQUITECTURA.md](./ARQUITECTURA.md) | Stack, estructura de directorios, modelo de datos, env vars, cron |
| [FLUJO.md](./FLUJO.md) | Flujos completos: auth, ritual, streak, push, historial, recovery |
| [DECISIONES.md](./DECISIONES.md) | Por qué se eligió cada decisión técnica importante |
| [DESIGN-SYSTEM.md](./DESIGN-SYSTEM.md) | Paleta, tipografía, animaciones, patrones de componentes |
| [DEUDA-TECNICA.md](./DEUDA-TECNICA.md) | Bugs activos, queries ineficientes, codigo redundante, limitaciones |
| [ROADMAP.md](./ROADMAP.md) | Sprints completados y pendientes, backlog |
| [LINEAR.md](./LINEAR.md) | Tutorial paso a paso de Linear (crear, mover y completar tareas) |

## Archivos archivo (historia anterior)

Los archivos en `docs/archivo-anterior/` corresponden a la versión HTML/vanilla JS del proyecto, previa a la migración a Next.js. Se conservan como referencia histórica.

## Estado actual (17 de agosto de 2026)

- Sprint 1 (Core) y Sprint 2 (Engagement) completados.
- Sprint 3 (Monetización): **Mercado Pago en producción real** (no sandbox) — `MP_BACK_URL` apunta a
  `rituales.site`, `MP_ACCESS_TOKEN` es un token de producción, el checkout de `/precios` procesa
  cobros reales.
- Registro por email/contraseña y Google Sign-In con branding "Rituales" funcionando correctamente
  para cualquier usuario (antes rotos por falta de dominio propio verificado en Resend y en Google
  Brand Verification respectivamente — ambos resueltos esta sesión, ver `DEUDA-TECNICA.md`).
- Juegos: 6 juegos (Elección, Esto o Aquello, ¿Cuánto me conoces?, ¿Quién de los dos?, Verdad o Reto,
  Ruleta Picante) con metadata rica, techo de intensidad configurable, variedad y categoría preferida
  "pegajosa", sistema de Momentos, e historial combinado dentro de `/historial`.
- Ver `ROADMAP.md` para el detalle punto por punto.
