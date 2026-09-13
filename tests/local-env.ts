import { execSync } from 'child_process'

export const LOCAL_SUPABASE_URL = 'http://127.0.0.1:54321'

function parseStatusEnv(raw: string): Record<string, string> {
  const out: Record<string, string> = {}
  for (const line of raw.split('\n')) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/)
    if (!m) continue
    out[m[1]] = m[2].replace(/^['"]|['"]$/g, '')
  }
  return out
}

export function localSupabaseEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (anon && service) {
    return {
      NEXT_PUBLIC_SUPABASE_URL: url ?? LOCAL_SUPABASE_URL,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: anon,
      SUPABASE_SERVICE_ROLE_KEY: service,
    }
  }

  let raw = ''
  try {
    raw = execSync('npx supabase status -o env', {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    })
  } catch {
    throw new Error(
      'Supabase local no está corriendo. Ejecutá: npx supabase start'
    )
  }
  const env = parseStatusEnv(raw)
  const anonKey = env.PUBLISHABLE_KEY || env.ANON_KEY
  const serviceKey = env.SECRET_KEY || env.SERVICE_ROLE_KEY
  if (!anonKey || !serviceKey) {
    throw new Error('No se pudieron leer las keys de `npx supabase status -o env`')
  }
  return {
    NEXT_PUBLIC_SUPABASE_URL: env.API_URL || LOCAL_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: anonKey,
    SUPABASE_SERVICE_ROLE_KEY: serviceKey,
  }
}
