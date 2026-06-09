'use client'

import { useState, useEffect, useLayoutEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { AuthChangeEvent } from '@supabase/supabase-js'

type Tab = 'login' | 'registro' | 'olvidé' | 'nueva_contraseña'

function AuthForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirect = searchParams.get('redirect') || '/ritual'

  const [isRecoveryFlow, setIsRecoveryFlow] = useState(
    searchParams.get('recovery') === '1'
  )
  const [tab, setTab] = useState<Tab>(
    searchParams.get('recovery') === '1' ? 'nueva_contraseña' : 'login'
  )
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [recoveryEmail, setRecoveryEmail] = useState<string | null>(null)
  const [recoveryChecking, setRecoveryChecking] = useState(false)

  const supabase = createClient()

  useEffect(() => {
    if (searchParams.get('error') === 'link_invalido') {
      setError('El link expiró o no es válido. Pedí uno nuevo.')
    }
  }, [searchParams])

  useEffect(() => {
    const token_hash = searchParams.get('token_hash')
    const type = searchParams.get('type')
    if (token_hash && type === 'recovery') {
      window.location.replace(
        `/auth/callback?token_hash=${encodeURIComponent(token_hash)}&type=recovery`
      )
    }
  }, [searchParams])

  useLayoutEffect(() => {
    const hash = window.location.hash.slice(1)
    if (!hash) return

    const params = new URLSearchParams(hash)
    if (params.get('error') || params.get('error_code')) return

    if (params.get('type') === 'recovery' || params.has('access_token')) {
      setIsRecoveryFlow(true)
      setTab('nueva_contraseña')
    }
  }, [])

  useEffect(() => {
    if (tab !== 'nueva_contraseña') return

    let cancelled = false
    setRecoveryChecking(true)
    setError(null)

    async function initRecoverySession() {
      const hash = window.location.hash.slice(1)
      if (hash) {
        const params = new URLSearchParams(hash)
        if (params.get('error') || params.get('error_code')) {
          window.history.replaceState(null, '', window.location.pathname + window.location.search)
          setRecoveryChecking(false)
          setError('El link expiró o no es válido. Pedí uno nuevo.')
          setTab('olvidé')
          return
        }

        const access_token = params.get('access_token')
        const refresh_token = params.get('refresh_token')
        if (access_token && refresh_token) {
          const { data, error } = await supabase.auth.setSession({ access_token, refresh_token })
          window.history.replaceState(null, '', window.location.pathname + window.location.search)
          if (cancelled) return
          setRecoveryChecking(false)
          if (error || !data.session) {
            setError('El link expiró o no es válido. Pedí uno nuevo desde "Olvidé mi contraseña".')
            setTab('olvidé')
            return
          }
          setRecoveryEmail(data.session.user.email ?? null)
          return
        }
      }

      const { data: { session } } = await supabase.auth.getSession()
      if (cancelled) return
      if (session?.user) {
        setRecoveryChecking(false)
        setRecoveryEmail(session.user.email ?? null)
        return
      }

      await new Promise(resolve => window.setTimeout(resolve, 1500))
      const { data: { session: retrySession } } = await supabase.auth.getSession()
      if (cancelled) return
      setRecoveryChecking(false)
      if (retrySession?.user) {
        setRecoveryEmail(retrySession.user.email ?? null)
        return
      }

      setError('El link expiró o no es válido. Pedí uno nuevo desde "Olvidé mi contraseña".')
      setTab('olvidé')
    }

    initRecoverySession()
    return () => { cancelled = true }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab])

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event: AuthChangeEvent) => {
      if (event === 'PASSWORD_RECOVERY') {
        setIsRecoveryFlow(true)
        setTab('nueva_contraseña')
        setError(null)
      }
    })
    return () => subscription.unsubscribe()
  }, [supabase.auth])

  useEffect(() => {
    if (isRecoveryFlow || tab === 'nueva_contraseña') return
    const hash = window.location.hash
    if (hash && /access_token|type=recovery/.test(hash)) return

    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        router.refresh()
        router.replace(redirect)
      }
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [redirect, tab, isRecoveryFlow])

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

  async function handleForgotPassword(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!email.trim()) {
      setError('Ingresá tu email.')
      return
    }

    setLoading(true)
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?type=recovery`,
    })

    if (error) {
      setError('No se pudo enviar el email. Intentá de nuevo.')
      setLoading(false)
      return
    }

    setSuccess('Te enviamos un link para restablecer tu contraseña.')
    setLoading(false)
  }

  async function handleNewPassword(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (newPassword.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.')
      return
    }

    setLoading(true)
    const { error } = await supabase.auth.updateUser({ password: newPassword })

    if (error) {
      setError('No se pudo actualizar la contraseña. Pedí un link nuevo.')
      setLoading(false)
      return
    }

    setIsRecoveryFlow(false)
    setSuccess('Contraseña actualizada. Entrando...')
    window.location.href = '/ritual'
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
        {tab !== 'nueva_contraseña' && tab !== 'olvidé' && (
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
        )}

        {tab === 'nueva_contraseña' && (
          <div className="text-center mb-6 space-y-1">
            <p className="text-ritual-cream font-body text-sm">
              {recoveryChecking ? 'Verificando tu link...' : 'Elegí tu nueva contraseña'}
            </p>
            {recoveryEmail && !recoveryChecking && (
              <p className="text-ritual-muted font-body text-xs">
                Para {recoveryEmail}
              </p>
            )}
          </div>
        )}

        {tab === 'olvidé' && (
          <p className="text-ritual-cream font-body text-sm text-center mb-6">
            Te enviamos un link a tu email
          </p>
        )}

        {/* Form */}
        <form
          onSubmit={
            tab === 'login' ? handleLogin
            : tab === 'registro' ? handleRegister
            : tab === 'olvidé' ? handleForgotPassword
            : handleNewPassword
          }
          className="space-y-4"
        >
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

          {tab !== 'nueva_contraseña' && (
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
          )}

          {tab !== 'olvidé' && tab !== 'nueva_contraseña' && (
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
              {tab === 'login' && (
                <button
                  type="button"
                  onClick={() => { setTab('olvidé'); setError(null); setSuccess(null) }}
                  className="text-ritual-muted text-xs font-body mt-2 hover:text-ritual-gold transition-colors"
                >
                  Olvidé mi contraseña
                </button>
              )}
            </div>
          )}

          {tab === 'nueva_contraseña' && !recoveryChecking && (
            <div>
              <label className="block text-ritual-muted text-xs mb-2 font-body">
                Nueva contraseña
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                autoFocus
                className="w-full bg-ritual-bg-soft border border-white/10 rounded-xl px-4 py-3.5 text-ritual-text placeholder-ritual-muted/50 font-body text-sm focus:outline-none focus:border-ritual-gold/50 transition-colors"
              />
            </div>
          )}

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
            disabled={loading || (tab === 'nueva_contraseña' && recoveryChecking)}
            className="w-full bg-ritual-gold text-ritual-bg font-body font-medium py-4 rounded-2xl mt-2 transition-all duration-300 hover:bg-ritual-cream active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading || (tab === 'nueva_contraseña' && recoveryChecking)
              ? 'Un momento...'
              : tab === 'login' ? 'Entrar'
              : tab === 'registro' ? 'Crear cuenta'
              : tab === 'olvidé' ? 'Enviar link'
              : 'Guardar contraseña'}
          </button>
        </form>

        {/* Switch tab */}
        <p className="text-center text-ritual-muted text-sm mt-6 font-body">
          {tab === 'olvidé' || tab === 'nueva_contraseña' ? (
            <>
              <button
                onClick={() => { setTab('login'); setError(null); setSuccess(null) }}
                className="text-ritual-gold hover:text-ritual-cream transition-colors"
              >
                Volver a entrar
              </button>
            </>
          ) : tab === 'login' ? (
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
