import webpush from 'web-push'
import { createServiceClient } from '@/lib/supabase/service'
import { configureWebPush } from '@/lib/push/vapid'

export type PushPayload = {
  title: string
  body: string
  url?: string
}

export async function sendPushToUser(
  userId: string,
  payload: PushPayload
): Promise<boolean> {
  if (!configureWebPush()) return false

  const supabase = createServiceClient()
  if (!supabase) return false

  const { data: subs } = await supabase
    .from('push_subscriptions')
    .select('id, endpoint, p256dh, auth')
    .eq('user_id', userId)

  if (!subs?.length) return false

  let sent = false
  const body = JSON.stringify(payload)

  for (const sub of subs) {
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        body
      )
      sent = true
    } catch (err: unknown) {
      const status = (err as { statusCode?: number }).statusCode
      if (status === 404 || status === 410) {
        await supabase.from('push_subscriptions').delete().eq('id', sub.id)
      }
    }
  }

  return sent
}

export async function alreadyNotifiedToday(
  userId: string,
  type: string
): Promise<boolean> {
  const supabase = createServiceClient()
  if (!supabase) return true

  const startOfDay = new Date()
  startOfDay.setUTCHours(0, 0, 0, 0)

  const { data } = await supabase
    .from('notification_log')
    .select('id')
    .eq('user_id', userId)
    .eq('type', type)
    .gte('sent_at', startOfDay.toISOString())
    .limit(1)

  return (data?.length ?? 0) > 0
}

export async function logNotification(userId: string, type: string) {
  const supabase = createServiceClient()
  if (!supabase) return
  await supabase.from('notification_log').insert({ user_id: userId, type })
}
