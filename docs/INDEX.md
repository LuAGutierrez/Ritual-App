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

## Archivos archivo (historia anterior)

Los archivos en `docs/archivo-anterior/` corresponden a la versión HTML/vanilla JS del proyecto, previa a la migración a Next.js. Se conservan como referencia histórica.

## Estado actual (julio 2026)

- Sprint 1 (Core) y Sprint 2 (Engagement) completados.
- Sprint 3 (Monetización) en progreso: Mercado Pago integrado (checkout + webhook), paywall de historial activo, rituales premium con categorías exclusivas (viajes, planes, fantasías). Falta probar el flujo end-to-end en sandbox y conseguir dominio propio para producción.
- Ver `ROADMAP.md` para el detalle punto por punto.
