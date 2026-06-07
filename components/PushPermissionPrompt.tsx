'use client'

import { dismissPushPrompt } from '@/lib/push/client'

type Props = {
  partnerName?: string | null
  loading: boolean
  onActivate: () => void
  onDismiss: () => void
}

export default function PushPermissionPrompt({
  partnerName,
  loading,
  onActivate,
  onDismiss,
}: Props) {
  const name = partnerName?.trim() || 'tu pareja'

  function handleLater() {
    dismissPushPrompt()
    onDismiss()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-5 bg-black/50">
      <div className="w-full max-w-sm bg-ritual-bg-soft border border-white/10 rounded-3xl p-6 animate-fade-up">
        <p className="text-ritual-gold text-center text-2xl mb-3">✦</p>
        <h2 className="font-display text-xl text-ritual-cream text-center mb-2">
          ¿Querés que te avisemos?
        </h2>
        <p className="text-ritual-muted font-body text-sm text-center leading-relaxed mb-6">
          Te escribimos solo cuando {name} responda o si se les pasó el ritual del día.
        </p>
        <div className="space-y-2">
          <button
            type="button"
            onClick={onActivate}
            disabled={loading}
            className="w-full bg-ritual-gold text-ritual-bg font-body font-medium py-4 rounded-2xl disabled:opacity-40"
          >
            {loading ? 'Activando...' : 'Activar avisos'}
          </button>
          <button
            type="button"
            onClick={handleLater}
            className="w-full text-ritual-muted font-body text-sm py-3 hover:text-ritual-text transition-colors"
          >
            Ahora no
          </button>
        </div>
      </div>
    </div>
  )
}
