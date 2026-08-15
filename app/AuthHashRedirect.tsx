'use client'

import { useEffect } from 'react'
import PageLoader from '@/components/PageLoader'

export function AuthHashRedirect() {
  useEffect(() => {
    const hash = window.location.hash
    const hasAuthHash = hash && /access_token|error|error_code|type=recovery/.test(hash)
    window.location.replace(hasAuthHash ? `/auth${hash}` : '/auth')
  }, [])

  return <PageLoader />
}
