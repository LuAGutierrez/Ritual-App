'use client'

// Selector genérico de chips -- levantado de app/ritual-ia/page.tsx (era
// un componente local usado una sola vez) porque ahora lo necesitan
// también los 6 juegos para elegir intensidad por partida.
export default function ChipGroup<T extends string>({
  label,
  opciones,
  valor,
  onChange,
}: {
  label: string
  opciones: readonly T[]
  valor: T
  onChange: (v: T) => void
}) {
  return (
    <div className="space-y-2">
      <p className="text-ritual-muted text-[11px] font-body uppercase tracking-wider">{label}</p>
      <div className="flex flex-wrap gap-2">
        {opciones.map(op => (
          <button
            key={op}
            onClick={() => onChange(op)}
            className={`px-3.5 py-2 rounded-full border text-xs font-body transition-all ${
              valor === op
                ? 'bg-ritual-gold text-ritual-bg border-ritual-gold'
                : 'bg-ritual-bg-soft border-white/10 text-ritual-muted hover:border-white/20'
            }`}
          >
            {op}
          </button>
        ))}
      </div>
    </div>
  )
}
