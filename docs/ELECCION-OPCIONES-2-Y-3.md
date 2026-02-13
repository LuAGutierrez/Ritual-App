# Elección mutua — Opciones 2 y 3 (pendientes)

Ya está implementada la **Opción 1** (coincidencia + premio aleatorio por categoría y texto "🔥 Coincidieron"). Resumen de qué tocaría para las otras dos.

---

## Opción 2 — Tensión acumulada

**Idea:** Si no coinciden → consecuencia ligera. Cuando por fin coinciden → premio más potente.

**Cambios:**

1. **`js/datos-juegos.js`**
   - Añadir array `eleccion.consecuenciasNoMatch`, por ejemplo:
     - "El que eligió algo más intenso explica por qué."
     - "Acercarse 10 segundos sin tocarse."
     - "Susurrarle algo al otro."
   - Opcional: array `eleccion.premiosPotentes` (o lógica “premio doble” cuando coinciden tras varias no-coincidencias).

2. **`js/juego-eleccion.js`**
   - Variable de estado: `rondasSinCoincidir` (contador).
   - Al revelar y **no** coincidir: mostrar un texto de consecuencia (elegido al azar de `consecuenciasNoMatch`) y hacer `rondasSinCoincidir++`.
   - Al revelar y **sí** coincidir: si `rondasSinCoincidir > 0`, mostrar premio “potente” (por ejemplo dos premios o uno de una lista especial); luego resetear `rondasSinCoincidir`.

3. **`juego-eleccion.html`**
   - En el bloque de “no coincidieron”, un `<p>` o `<div>` para el texto de la consecuencia (por ej. `id="texto-consecuencia"`). El JS lo rellena cuando aplica.

---

## Opción 3 — Falso match (“¿Están seguros?”)

**Idea:** Al coincidir no mostrar el premio directo; mostrar “¿Están seguros?” con: **Confirmar**, **Cambiar**, **Doblar apuesta**.

**Cambios:**

1. **`juego-eleccion.html`**
   - Después de mostrar “Coincidieron” (o en lugar de mostrar el premio de golpe), un bloque con:
     - Texto: “¿Están seguros?”
     - Tres botones: Confirmar, Cambiar, Doblar apuesta.
   - Flujo posible: el premio se muestra solo al hacer “Confirmar”, o después de “Doblar” si vuelven a coincidir.

2. **`js/juego-eleccion.js`**
   - Cuando `eleccion1 === eleccion2`: no poner aún el premio en pantalla; mostrar el paso “¿Están seguros?” con los 3 botones.
   - **Confirmar:** mostrar el premio (aleatorio de la categoría, como ahora) y ocultar los botones.
   - **Cambiar:** volver a paso 1 (o paso 2) para que elijan de nuevo; limpiar elecciones.
   - **Doblar apuesta:** guardar que “están en doble”; volver a paso 1/2 para elegir otra vez. Si en esa segunda ronda vuelven a coincidir → premio “intensificado” (por ej. dos premios de la categoría o una lista `premiosDoble` en datos). Si no coinciden → se puede tratar como no-match normal o con consecuencia de la Opción 2.

3. **`js/datos-juegos.js`**
   - Si se implementa “premio intensificado”: opcional tener por categoría un array `premiosDoble` o regla del tipo “mostrar 2 premios aleatorios de la categoría”.

---

## Orden sugerido

- **Opción 1:** hecha.
- **Opción 2:** da juego sin cambiar mucho el flujo; solo estado + texto de consecuencia y (opcional) premio potente.
- **Opción 3:** implica un paso extra de UI y varios estados (confirmar / cambiar / doblar, y posible segunda ronda). Conviene implementarla después de la 2 si se quieren las dos.

Si querés, en el siguiente paso se puede bajar esto a cambios concretos línea por línea en los archivos.
