import { AnimatePresence, motion } from 'motion/react'

export type KillfeedTone = 'attack' | 'goal' | 'save' | 'sniper' | 'info'

export interface KillfeedItem {
  id: number
  text: string
  tone: KillfeedTone
}

const TONE_CLS: Record<KillfeedTone, string> = {
  attack: 'bg-stone-900/85 text-stone-50 border-stone-600/60',
  goal: 'bg-emerald-700/90 text-white border-emerald-300',
  save: 'bg-sky-700/90 text-white border-sky-300',
  sniper: 'bg-rose-700/90 text-white border-rose-300',
  info: 'bg-stone-800/80 text-stone-100 border-stone-500/60',
}

interface Props {
  items: KillfeedItem[]
}

export function Killfeed({ items }: Props) {
  if (items.length === 0) return null
  return (
    <div className="pointer-events-none absolute left-1/2 top-2 z-30 flex w-[min(92%,360px)] -translate-x-1/2 flex-col items-center gap-1">
      <AnimatePresence initial={false}>
        {items.map(item => (
          <motion.div
            key={item.id}
            layout
            initial={{ opacity: 0, y: -6, scale: 0.92 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.95, transition: { duration: 0.25 } }}
            transition={{ type: 'spring', stiffness: 280, damping: 26 }}
            className={`max-w-full truncate rounded-md border px-2.5 py-1 text-[11px] font-medium shadow-md backdrop-blur-sm ${TONE_CLS[item.tone]}`}
          >
            {item.text}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}
