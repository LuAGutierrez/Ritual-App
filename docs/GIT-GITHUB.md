# Subir Ritual-App a GitHub

El repo local ya está inicializado y con el primer commit. Falta crear el repo **Ritual-App** en GitHub y hacer push.

---

## 1. Crear el repositorio en GitHub

1. Entrá a [github.com/new](https://github.com/new).
2. **Repository name:** `Ritual-App`
3. **Public**
4. **No** marques "Add a README" ni .gitignore (ya los tenés en el proyecto).
5. Clic en **Create repository**.

---

## 2. Conectar y subir

En la carpeta del proyecto (PowerShell):

```powershell
cd "c:\Users\Usuario\Downloads\Parejas Juego"
git remote add origin https://github.com/TU_USUARIO_GITHUB/Ritual-App.git
git branch -M main
git push -u origin main
```

Reemplazá **TU_USUARIO_GITHUB** por tu usuario de GitHub (ej. si tu perfil es `github.com/juanperez`, usá `juanperez`).

Si GitHub te pide autenticación, usá un [Personal Access Token](https://github.com/settings/tokens) como contraseña (no la de tu cuenta).

---

Después de esto podés conectar **Ritual-App** con Vercel desde [vercel.com](https://vercel.com) → Add New → Project → importá el repo.
