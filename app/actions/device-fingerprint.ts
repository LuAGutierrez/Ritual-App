'use server'

import { createHash } from 'crypto'
import { headers } from 'next/headers'
import { createClient } from '@/lib/supabase/server'

// Ver lib/deviceFingerprint.ts para el lado cliente. El ip_hash nunca
// guarda la IP en texto plano -- solo su hash, suficiente para
// correlacionar sin poder reconstruir la IP real desde la base.
export async function recordDeviceFingerprintAction(fingerprint: string): Promise<void> {
  if (!fingerprint) return

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  const h = await headers()
  const ip = h.get('x-forwarded-for')?.split(',')[0]?.trim() || h.get('x-real-ip') || ''
  const ipHash = ip ? createHash('sha256').update(ip).digest('hex') : null

  await supabase.rpc('record_device_fingerprint', {
    p_fingerprint_hash: fingerprint,
    p_ip_hash: ipHash,
  })
}
