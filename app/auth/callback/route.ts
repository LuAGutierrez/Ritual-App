import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const token_hash = searchParams.get('token_hash')
  const type = searchParams.get('type')
  const redirectParam = searchParams.get('redirect')
  const safeRedirect = redirectParam?.startsWith('/') && !redirectParam.startsWith('//') ? redirectParam : null
  const next = type === 'recovery' ? '/auth?recovery=1' : (safeRedirect || '/ritual')
  const refCode = searchParams.get('ref')
  let redirectTo = `${origin}/auth?error=link_invalido`

  const cookieStore = await cookies()
  const pendingCookies: Array<{ name: string; value: string; options?: CookieOptions }> = []

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet: Array<{ name: string; value: string; options?: CookieOptions }>) {
          pendingCookies.push(...cookiesToSet)
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
        },
      },
    }
  )

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      redirectTo = `${origin}${next}`
      // Solo aplica a Google (email/contraseña ya linkea el referral desde
      // handle_new_user vía raw_user_meta_data, ver migración 071). La RPC
      // es un no-op seguro si la cuenta no es nueva o el código no existe.
      if (refCode) {
        await supabase.rpc('link_referral_for_new_oauth_user', { p_ref_code: refCode })
      }
    }
  } else if (token_hash && type === 'recovery') {
    const { error } = await supabase.auth.verifyOtp({ token_hash, type: 'recovery' })
    if (!error) redirectTo = `${origin}${next}`
  }

  const response = NextResponse.redirect(redirectTo)
  pendingCookies.forEach(({ name, value, options }) =>
    response.cookies.set(name, value, options)
  )
  return response
}
