import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const body = await request.json()
  const { endpoint, keys } = body

  if (!endpoint || !keys?.p256dh || !keys?.auth) {
    return NextResponse.json({ error: 'Subscription inválida' }, { status: 400 })
  }

  // Borrar subs viejas de este dispositivo y guardar la nueva
  await supabase.from('push_subscriptions').delete().eq('user_id', user.id)

  const { error: subError } = await supabase.from('push_subscriptions').insert({
    user_id: user.id,
    endpoint,
    p256dh: keys.p256dh,
    auth: keys.auth,
    user_agent: request.headers.get('user-agent'),
  })

  if (subError) return NextResponse.json({ error: subError.message }, { status: 500 })

  const { error: prefError } = await supabase
    .from('notification_prefs')
    .update({ push_enabled: true, updated_at: new Date().toISOString() })
    .eq('user_id', user.id)

  if (prefError) return NextResponse.json({ error: prefError.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
