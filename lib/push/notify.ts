import { createServiceClient } from '@/lib/supabase/service'
import { alreadyNotifiedToday, logNotification, sendPushToUser } from '@/lib/push/send'

export async function notifyPartnerResponded(
  partnerId: string,
  responderName: string | null
) {
  const supabase = createServiceClient()
  if (!supabase) return

  const { data: prefs } = await supabase
    .from('notification_prefs')
    .select('push_enabled, partner_responded')
    .eq('user_id', partnerId)
    .single()

  if (!prefs?.push_enabled || !prefs.partner_responded) return
  if (await alreadyNotifiedToday(partnerId, 'partner_responded')) return

  const name = responderName?.trim() || 'Tu pareja'
  const sent = await sendPushToUser(partnerId, {
    title: 'Rituales',
    body: `${name} ya respondió. ¿Y vos?`,
    url: '/ritual',
  })

  if (sent) await logNotification(partnerId, 'partner_responded')
}

export function isReminderHour(reminderTime: string, timezone: string): boolean {
  const hourStr = reminderTime.slice(0, 2)
  const targetHour = parseInt(hourStr, 10)

  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    hour: 'numeric',
    hour12: false,
  })
  const currentHour = parseInt(formatter.format(new Date()), 10)
  return currentHour === targetHour
}
