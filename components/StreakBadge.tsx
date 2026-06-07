'use client'

import { motion } from 'framer-motion'
import type { Streak } from '@/types'

type Props = {
  streak: Streak | null
  partnerName?: string | null
}

const MILESTONES = [7, 14, 30, 60, 100]

function isMilestone(n: number) {
  return MILESTONES.includes(n)
}

export default function StreakBadge({ streak, partnerName }: Props) {
  const current = streak?.current_streak ?? 0

  if (current === 0) return null

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className="flex items-center justify-center gap-2"
    >
      <div
        className={`flex items-center gap-2 px-4 py-2 rounded-full border transition-all duration-500 ${
          isMilestone(current)
            ? 'bg-ritual-gold/15 border-ritual-gold/40'
            : 'bg-white/5 border-white/10'
        }`}
      >
        {isMilestone(current) ? (
          <motion.span
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            className="text-base"
          >
            ✦
          </motion.span>
        ) : (
          <span className="text-ritual-muted text-sm">○</span>
        )}

        <span
          className={`font-body font-medium text-sm ${
            isMilestone(current) ? 'text-ritual-gold' : 'text-ritual-muted'
          }`}
        >
          {current} {current === 1 ? 'día' : 'días'}
          {partnerName ? ` con ${partnerName}` : ' juntos'}
        </span>
      </div>
    </motion.div>
  )
}
