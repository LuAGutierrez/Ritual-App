# Rituales — Instrucciones para Claude

Dos skills obligatorias en toda tarea de código de este repo, no opcionales ni dependientes de que el
prompt las mencione:

- **Al planificar el cambio**, antes de tocar código: `.claude/skills/qe-triaje/SKILL.md` — clasificá el
  alcance (🟢 Trivial / 🟡 Mediano / 🔴 Grande) para saber cuánta verificación amerita.
- **Antes de dar el cambio por terminado**: `.claude/skills/no-slop/SKILL.md` — aplicá su checklist
  (hidratación, timezone, RLS, migraciones SQL, etc.) según el nivel que salió del triaje.

Ver `docs/INDEX.md` para el resto de la documentación del proyecto.
