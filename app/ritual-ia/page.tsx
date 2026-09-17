'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import BottomNav from '@/components/BottomNav'
import CreditsBadge from '@/components/CreditsBadge'
import PageLoader from '@/components/PageLoader'
import { generarConIAAction } from '@/app/actions/ritual-ia'
import { useCredits, notifyCreditsChanged } from '@/hooks/useCredits'
import { CREDIT_FEATURES, type GenericCreditFeature } from '@/lib/credits'
import type { IAGeneratedContent } from '@/lib/ai/parse-generated-content'

const ANIMOS = ['Cansados', 'Con ganas', 'Jugando', 'Relajados'] as const
const TIEMPOS = ['5m', '15m', '30m+'] as const
const OBJETIVOS = ['Risas', 'Conexión', 'Deseo', 'Sorpresa'] as const

const ETIQUETA_ITEM: Record<GenericCreditFeature, string> = {
  ritual_simple: 'Paso',
  ritual_profundo: 'Paso',
  dinamica_ia: 'Pregunta',
}

export default function RitualIAPage() {
  const router = useRouter()
  const { credits, loading, refetch } = useCredits()
  const [feature, setFeature] = useState<GenericCreditFeature>('ritual_simple')
  const [animo, setAnimo] = useState<(typeof ANIMOS)[number]>('Con ganas')
  const [tiempo, setTiempo] = useState<(typeof TIEMPOS)[number]>('15m')
  const [objetivo, setObjetivo] = useState<(typeof OBJETIVOS)[number]>('Conexión')
  const [generando, setGenerando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [resultado, setResultado] = useState<IAGeneratedContent | null>(null)

  const featureDef = CREDIT_FEATURES.find(f => f.id === feature)!
  const saldoInsuficiente = !!credits && credits.total < featureDef.cost

  async function generar() {
    setGenerando(true)
    setError(null)
    setResultado(null)

    const res = await generarConIAAction(feature, {
      animo: animo.toLowerCase(),
      tiempoDisponible: tiempo,
      objetivo: objetivo.toLowerCase(),
    })

    setGenerando(false)

    if (!res.ok) {
      setError(
        res.error === 'insufficient_credits'
          ? 'No alcanzan los créditos para esto.'
          : res.error === 'not_authenticated'
            ? 'Iniciá sesión de nuevo para generar contenido.'
            : 'No se pudo generar. Probá de nuevo en un rato.'
      )
      return
    }

    setResultado(res.content)
    refetch()
    notifyCreditsChanged()
  }

  if (loading) return <PageLoader />

  return (
    <div className="min-h-dvh bg-ritual-bg flex flex-col">
      <header className="px-5 pt-8 pb-4 flex items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-xl text-ritual-cream tracking-wide">✨ Ritual con IA</h1>
          <p className="text-ritual-muted text-xs font-body mt-0.5">Generado al momento, a medida de hoy</p>
        </div>
        <div className="flex flex-col items-end gap-2 flex-shrink-0">
          <CreditsBadge />
          <button
            onClick={() => router.push('/juegos')}
            className="text-ritual-muted text-xs font-body hover:text-ritual-text transition-colors"
          >
            ← Juegos
          </button>
        </div>
      </header>

      <main className="flex-1 px-5 pb-28 max-w-md mx-auto w-full space-y-6">
        {!resultado && (
          <>
            <div className="space-y-2">
              <p className="text-ritual-muted text-[11px] font-body uppercase tracking-wider">Qué generar</p>
              <div className="space-y-2">
                {CREDIT_FEATURES.map(f => (
                  <button
                    key={f.id}
                    onClick={() => setFeature(f.id)}
                    className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl border text-left transition-all ${
                      feature === f.id
                        ? 'bg-ritual-gold/12 border-ritual-gold/40'
                        : 'bg-ritual-bg-soft border-white/8 hover:border-white/20'
                    }`}
                  >
                    <span className={`font-body text-sm ${feature === f.id ? 'text-ritual-gold' : 'text-ritual-cream'}`}>
                      {f.label}
                    </span>
                    <span className="text-ritual-muted text-xs font-body">{f.cost} créditos</span>
                  </button>
                ))}
              </div>
            </div>

            <ChipGroup label="Ánimo" opciones={ANIMOS} valor={animo} onChange={setAnimo} />
            <ChipGroup label="Tiempo" opciones={TIEMPOS} valor={tiempo} onChange={setTiempo} />
            <ChipGroup label="Objetivo" opciones={OBJETIVOS} valor={objetivo} onChange={setObjetivo} />

            <div className="space-y-2 pt-2">
              <button
                onClick={generar}
                disabled={generando || saldoInsuficiente}
                className="w-full bg-ritual-gold text-ritual-bg font-body font-medium text-sm py-4 rounded-2xl hover:bg-ritual-cream transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {generando ? 'Pensando...' : `Generar (${featureDef.cost} créditos)`}
              </button>
              {saldoInsuficiente && !generando && (
                <p className="text-ritual-muted text-xs font-body text-center">
                  Te faltan créditos.{' '}
                  <button onClick={() => router.push('/precios')} className="text-ritual-gold underline">
                    Comprar más
                  </button>
                </p>
              )}
              {error && <p className="text-ritual-muted text-xs font-body text-center">{error}</p>}
            </div>
          </>
        )}

        {resultado && (
          <div className="animate-fade-up space-y-5">
            <div className="bg-ritual-bg-soft border border-ritual-gold/25 rounded-3xl px-6 py-8 space-y-5">
              <p className="font-display text-2xl text-ritual-cream leading-snug text-center">{resultado.titulo}</p>
              <div className="space-y-3">
                {resultado.items.map((item, i) => (
                  <div key={i} className="flex gap-3">
                    <span className="text-ritual-gold text-xs font-body pt-0.5 flex-shrink-0">
                      {ETIQUETA_ITEM[feature]} {i + 1}
                    </span>
                    <p className="text-ritual-cream text-sm font-body leading-relaxed">{item}</p>
                  </div>
                ))}
              </div>
              <div className="border-t border-white/8 pt-4">
                <p className="text-ritual-muted text-xs font-body italic">{resultado.preguntaReflexion}</p>
              </div>
            </div>

            <button
              onClick={() => setResultado(null)}
              className="w-full bg-transparent border border-white/10 text-ritual-muted font-body text-sm py-4 rounded-2xl hover:border-white/20 hover:text-ritual-text transition-all"
            >
              Generar otro
            </button>
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  )
}

function ChipGroup<T extends string>({
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
