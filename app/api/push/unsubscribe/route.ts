import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function DELETE(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const { endpoint } = await request.json()
  if (!endpoint) return NextResponse.json({ error: 'Endpoint requerido' }, { status: 400 })

  await supabase
    .from('push_subscriptions')
    .delete()
    .eq('user_id', user.id)
    .eq('endpoint', endpoint)

  const { data: remaining } = await supabase
    .from('push_subscriptions')
    .select('id')
    .eq('user_id', user.id)
    .limit(1)

  if (!remaining?.length) {
    await supabase.from('notification_prefs').upsert({
      user_id: user.id,
      push_enabled: false,
      updated_at: new Date().toISOString(),
    })
  }

  return NextResponse.json({ ok: true })
}
