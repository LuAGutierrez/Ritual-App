'use client'

import { motion } from 'framer-motion'

type Props = {
  partnerName?: string | null
  myResponse: string
}

export default function WaitingState({ partnerName, myResponse }: Props) {
  return (
    <div className="flex flex-col items-center text-center space-y-8">
      {/* Indicador de espera */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="relative"
      >
        <div className="w-20 h-20 rounded-full bg-ritual-gold/10 border border-ritual-gold/20 flex items-center justify-center">
          <motion.div
            animate={{ opacity: [0.4, 1, 0.4] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            className="w-3 h-3 bg-ritual-gold rounded-full"
          />
        </div>

        {/* Pulso exterior */}
        <motion.div
          animate={{ scale: [1, 1.3, 1], opacity: [0.3, 0, 0.3] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute inset-0 rounded-full border border-ritual-gold/30"
        />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.5 }}
      >
        <p className="text-ritual-cream font-body text-lg leading-snug">
          {partnerName
            ? `${partnerName} aún no respondió`
            : 'Tu pareja aún no respondió'}
        </p>
        <p className="text-ritual-muted font-body text-sm mt-2">
          El reveal aparecerá cuando ambos completen
        </p>
      </motion.div>

      {/* Tu respuesta mientras esperas */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.5 }}
        className="w-full max-w-sm bg-ritual-bg-soft border border-white/8 rounded-2xl p-5 text-left"
      >
        <p className="text-ritual-muted text-xs font-body mb-2 uppercase tracking-widest">
          Tu respuesta
        </p>
        <p className="text-ritual-cream font-body text-sm leading-relaxed italic">
          &ldquo;{myResponse}&rdquo;
        </p>
      </motion.div>
    </div>
  )
}
