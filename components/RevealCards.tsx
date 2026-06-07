'use client'

import { motion } from 'framer-motion'
import type { CoupleRitualSession, Streak } from '@/types'
import StreakBadge from './StreakBadge'

type Props = {
  session: CoupleRitualSession
  myUserId: string
  myName?: string | null
  partnerName?: string | null
  streak: Streak | null
  onContinue: () => void
}

export default function RevealCards({
  session,
  myUserId,
  myName,
  partnerName,
  streak,
  onContinue,
}: Props) {
  const isUser1 = session.user1_id === myUserId
  const myResponse = isUser1 ? session.user1_response : session.user2_response
  const partnerResponse = isUser1 ? session.user2_response : session.user1_response

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.3, delayChildren: 0.2 },
    },
  }

  const cardVariants = {
    hidden: { opacity: 0, y: 32, scale: 0.95 },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] },
    },
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="flex flex-col items-center space-y-6 w-full"
    >
      {/* Encabezado del reveal */}
      <motion.div variants={cardVariants} className="text-center">
        <motion.div
          animate={{ scale: [0.8, 1.1, 1] }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className="text-3xl mb-4"
        >
          ✦
        </motion.div>
        <p className="text-ritual-muted font-body text-sm uppercase tracking-widest">
          Ritual completado
        </p>
      </motion.div>

      {/* Streak badge */}
      {streak && streak.current_streak > 0 && (
        <motion.div variants={cardVariants} className="w-full flex justify-center">
          <StreakBadge streak={streak} partnerName={partnerName} />
        </motion.div>
      )}

      {/* Card: Mi respuesta */}
      <motion.div
        variants={cardVariants}
        className="w-full bg-ritual-bg-soft border border-white/8 rounded-2xl p-6"
      >
        <p className="text-ritual-gold text-xs font-body uppercase tracking-widest mb-3">
          {myName || 'Vos'}
        </p>
        <p className="text-ritual-cream font-body text-base leading-relaxed italic">
          &ldquo;{myResponse}&rdquo;
        </p>
      </motion.div>

      {/* Card: Respuesta de pareja */}
      <motion.div
        variants={cardVariants}
        className="w-full bg-ritual-bg-soft border border-ritual-gold/15 rounded-2xl p-6"
      >
        <p className="text-ritual-rose text-xs font-body uppercase tracking-widest mb-3">
          {partnerName || 'Tu pareja'}
        </p>
        <p className="text-ritual-cream font-body text-base leading-relaxed italic">
          &ldquo;{partnerResponse}&rdquo;
        </p>
      </motion.div>

      {/* CTA */}
      <motion.div variants={cardVariants} className="w-full pt-2">
        <button
          onClick={onContinue}
          className="w-full bg-white/5 border border-white/10 text-ritual-muted font-body text-sm py-4 rounded-2xl hover:border-white/20 hover:text-ritual-text transition-all duration-300"
        >
          Hasta mañana
        </button>
      </motion.div>
    </motion.div>
  )
}
