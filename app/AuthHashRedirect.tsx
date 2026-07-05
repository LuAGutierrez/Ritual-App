'use client'

import { useEffect } from 'react'

export function AuthHashRedirect() {
  useEffect(() => {
    const hash = window.location.hash
    const hasAuthHash = hash && /access_token|error|error_code|type=recovery/.test(hash)
    window.location.replace(hasAuthHash ? `/auth${hash}` : '/auth')
  }, [])

  return (
    <div className="min-h-dvh bg-ritual-bg flex items-center justify-center">
      <div className="w-6 h-6 border-2 border-ritual-gold/40 border-t-ritual-gold rounded-full animate-spin" />
    </div>
  )
}
