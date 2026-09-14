import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getMyCreditsAction, type CreditsBalance } from '@/app/actions/credits'

// Distintas instancias de este hook (ej: el header con CreditsBadge y
// el formulario de generación en la misma página) no comparten estado
// de React -- este evento es el pegamento minimo para que gastar
// créditos en una refresque el número en todas, sin meter un Context
// Provider solo para esto.
const CREDITS_CHANGED_EVENT = 'rituales:credits-changed'

export function notifyCreditsChanged() {
  window.dispatchEvent(new Event(CREDITS_CHANGED_EVENT))
}

// Trae el balance inicial por server action y lo mantiene sincronizado
// en vivo si la pareja ya está vinculada (Realtime sobre couple_credits,
// mismo patrón que la suscripción de couple_ritual_sessions en
// app/ritual/page.tsx). En modo solo no hay Realtime (no hay a quién
// sincronizarle) -- ahí el refresco depende del evento de arriba.
export function useCredits() {
  const [credits, setCredits] = useState<CreditsBalance | null>(null)
  const [loading, setLoading] = useState(true)
  const channelRef = useRef<ReturnType<ReturnType<typeof createClient>['channel']> | null>(null)

  async function refetch() {
    const data = await getMyCreditsAction()
    setCredits(data)
    return data
  }

  useEffect(() => {
    const supabase = createClient()
    let cancelled = false

    window.addEventListener(CREDITS_CHANGED_EVENT, refetch)

    refetch().then(data => {
      if (cancelled) return
      setLoading(false)

      if (data?.mode !== 'pareja') return

      supabase
        .from('couple_members')
        .select('couple_id')
        .then(({ data: memberships }) => {
          const coupleId = memberships?.[0]?.couple_id
          if (!coupleId || cancelled) return

          const channel = supabase
            .channel(`couple_credits:${coupleId}`)
            .on(
              'postgres_changes',
              { event: 'UPDATE', schema: 'public', table: 'couple_credits', filter: `couple_id=eq.${coupleId}` },
              () => {
                refetch()
              }
            )
            .subscribe()

          channelRef.current = channel
        })
    })

    return () => {
      cancelled = true
      window.removeEventListener(CREDITS_CHANGED_EVENT, refetch)
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return { credits, loading, refetch }
}
