# Diseño: Login con email no confirmado

**Fecha:** 2025-03-01

## Objetivo

Si un usuario intenta entrar con email y contraseña correctos pero aún no confirmó el email, que vea el mismo bloque que con `?pendingConfirm=1`: mensaje claro y opción de reenviar el correo de confirmación (en vez de solo el mensaje crudo de Supabase).

## Comportamiento

1. El usuario escribe email y contraseña en el formulario de login y envía.
2. Supabase rechaza con error (mensaje "Email not confirmed").
3. En el `catch` del login en `auth-page.js`: si el mensaje indica "email no confirmado", se llama a `mostrarMensajeConfirmarEmail(email)` con el email del input del login.
4. Se muestra el bloque existente: texto "Revisá tu correo..." y campo + botón para reenviar.
5. Detección por mensaje de Supabase (ej. que `err.message` contenga "Email not confirmed"), sin cambios en `auth.js`.

## Archivos

- Solo `js/auth-page.js`: en el manejador `formLogin.addEventListener('submit', ...)`, dentro del `catch`.

## Enfoque elegido

Detección solo en auth-page por mensaje de error. Sin tocar auth.js. Si en el futuro Supabase cambia el mensaje, se puede pasar a centralizar la detección en auth.js.

## Casos borde

- Si el mensaje de Supabase cambia, se deja de detectar y se vuelve al comportamiento actual (mensaje genérico). Aceptable para MVP.
- Si el usuario ya vio el bloque y vuelve a intentar login, se muestra de nuevo el mismo bloque; no hace falta estado extra.
