'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { unirseAPareja, verificarInvitacionAction } from '@/app/actions/couple'
import PageLoader from '@/components/PageLoader'

export default function UnirsePareja() {
  const router = useRouter()
  const params = useParams()
  const code = (params.code as string).toUpperCase()
  const supabase = createClient()

  const [loading, setLoading] = useState(true)
  const [joining, setJoining] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [alreadyMember, setAlreadyMember] = useState(false)

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        router.replace(`/auth?redirect=/unirse/${code}`)
        return
      }

      let result = await verificarInvitacionAction(code)

      // Sesión en el browser pero cookies aún no en el servidor → refrescar una vez
      if (!result.ok && result.needsAuth) {
        await supabase.auth.refreshSession()
        result = await verificarInvitacionAction(code)
      }

      if (!result.ok && result.needsAuth) {
        await supabase.auth.signOut()
        router.replace(`/auth?redirect=/unirse/${code}`)
        return
      }

      if (!result.ok) {
        setError(result.error ?? 'El link de invitación no es válido o ya expiró.')
        setLoading(false)
        return
      }

      if (result.full) {
        setError('Esta pareja ya tiene dos integrantes.')
        setLoading(false)
        return
      }

      if (result.alreadyMember) setAlreadyMember(true)

      setLoading(false)
    }

    init()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code])

  async function handleUnirse() {
    setJoining(true)
    setError(null)

    const result = await unirseAPareja(code)

    if (result.error) {
      setError(result.error)
      setJoining(false)
      return
    }

    router.push('/ritual')
  }

  if (loading) {
    return <PageLoader />
  }

  return (
    <div className="min-h-dvh bg-ritual-bg flex flex-col items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm animate-fade-up text-center">

        {error ? (
          <>
            <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-6">
              <span className="text-2xl">✗</span>
            </div>
            <h2 className="font-display text-2xl text-ritual-cream mb-3">
              Link inválido
            </h2>
            <p className="text-ritual-muted font-body text-sm mb-8">{error}</p>
            <button
              onClick={() => router.push('/')}
              className="w-full bg-ritual-gold text-ritual-bg font-body font-medium py-4 rounded-2xl"
            >
              Ir al inicio
            </button>
          </>
        ) : alreadyMember ? (
          <>
            <div className="w-16 h-16 rounded-full bg-ritual-gold/10 border border-ritual-gold/20 flex items-center justify-center mx-auto mb-6">
              <span className="text-2xl">✓</span>
            </div>
            <h2 className="font-display text-2xl text-ritual-cream mb-3">
              Ya estás en esta pareja
            </h2>
            <p className="text-ritual-muted font-body text-sm mb-8">
              El ritual de hoy te espera.
            </p>
            <button
              onClick={() => router.push('/ritual')}
              className="w-full bg-ritual-gold text-ritual-bg font-body font-medium py-4 rounded-2xl"
            >
              Ver el ritual de hoy
            </button>
          </>
        ) : (
          <>
            <div className="w-16 h-16 rounded-full bg-ritual-gold/10 border border-ritual-gold/20 flex items-center justify-center mx-auto mb-6">
              <span className="text-2xl">💛</span>
            </div>
            <h2 className="font-display text-2xl text-ritual-cream tracking-wide mb-3">
              Fuiste invitado/a
            </h2>
            <p className="text-ritual-muted font-body text-sm leading-relaxed mb-10">
              Tu pareja te espera en Rituales.<br />Un ritual diario para conectar, juntos.
            </p>

            <button
              onClick={handleUnirse}
              disabled={joining}
              className="w-full bg-ritual-gold text-ritual-bg font-body font-medium py-4 rounded-2xl transition-all duration-300 hover:bg-ritual-cream active:scale-[0.98] disabled:opacity-40"
            >
              {joining ? 'Uniéndome...' : 'Unirme a la pareja'}
            </button>
          </>
        )}
      </div>
    </div>
  )
}
