# Diseño: Memoria nuestra (cuarto juego)

**Fecha:** 2025-03-01  
**Alcance:** Nuevo juego "Memoria nuestra" — escribir en secreto cómo recuerdan un momento, revelar y charlar.

---

## 1. Resumen y flujo

- **Qué es:** Cuarto juego, "Memoria nuestra". Una pregunta de memoria por pantalla (ej. "¿Dónde nos besamos la primera vez?"). Cada uno escribe su respuesta en secreto en el mismo dispositivo; al confirmar ambos, se muestran las dos respuestas. La app no elige versión oficial: solo muestra y ellos charlan. Botón "Siguiente" para pasar a otra pregunta. Sin rondas: secuencia continua. Mismo control de acceso que los otros (trial/suscripción al entrar).
- **Dispositivo:** Un solo dispositivo (pasarse el teléfono). Primero escribe uno, luego el otro, después revelar.

---

## 2. Pantallas y UI

- **Entrada:** Mismo layout que los otros juegos (fragmento común: header, paywall, game-content, trial-notice, sin-datos). Título "Memoria nuestra" y subtítulo "Escriban en secreto. Después revelamos."
- **Fase 1:** Pregunta + textarea + botón "Listo" (o "Pasale al otro"). Al enviar se guarda y se oculta; pasa a fase 2.
- **Fase 2:** Misma pregunta, otro textarea, botón "Revelar". Al enviar, pantalla de revelación.
- **Revelación:** Pregunta + las dos respuestas (ej. "Uno" / "Dos" o "Vos" / "Tu pareja"). Botón "Siguiente" → siguiente pregunta del banco (barajado al inicio).
- **Fin:** Si se acaban las preguntas, mensaje "Se acabaron las memorias por ahora" y "Volver" a experiencias. Opcional: "Mezclar de nuevo" para rebarajar.

---

## 3. Datos y contenido

- **Dónde:** En `js/datos-juegos.js`, nuevo bloque `memoria: [ ... ]` dentro de `window.RitualDatos` (array de strings).
- **Contenido:** Preguntas de memoria (primera vez, primeros regalos, películas, lugares). MVP: 15–25 preguntas.
- **Orden:** Al entrar se baraja una vez (reusar `RitualShuffle`). "Siguiente" avanza en ese orden. Al terminar la lista, pantalla de fin (y opcional "Mezclar de nuevo").

---

## 4. Integración

- **elegir-juego.html:** Cuarta tarjeta "Memoria nuestra" → `juego-memoria.html`.
- **Archivos nuevos:** `juego-memoria.html` (mismo bloque común que los otros), `js/juego-memoria.js` (datos, baraja, fases).
- **game-gate:** Misma lógica de acceso al cargar (no hay "otra ronda"; solo validar al entrar). Actualizar texto del paywall de "las tres experiencias" a "las experiencias" o "todas las experiencias".
- **Scripts:** En `juego-memoria.html` cargar en orden: supabase, supabase-config, app, auth, datos-juegos, game-gate, juego-memoria.

---

## 5. Errores y detalles

- **Respuesta vacía:** Permitir enviar en blanco. En revelación mostrar "—" o "Nada escrito" para esa persona.
- **Una sola pregunta:** Tras revelar, "Siguiente" lleva a pantalla "Se acabaron las memorias" (o "Mezclar de nuevo" si se implementa).
- **Volver:** Header "Volver" como en los otros. No persistir estado al salir; al reentrar se baraja de nuevo.
- **Responsive:** Textarea y botones usables en móvil.

---

## Próximo paso

Invocar **writing-plans** para generar el plan de implementación.
