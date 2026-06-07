'use client'

type Props = {
  partnerName?: string | null
  onDismiss: () => void
}

export default function PartnerRespondedBanner({ partnerName, onDismiss }: Props) {
  const name = partnerName?.trim() || 'Tu pareja'

  return (
    <div className="bg-ritual-gold/8 border border-ritual-gold/20 rounded-2xl px-4 py-3 mb-5 flex items-center justify-between gap-3 animate-fade-up">
      <p className="text-ritual-cream font-body text-sm">
        <span className="text-ritual-gold mr-1">✦</span>
        {name} ya respondió. ¿Y vos?
      </p>
      <button
        type="button"
        onClick={onDismiss}
        className="text-ritual-muted text-xs font-body shrink-0 hover:text-ritual-text transition-colors"
        aria-label="Cerrar"
      >
        ✕
      </button>
    </div>
  )
}
