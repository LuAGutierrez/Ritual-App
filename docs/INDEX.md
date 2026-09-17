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

## Estado actual (16 de septiembre de 2026)

- Sprint 1 (Core) y Sprint 2 (Engagement): completados.
- Sprint 3 (Monetización, Mercado Pago con suscripción mensual): **retirada** — reemplazada por el
  Sprint 5 (sistema de créditos). Se deja como registro histórico en `ROADMAP.md`.
- Sprint 4 (IA e insights): completo (15/09) — Verdad o Reto con IA (Groq, tab picante), Ritual con
  IA (`/ritual-ia`, pago con créditos), insights emocionales semanales en `/perfil`.
- Sprint 5 (sistema de créditos): completo y en producción (14/09) — reemplaza la suscripción de
  Mercado Pago por un pozo de créditos compartido por pareja (pago único vía Checkout Pro), con
  anti-farmeo por device fingerprint. Es la única monetización activa.
- Juegos: 6 juegos (Elección, Esto o Aquello, ¿Cuánto me conoces?, ¿Quién de los dos?, Verdad o Reto,
  Ruleta Picante) con metadata rica, techo de intensidad configurable, sistema de Momentos, e
  historial combinado dentro de `/historial`.
- Registro por email/contraseña y Google Sign-In con branding "Rituales" funcionando correctamente
  para cualquier usuario.
- Backlog reciente sin sprint asignado (15-16/09): cambiar el ritual del día, modo offline simple,
  sistema de referidos ("invitá a un amigo", incluye Google OAuth).
- Ver `ROADMAP.md` para el detalle punto por punto.
