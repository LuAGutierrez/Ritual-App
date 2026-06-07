# Decisiones de producto: preguntas y flujo

Enfoque: sesiones cortas, cierre claro, sin fatiga. Pensado para Conexión y Picante (Elección es otro flujo).

---

## 1. ¿Cuántas preguntas por nivel?

- **Hoy:** ~6 (Conexión) y 5 (Picante) por nivel. Bien para variedad.
- **Recomendación:** Mantener ese tamaño. Una “ronda” = **todas las del nivel una vez** (5 o 6 según el juego). No añadir muchas más por nivel para no alargar sin sentido.

**Regla:** El número lo define el contenido en `datos-juegos.js`. No hardcodear “máximo 5” en código; el tope por ronda = longitud de la lista del nivel.

---

## 2. ¿Orden aleatorio o fijo?

- **Hoy:** Primera pregunta aleatoria; después “Siguiente” recorre en orden (índice+1) y da la vuelta sin fin.
- **Problema:** Orden predecible; pueden hacer “siguiente, siguiente” y repetir la misma secuencia.
- **Recomendación:** **Barajar una vez por ronda.** Al elegir nivel: shuffle de esa lista y recorrer en ese orden. Sin repetición hasta completar la ronda. Así:
  - No hay “siguiente” predecible.
  - Cada ronda tiene principio y fin claro.
  - “Otra ronda” = nuevo shuffle.

---

## 3. ¿Límite máximo a “Siguiente pregunta”?

- **Hoy:** Sin límite (cíclico). Pueden dar 50 clics y dar la vuelta.
- **Problema:** No hay sensación de “terminé”, no hay cierre ni momento de “lo logramos”.
- **Recomendación:** **Sí, tope por ronda.** Una ronda = tantas preguntas como items tiene el nivel (5 o 6). Después del último “Siguiente”:
  - Mostrar mensaje de cierre: “Completaste las 6 preguntas de [Suave]. ¿Otra ronda?” con botón “Otra ronda” (nuevo shuffle) y “Cambiar nivel”.
  - Opcional: guardar en `game_progress` que completaron una ronda (para futuras métricas o “has completado 3 rondas esta semana”).

**Regla:** Máximo = tamaño de la lista del nivel. No un número mágico; si mañana hay 8 preguntas en un nivel, la ronda son 8.

---

## Resumen de reglas

| Tema | Decisión |
|------|----------|
| Cuántas preguntas | Las que haya en datos por nivel. Ronda = 1 pasada por toda la lista. |
| Orden | Barajar una vez al empezar la ronda; recorrer en ese orden. |
| Límite “Siguiente” | Sí: una ronda = length(lista). Tras la última, pantalla de cierre + “Otra ronda” / “Cambiar nivel”. |

Implementación sugerida en código:
- Al elegir nivel: `listaBarajada = shuffle([...lista])`, `indiceActual = 0`.
- “Siguiente”: `indiceActual++`. Si `indiceActual >= listaBarajada.length` → mostrar pantalla “Ronda completada”.
- “Otra ronda”: nuevo shuffle, `indiceActual = 0`, volver a primera pantalla de pregunta.
