import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { isReminderHour } from '@/lib/push/notify'
import { alreadyNotifiedToday, logNotification, sendPushToUser } from '@/lib/push/send'

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const supabase = createServiceClient()
  if (!supabase) return NextResponse.json({ error: 'Service client no configurado' }, { status: 500 })

  const today = new Date().toISOString().split('T')[0]

  const { data: prefsList } = await supabase
    .from('notification_prefs')
    .select('user_id, reminder_time, timezone')
    .eq('push_enabled', true)
    .eq('daily_reminder', true)

  let sent = 0

  for (const prefs of prefsList ?? []) {
    if (!isReminderHour(prefs.reminder_time, prefs.timezone)) continue
    if (await alreadyNotifiedToday(prefs.user_id, 'daily_reminder')) continue

    const { data: membership } = await supabase
      .from('couple_members')
      .select('couple_id')
      .eq('user_id', prefs.user_id)
      .single()

    if (!membership) continue

    const { data: session } = await supabase
      .from('couple_ritual_sessions')
      .select('revealed_at')
      .eq('couple_id', membership.couple_id)
      .eq('session_date', today)
      .single()

    if (session?.revealed_at) continue

    const ok = await sendPushToUser(prefs.user_id, {
      title: 'Rituales',
      body: 'El ritual de hoy los espera.',
      url: '/ritual',
    })

    if (ok) {
      await logNotification(prefs.user_id, 'daily_reminder')
      sent++
    }
  }

  return NextResponse.json({ ok: true, sent })
}
