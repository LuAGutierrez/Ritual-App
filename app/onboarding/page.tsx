'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { crearPareja } from '@/app/actions/couple'

type Step = 'nombre' | 'opciones' | 'esperando'

export default function OnboardingPage() {
  const router = useRouter()
  const supabase = createClient()

  const [step, setStep] = useState<Step>('nombre')
  const [nombre, setNombre] = useState('')
  const [userId, setUserId] = useState<string | null>(null)
  const [inviteLink, setInviteLink] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { router.replace('/auth'); return }
      setUserId(user.id)

      // Si ya tiene nombre (registrado con nombre), saltar directo a opciones
      const { data: profile } = await supabase
        .from('profiles')
        .select('display_name')
        .eq('id', user.id)
        .single()

      if (profile?.display_name) {
        setNombre(profile.display_name)
        setStep('opciones')
      }
    })
  }, [])

  async function handleNombre(e: React.FormEvent) {
    e.preventDefault()
    if (!nombre.trim() || !userId) return

    setLoading(true)
    await supabase
      .from('profiles')
      .update({ display_name: nombre.trim() })
      .eq('id', userId)
    setLoading(false)
    setStep('opciones')
  }

  async function handleCrearPareja() {
    setLoading(true)
    setError(null)

    const result = await crearPareja()

    if (result.error) {
      setError(`Error al crear pareja: ${result.error}`)
      setLoading(false)
      return
    }

    const link = `${window.location.origin}/unirse/${result.inviteCode}`
    setInviteLink(link)
    setLoading(false)
    setStep('esperando')
  }

  async function copyLink() {
    if (!inviteLink) return
    try {
      await navigator.clipboard.writeText(inviteLink)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      setError('No se pudo copiar. Copiá el link manualmente.')
    }
  }

  async function continuar() {
    router.push('/ritual')
  }

  return (
    <div className="min-h-dvh bg-ritual-bg flex flex-col items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm">

        {/* PASO 1: Nombre */}
        {step === 'nombre' && (
          <div className="animate-fade-up">
            <div className="mb-10 text-center">
              <h1 className="font-display text-3xl text-ritual-cream tracking-wide mb-3">
                Rituales
              </h1>
              <p className="text-ritual-muted font-body text-sm leading-relaxed">
                Antes de empezar,<br />¿cómo te llamás?
              </p>
            </div>

            <form onSubmit={handleNombre} className="space-y-6">
              <input
                type="text"
                value={nombre}
                onChange={e => setNombre(e.target.value)}
                placeholder="Tu nombre o apodo"
                required
                autoFocus
                className="w-full bg-ritual-bg-soft border border-white/10 rounded-2xl px-5 py-4 text-ritual-text placeholder-ritual-muted/40 font-body text-base focus:outline-none focus:border-ritual-gold/50 transition-colors text-center"
              />
              <button
                type="submit"
                disabled={!nombre.trim() || loading}
                className="w-full bg-ritual-gold text-ritual-bg font-body font-medium py-4 rounded-2xl transition-all duration-300 hover:bg-ritual-cream active:scale-[0.98] disabled:opacity-40"
              >
                Continuar
              </button>
            </form>
          </div>
        )}

        {/* PASO 2: Opciones */}
        {step === 'opciones' && (
          <div className="animate-fade-up">
            <div className="mb-10 text-center">
              <h2 className="font-display text-2xl text-ritual-cream tracking-wide mb-3">
                Hola, {nombre}
              </h2>
              <p className="text-ritual-muted font-body text-sm leading-relaxed">
                ¿Querés empezar el ritual<br />o invitar a tu pareja primero?
              </p>
            </div>

            {error && (
              <p className="text-red-400/80 text-sm font-body text-center mb-4">{error}</p>
            )}

            <div className="space-y-3">
              <button
                onClick={handleCrearPareja}
                disabled={loading}
                className="w-full bg-ritual-gold text-ritual-bg font-body font-medium py-4 rounded-2xl transition-all duration-300 hover:bg-ritual-cream active:scale-[0.98] disabled:opacity-40"
              >
                {loading ? 'Creando...' : 'Crear pareja e invitar'}
              </button>

              <button
                onClick={() => router.push('/ritual')}
                className="w-full bg-transparent border border-white/10 text-ritual-muted font-body text-sm py-4 rounded-2xl hover:border-white/20 hover:text-ritual-text transition-all duration-300"
              >
                Explorar solo por ahora
              </button>
            </div>
          </div>
        )}

        {/* PASO 3: Esperando pareja */}
        {step === 'esperando' && inviteLink && (
          <div className="animate-fade-up">
            <div className="mb-8 text-center">
              <div className="w-16 h-16 rounded-full bg-ritual-gold/10 border border-ritual-gold/20 flex items-center justify-center mx-auto mb-6">
                <span className="text-2xl">🔗</span>
              </div>
              <h2 className="font-display text-2xl text-ritual-cream tracking-wide mb-3">
                Tu pareja espera
              </h2>
              <p className="text-ritual-muted font-body text-sm leading-relaxed">
                Compartí este link para que<br />se unan a tus rituales
              </p>
            </div>

            {/* Link de invitación */}
            <div className="bg-ritual-bg-soft border border-white/10 rounded-2xl p-4 mb-6">
              <p className="text-ritual-muted text-xs font-body mb-2">Link de invitación</p>
              <p className="text-ritual-cream font-body text-sm break-all leading-relaxed">
                {inviteLink}
              </p>
            </div>

            {error && (
              <p className="text-red-400/80 text-sm font-body text-center mb-4">{error}</p>
            )}

            <div className="space-y-3">
              <button
                onClick={copyLink}
                className="w-full bg-ritual-gold text-ritual-bg font-body font-medium py-4 rounded-2xl transition-all duration-300 hover:bg-ritual-cream active:scale-[0.98]"
              >
                {copied ? '¡Copiado!' : 'Copiar link'}
              </button>

              <button
                onClick={continuar}
                className="w-full bg-transparent border border-white/10 text-ritual-muted font-body text-sm py-4 rounded-2xl hover:border-white/20 hover:text-ritual-text transition-all duration-300"
              >
                Ir al ritual de hoy →
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
