'use client'

import { useEffect } from 'react'

// Antes esto solo mostraba un spinner -- un usuario sin sesión nunca lo
// ve más que un instante (redirige enseguida), pero un crawler que lee
// el HTML inicial (ej. la verificación de marca de Google OAuth) sí, y
// sin texto real no puede entender de qué trata la app.
export function AuthHashRedirect() {
  useEffect(() => {
    const hash = window.location.hash
    const hasAuthHash = hash && /access_token|error|error_code|type=recovery/.test(hash)
    window.location.replace(hasAuthHash ? `/auth${hash}` : '/auth')
  }, [])

  return (
    <div className="min-h-dvh bg-ritual-bg flex items-center justify-center px-6">
      <div className="text-center max-w-sm animate-fade-in">
        <h1 className="font-display text-3xl text-ritual-cream tracking-wide">Rituales</h1>
        <p className="text-ritual-muted text-sm mt-3 font-body leading-relaxed">
          Un ritual diario compartido y juegos para conectar con tu pareja, cinco minutos antes de dormir.
        </p>
      </div>
    </div>
  )
}
