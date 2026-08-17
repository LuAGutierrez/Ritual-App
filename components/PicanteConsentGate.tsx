'use client'

type Props = {
  onConfirmar: () => void
  onCancelar: () => void
}

export default function PicanteConsentGate({ onConfirmar, onCancelar }: Props) {
  return (
    <div className="bg-[#D4A5A5]/8 border border-[#D4A5A5]/25 rounded-2xl p-5 text-center space-y-3 animate-fade-up">
      <p className="text-2xl">🔥</p>
      <p className="font-display text-lg text-ritual-cream">
        Contenido +18
      </p>
      <p className="text-ritual-muted font-body text-sm leading-relaxed">
        Esta sección tiene consignas íntimas y sugerentes. ¿Confirman que quieren habilitarla para la pareja?
      </p>
      <div className="flex gap-3">
        <button
          onClick={onCancelar}
          className="flex-1 bg-transparent border border-white/10 text-ritual-muted font-body text-sm py-3.5 rounded-2xl hover:border-white/20 hover:text-ritual-text transition-all duration-300"
        >
          Todavía no
        </button>
        <button
          onClick={onConfirmar}
          className="flex-1 bg-[#D4A5A5] text-ritual-bg font-body font-medium text-sm py-3.5 rounded-2xl hover:opacity-90 transition-all duration-300"
        >
          Sí, habilitar
        </button>
      </div>
    </div>
  )
}
