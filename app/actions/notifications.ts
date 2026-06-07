'use server'

import { createClient } from '@/lib/supabase/server'
import type { NotificationPrefs } from '@/types'

const DEFAULT_PREFS: Omit<NotificationPrefs, 'user_id'> = {
  push_enabled: false,
  partner_responded: true,
  daily_reminder: true,
  reminder_time: '20:00:00',
  timezone: 'America/Argentina/Buenos_Aires',
}

export async function getNotificationPrefsAction(): Promise<NotificationPrefs | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data } = await supabase
    .from('notification_prefs')
    .select('*')
    .eq('user_id', user.id)
    .single()

  if (data) return data as NotificationPrefs

  const { data: created } = await supabase
    .from('notification_prefs')
    .insert({ user_id: user.id, ...DEFAULT_PREFS })
    .select()
    .single()

  return created as NotificationPrefs | null
}

export async function updateNotificationPrefsAction(
  prefs: Pick<NotificationPrefs, 'partner_responded' | 'daily_reminder' | 'reminder_time' | 'timezone'>
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'No autenticado' }

  const { error } = await supabase
    .from('notification_prefs')
    .upsert({
      user_id: user.id,
      ...prefs,
      updated_at: new Date().toISOString(),
    })

  if (error) return { ok: false, error: error.message }
  return { ok: true }
}

export async function setPushEnabledAction(enabled: boolean): Promise<{ ok: boolean }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false }

  await supabase
    .from('notification_prefs')
    .upsert({
      user_id: user.id,
      push_enabled: enabled,
      updated_at: new Date().toISOString(),
    })

  return { ok: true }
}
