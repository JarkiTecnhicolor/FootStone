import { motion } from 'motion/react'
import type { RelRect } from './layer'
import { rectCenter } from './layer'

interface Props {
  from: RelRect
  to: RelRect
  tone: 'attack' | 'sniper'
  containerWidth: number
  containerHeight: number
}

export function AttackArc({ from, to, tone, containerWidth, containerHeight }: Props) {
  const a = rectCenter(from)
  const b = rectCenter(to)
  const midX = (a.x + b.x) / 2
  const midY = (a.y + b.y) / 2 - Math.min(120, Math.abs(b.y - a.y) * 0.5 + 30)
  const stroke = tone === 'sniper' ? '#fb7185' : '#fde047'
  const glow = tone === 'sniper' ? 'rgba(244,63,94,0.95)' : 'rgba(253,224,71,0.95)'

  return (
    <motion.svg
      className="pointer-events-none absolute inset-0"
      width={containerWidth}
      height={containerHeight}
      viewBox={`0 0 ${containerWidth} ${containerHeight}`}
      initial={{ opacity: 0 }}
      animate={{ opacity: [0, 1, 1, 0] }}
      transition={{ duration: 0.55, times: [0, 0.15, 0.7, 1], ease: 'easeOut' }}
      style={{ filter: `drop-shadow(0 0 6px ${glow})` }}
    >
      <motion.path
        d={`M ${a.x} ${a.y} Q ${midX} ${midY} ${b.x} ${b.y}`}
        fill="none"
        stroke={stroke}
        strokeWidth={3}
        strokeLinecap="round"
        strokeDasharray="240"
        initial={{ strokeDashoffset: 240 }}
        animate={{ strokeDashoffset: 0 }}
        transition={{ duration: 0.32, ease: 'easeOut' }}
      />
      <motion.circle
        r={6}
        fill={stroke}
        initial={{ cx: a.x, cy: a.y, opacity: 1 }}
        animate={{ cx: b.x, cy: b.y, opacity: [1, 1, 0] }}
        transition={{ duration: 0.4, ease: 'easeOut', times: [0, 0.85, 1] }}
      />
    </motion.svg>
  )
}
