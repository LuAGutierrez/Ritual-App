export const ART_TZ = 'America/Argentina/Buenos_Aires'

// El "día" del ritual y de la racha corta a medianoche en Argentina, no en UTC —
// evita que el corte de día ocurra a las 21:00 ART (justo la franja "antes de dormir").
export function todayInArgentina(now: Date = new Date()): string {
  return now.toLocaleDateString('en-CA', { timeZone: ART_TZ })
}

export function addDaysToDateStr(dateStr: string, delta: number): string {
  const [year, month, day] = dateStr.split('-').map(Number)
  const d = new Date(Date.UTC(year, month - 1, day))
  d.setUTCDate(d.getUTCDate() + delta)
  return d.toISOString().split('T')[0]
}
