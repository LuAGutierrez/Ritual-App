'use client'

type Props = {
  confirmar: boolean
  loading: boolean
  onAbrir: () => void
  onCancelar: () => void
  onConfirmar: () => void
}

// Botón + confirmación de dos pasos para vincular pareja en el mismo
// dispositivo: cierra la sesión de quien creó la pareja y manda a la
// pareja a registrarse/entrar ahí mismo, en vez de compartir el link por
// otro medio. Usado en /onboarding y en las dos pantallas de espera de
// /ritual (recién creada la pareja, y al volver otro día sin que nadie
// se haya unido todavía).
export default function VincularAhoraMismoTelefono({ confirmar, loading, onAbrir, onCancelar, onConfirmar }: Props) {
  if (!confirmar) {
    return (
      <button
        onClick={onAbrir}
        className="w-full text-ritual-muted/70 font-body text-xs py-2 hover:text-ritual-text transition-colors"
      >
        📱 Vincular ahora, en este mismo teléfono
      </button>
    )
  }

  return (
    <div className="bg-ritual-gold/5 border border-ritual-gold/20 rounded-2xl p-5 text-center space-y-3">
      <p className="font-body text-sm text-ritual-text leading-relaxed">
        Le pasás el teléfono a tu pareja: crea su cuenta (o inicia sesión) acá mismo
        y quedan vinculados al toque. Vos vas a tener que volver a entrar con la tuya después.
      </p>
      <div className="flex gap-3">
        <button
          onClick={onCancelar}
          disabled={loading}
          className="flex-1 bg-transparent border border-white/10 text-ritual-muted font-body text-sm py-3.5 rounded-2xl hover:border-white/20 hover:text-ritual-text transition-all duration-300 disabled:opacity-50"
        >
          Cancelar
        </button>
        <button
          onClick={onConfirmar}
          disabled={loading}
          className="flex-1 bg-ritual-gold text-ritual-bg font-body text-sm font-medium py-3.5 rounded-2xl hover:bg-ritual-cream transition-all duration-300 disabled:opacity-50"
        >
          {loading ? 'Un momento...' : 'Pasar el teléfono'}
        </button>
      </div>
    </div>
  )
}
