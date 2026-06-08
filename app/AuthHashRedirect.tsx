'use client'

import { useEffect } from 'react'

export function AuthHashRedirect() {
  useEffect(() => {
    const hash = window.location.hash
    const hasAuthHash = hash && /access_token|error|error_code|type=recovery/.test(hash)
    window.location.replace(hasAuthHash ? `/auth${hash}` : '/auth')
  }, [])

  return null
}
