import { motion } from 'motion/react'
import type { RelRect } from './layer'

export type ImpactTone = 'damage' | 'heal' | 'save' | 'sniper'

const TONE: Record<ImpactTone, { ring: string; bg: string }> = {
  damage: { ring: 'rgba(239,68,68,0.9)', bg: 'rgba(239,68,68,0.35)' },
  heal: { ring: 'rgba(16,185,129,0.85)', bg: 'rgba(16,185,129,0.3)' },
  save: { ring: 'rgba(56,189,248,0.85)', bg: 'rgba(56,189,248,0.25)' },
  sniper: { ring: 'rgba(244,63,94,0.95)', bg: 'rgba(244,63,94,0.4)' },
}

interface Props {
  rect: RelRect
  tone: ImpactTone
}

export function CardImpact({ rect, tone }: Props) {
  const t = TONE[tone]
  return (
    <motion.div
      className="pointer-events-none absolute rounded-lg"
      style={{
        left: rect.x - 2,
        top: rect.y - 2,
        width: rect.width + 4,
        height: rect.height + 4,
      }}
      initial={{ opacity: 0, scale: 0.92, x: 0 }}
      animate={{
        opacity: [0, 1, 0.8, 0],
        scale: [0.92, 1.05, 1, 1],
        x: tone === 'damage' || tone === 'sniper' ? [0, -4, 5, -3, 2, 0] : 0,
        backgroundColor: [t.bg, t.bg, 'rgba(0,0,0,0)', 'rgba(0,0,0,0)'],
        boxShadow: [
          `inset 0 0 0 0 ${t.ring}, 0 0 0 0 ${t.ring}`,
          `inset 0 0 18px 4px ${t.ring}, 0 0 14px 2px ${t.ring}`,
          `inset 0 0 8px 2px ${t.ring}, 0 0 6px 1px ${t.ring}`,
          `inset 0 0 0 0 ${t.ring}, 0 0 0 0 ${t.ring}`,
        ],
      }}
      transition={{ duration: 0.55, ease: 'easeOut', times: [0, 0.15, 0.5, 1] }}
    />
  )
}
