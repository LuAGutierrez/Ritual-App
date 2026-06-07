'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type Tab = 'login' | 'registro'

function AuthForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirect = searchParams.get('redirect') || '/ritual'

  const [tab, setTab] = useState<Tab>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const supabase = createClient()

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        router.refresh()
        router.replace(redirect)
      }
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [redirect])

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!email.trim() || !password) {
      setError('Completá email y contraseña.')
      return
    }

    setLoading(true)

    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password })

      if (error) {
        if (error.message.includes('Email not confirmed')) {
          setError('Confirmá tu email antes de ingresar. Revisá tu bandeja.')
        } else {
          setError('Email o contraseña incorrectos.')
        }
        setLoading(false)
        return
      }

      router.refresh()
      router.push(redirect)
    } catch {
      setError('Ocurrió un error inesperado. Intentá de nuevo.')
      setLoading(false)
    }
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!name.trim()) {
      setError('Ingresá tu nombre o apodo.')
      return
    }
    if (!email.trim()) {
      setError('Ingresá tu email.')
      return
    }
    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.')
      return
    }

    setLoading(true)

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { display_name: name.trim() },
        emailRedirectTo: `${window.location.origin}${redirect}`,
      },
    })

    if (error) {
      if (error.message.includes('rate limit')) {
        setError('Demasiados emails en poco tiempo. Esperá unos 60 minutos e intentá de nuevo.')
      } else if (error.message.includes('already registered') || error.message.includes('already exists')) {
        setError('Este email ya está registrado. Usá la pestaña "Entrar".')
      } else {
        setError(`Error: ${error.message}`)
      }
      setLoading(false)
      return
    }

    // Supabase devuelve identities vacío cuando el email ya existe (sin exponer el error)
    if (data.user && data.user.identities?.length === 0) {
      setError('Este email ya está registrado. Usá la pestaña "Entrar".')
      setLoading(false)
      return
    }

    // Sin confirmación de email requerida → sesión activa → actualizar perfil y redirigir
    if (data.session && data.user) {
      await supabase
        .from('profiles')
        .upsert({ id: data.user.id, email: data.user.email, display_name: name.trim() })
      router.refresh()
      router.push(redirect)
      return
    }

    // Con confirmación de email requerida
    setSuccess('¡Listo! Revisá tu email para confirmar tu cuenta.')
    setLoading(false)
  }

  return (
    <div className="min-h-dvh bg-ritual-bg flex flex-col items-center justify-center px-6 py-12">
      {/* Logo */}
      <div className="mb-10 text-center animate-fade-in">
        <h1 className="font-display text-3xl text-ritual-cream tracking-wide">
          Rituales
        </h1>
        <p className="text-ritual-muted text-sm mt-2 font-body">
          Cinco minutos antes de dormir
        </p>
      </div>

      {/* Card */}
      <div className="w-full max-w-sm animate-fade-up">
        {/* Tabs */}
        <div className="flex bg-ritual-bg-soft rounded-2xl p-1 mb-8">
          <button
            onClick={() => { setTab('login'); setError(null); setSuccess(null) }}
            className={`flex-1 py-2.5 rounded-xl text-sm font-body font-medium transition-all duration-300 ${
              tab === 'login'
                ? 'bg-ritual-gold text-ritual-bg'
                : 'text-ritual-muted hover:text-ritual-text'
            }`}
          >
            Entrar
          </button>
          <button
            onClick={() => { setTab('registro'); setError(null); setSuccess(null) }}
            className={`flex-1 py-2.5 rounded-xl text-sm font-body font-medium transition-all duration-300 ${
              tab === 'registro'
                ? 'bg-ritual-gold text-ritual-bg'
                : 'text-ritual-muted hover:text-ritual-text'
            }`}
          >
            Registrarse
          </button>
        </div>

        {/* Form */}
        <form onSubmit={tab === 'login' ? handleLogin : handleRegister} className="space-y-4">
          {tab === 'registro' && (
            <div>
              <label className="block text-ritual-muted text-xs mb-2 font-body">
                ¿Cómo te llamás?
              </label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Tu nombre o apodo"
                autoFocus
                className="w-full bg-ritual-bg-soft border border-white/10 rounded-xl px-4 py-3.5 text-ritual-text placeholder-ritual-muted/50 font-body text-sm focus:outline-none focus:border-ritual-gold/50 transition-colors"
              />
            </div>
          )}

          <div>
            <label className="block text-ritual-muted text-xs mb-2 font-body">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="tu@email.com"
              className="w-full bg-ritual-bg-soft border border-white/10 rounded-xl px-4 py-3.5 text-ritual-text placeholder-ritual-muted/50 font-body text-sm focus:outline-none focus:border-ritual-gold/50 transition-colors"
            />
          </div>

          <div>
            <label className="block text-ritual-muted text-xs mb-2 font-body">
              Contraseña
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Mínimo 6 caracteres"
              className="w-full bg-ritual-bg-soft border border-white/10 rounded-xl px-4 py-3.5 text-ritual-text placeholder-ritual-muted/50 font-body text-sm focus:outline-none focus:border-ritual-gold/50 transition-colors"
            />
          </div>

          {error && (
            <p className="text-red-400/80 text-sm font-body text-center py-1">
              {error}
            </p>
          )}

          {success && (
            <div className="bg-ritual-gold/10 border border-ritual-gold/20 rounded-xl p-4">
              <p className="text-ritual-gold text-sm font-body text-center">
                {success}
              </p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-ritual-gold text-ritual-bg font-body font-medium py-4 rounded-2xl mt-2 transition-all duration-300 hover:bg-ritual-cream active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading
              ? 'Un momento...'
              : tab === 'login'
              ? 'Entrar'
              : 'Crear cuenta'}
          </button>
        </form>

        {/* Switch tab */}
        <p className="text-center text-ritual-muted text-sm mt-6 font-body">
          {tab === 'login' ? (
            <>
              ¿No tenés cuenta?{' '}
              <button
                onClick={() => setTab('registro')}
                className="text-ritual-gold hover:text-ritual-cream transition-colors"
              >
                Registrate
              </button>
            </>
          ) : (
            <>
              ¿Ya tenés cuenta?{' '}
              <button
                onClick={() => setTab('login')}
                className="text-ritual-gold hover:text-ritual-cream transition-colors"
              >
                Entrá
              </button>
            </>
          )}
        </p>
      </div>
    </div>
  )
}

export default function AuthPage() {
  return (
    <Suspense>
      <AuthForm />
    </Suspense>
  )
}
