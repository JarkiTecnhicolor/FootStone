import { motion } from 'motion/react'
import type { RelRect } from './layer'

export type FloaterTone = 'damage' | 'heal' | 'save' | 'goal' | 'strip' | 'sniper' | 'info'

const TONE_CLS: Record<FloaterTone, string> = {
  damage: 'text-red-400 [text-shadow:0_2px_8px_rgba(0,0,0,0.85)]',
  heal: 'text-emerald-300 [text-shadow:0_2px_8px_rgba(0,0,0,0.85)]',
  save: 'text-sky-200 [text-shadow:0_2px_10px_rgba(0,0,0,0.9)]',
  goal: 'text-yellow-300 [text-shadow:0_2px_10px_rgba(0,0,0,0.95)]',
  strip: 'text-fuchsia-300 [text-shadow:0_2px_8px_rgba(0,0,0,0.85)]',
  sniper: 'text-rose-400 [text-shadow:0_2px_10px_rgba(0,0,0,0.95)]',
  info: 'text-stone-100 [text-shadow:0_2px_8px_rgba(0,0,0,0.8)]',
}

interface Props {
  rect: RelRect
  text: string
  tone: FloaterTone
  size?: 'sm' | 'lg'
  offsetY?: number
}

export function Floater({ rect, text, tone, size = 'lg', offsetY = 0 }: Props) {
  const cx = rect.x + rect.width / 2
  const cy = rect.y + rect.height / 2 + offsetY
  const fontSize = size === 'lg' ? 'text-2xl' : 'text-base'
  return (
    <motion.div
      className={`pointer-events-none absolute font-extrabold ${fontSize} ${TONE_CLS[tone]}`}
      style={{ left: cx, top: cy, translateX: '-50%', translateY: '-50%' }}
      initial={{ opacity: 0, scale: 0.5, y: 0 }}
      animate={{ opacity: [0, 1, 1, 0], scale: [0.5, 1.25, 1.1, 1], y: [-2, -22, -34, -44] }}
      transition={{ duration: 0.95, ease: 'easeOut', times: [0, 0.18, 0.55, 1] }}
    >
      {text}
    </motion.div>
  )
}
