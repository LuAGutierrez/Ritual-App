'use client'

import { useEffect } from 'react'
import LandingPage from './LandingPage'

// Un visitante sin sesión que entra a "/" a secas ve la landing completa
// (queda como HTML real, así que también le sirve a un crawler que lee
// el HTML inicial, ej. la verificación de marca de Google OAuth). El
// único caso que redirige de una es cuando el hash trae algo de auth de
// verdad (token de OAuth, error, recovery) -- eso no es una visita real,
// es Supabase/Google devolviendo a alguien a mitad de un flujo.
export function AuthHashRedirect() {
  useEffect(() => {
    const hash = window.location.hash
    const hasAuthHash = hash && /access_token|error|error_code|type=recovery/.test(hash)
    if (hasAuthHash) {
      window.location.replace(`/auth${hash}`)
    }
  }, [])

  return <LandingPage />
}
