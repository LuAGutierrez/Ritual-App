'use client'

import { motion } from 'framer-motion'
import type { Ritual } from '@/types'

const CATEGORY_LABELS: Record<string, string> = {
  conexion: 'Conexión',
  diversion: 'Diversión',
  intimidad: 'Intimidad',
  reto: 'Reto',
  viajes: 'Viajes',
  planes: 'Planes',
  fantasias: 'Fantasías',
}

const CATEGORY_COLORS: Record<string, string> = {
  conexion: 'text-ritual-gold',
  diversion: 'text-ritual-cream',
  intimidad: 'text-ritual-rose',
  reto: 'text-ritual-terra',
  viajes: 'text-ritual-gold',
  planes: 'text-ritual-cream',
  fantasias: 'text-ritual-rose',
}

type Props = {
  ritual: Ritual
  response: string
  onResponseChange: (v: string) => void
  onSubmit: () => void
  loading?: boolean
}

export default function RitualCard({
  ritual,
  response,
  onResponseChange,
  onSubmit,
  loading,
}: Props) {
  const categoryLabel = CATEGORY_LABELS[ritual.category] ?? ritual.category
  const categoryColor = CATEGORY_COLORS[ritual.category] ?? 'text-ritual-muted'

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: 'easeOut' }}
      className="flex flex-col w-full space-y-6"
    >
      {/* Categoría */}
      <div className="text-center">
        <span className={`font-body text-xs uppercase tracking-widest ${categoryColor}`}>
          {categoryLabel}
        </span>
        {ritual.premium && (
          <span className="ml-2 font-body text-[10px] uppercase tracking-widest text-ritual-gold/70">
            ✦ Premium
          </span>
        )}
      </div>

      {/* Prompt del ritual */}
      <div className="bg-ritual-bg-soft border border-white/8 rounded-3xl px-6 py-8 text-center">
        <p className="font-display text-2xl text-ritual-cream leading-snug tracking-wide">
          {ritual.prompt}
        </p>

        {ritual.challenge && (
          <div className="mt-6 pt-5 border-t border-white/8">
            <p className="text-ritual-muted font-body text-xs uppercase tracking-widest mb-2">
              Reto
            </p>
            <p className="text-ritual-cream/80 font-body text-sm leading-relaxed">
              {ritual.challenge}
            </p>
          </div>
        )}
      </div>

      {/* Campo de respuesta */}
      <div>
        <textarea
          value={response}
          onChange={e => onResponseChange(e.target.value)}
          placeholder="Escribí tu respuesta..."
          rows={4}
          className="w-full bg-ritual-bg-soft border border-white/10 rounded-2xl px-5 py-4 text-ritual-text placeholder-ritual-muted/40 font-body text-sm resize-none focus:outline-none focus:border-ritual-gold/40 transition-colors leading-relaxed"
        />
        <p className="text-ritual-muted/50 text-xs font-body mt-2 text-right">
          {response.length > 0 && `${response.length} caracteres`}
        </p>
      </div>

      {/* Botón */}
      <button
        onClick={onSubmit}
        disabled={!response.trim() || loading}
        className="w-full bg-ritual-gold text-ritual-bg font-body font-medium py-4 rounded-2xl transition-all duration-300 hover:bg-ritual-cream active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {loading ? 'Enviando...' : 'Enviar mi respuesta'}
      </button>

      <p className="text-ritual-muted/60 font-body text-xs text-center leading-relaxed">
        Tu respuesta se revela cuando tu pareja también complete el ritual
      </p>
    </motion.div>
  )
}
