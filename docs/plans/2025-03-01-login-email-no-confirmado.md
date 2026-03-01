# Login con email no confirmado — Plan de implementación

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Mostrar el bloque "confirmá tu correo" + reenviar cuando el login falla por email no confirmado (en vez del mensaje crudo de Supabase).

**Architecture:** Detección en el catch del submit de login en auth-page.js por mensaje de error; reutilizar `mostrarMensajeConfirmarEmail(email)` ya existente. Sin cambios en auth.js.

**Tech Stack:** JS vanilla, Supabase Auth.

---

## Task 1: Detectar "Email not confirmed" en el catch del login

**Files:**
- Modify: `js/auth-page.js` (bloque `.catch` del `formLogin.addEventListener('submit', ...)`)

**Step 1: Implementar la detección**

En el `catch` del login (aprox. líneas 166-169), antes de `showError(...)`:

- Si `err && err.message` contiene el texto de email no confirmado (p. ej. "Email not confirmed"), llamar a `mostrarMensajeConfirmarEmail(email)` — usando la variable `email` ya definida en el submit —, restablecer el botón y hacer `return`.
- Si no, mantener el comportamiento actual: `showError(err.message || 'Error al iniciar sesión.');` y restablecer el botón.

Criterio de detección: por ejemplo `err.message && err.message.indexOf('Email not confirmed') !== -1` (o comprobar en mayúsculas/minúsculas si se prefiere).

**Step 2: Probar a mano**

1. En Supabase Dashboard: Authentication → Providers → Email → **Confirm email** ON.
2. Crear una cuenta nueva (o usar una existente no confirmada); no hacer clic en el link del correo.
3. En auth.html, pestaña Entrar: ingresar ese email y contraseña → Entrar.
4. Verificar que aparece el bloque de "Revisá tu correo..." con el campo de email y el botón para reenviar (no solo el mensaje "Email not confirmed").
5. Verificar que "Reenviar correo" funciona.
6. Probar con un error distinto (ej. contraseña incorrecta): debe seguir mostrándose el mensaje de error normal en `#auth-error`.

**Step 3: Commit**

```bash
git add js/auth-page.js
git commit -m "feat(auth): mostrar bloque confirmar email cuando login falla por email no confirmado"
```
