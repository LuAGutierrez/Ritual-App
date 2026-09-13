import { describe, expect, it } from 'vitest'
import { isReminderHour } from '@/lib/push/notify'

const ART = 'America/Argentina/Buenos_Aires'

describe('isReminderHour', () => {
  it('es true cuando la hora local coincide', () => {
    // 20:00 ART = 23:00 UTC
    const now = new Date('2026-09-09T23:00:00.000Z')
    expect(isReminderHour('20:00:00', ART, now)).toBe(true)
  })

  it('es false cuando la hora local no coincide', () => {
    const now = new Date('2026-09-09T23:00:00.000Z')
    expect(isReminderHour('21:00:00', ART, now)).toBe(false)
  })
})
