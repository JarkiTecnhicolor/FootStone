import { useMemo } from 'react'
import { motion } from 'motion/react'

const COLORS = ['#fbbf24', '#10b981', '#3b82f6', '#ef4444', '#a855f7', '#f97316', '#22d3ee']

interface Particle {
  id: number
  dx: number
  dy: number
  rot: number
  color: string
  size: number
  delay: number
}

interface Props {
  count?: number
  durationMs?: number
}

export function ConfettiBurst({ count = 48, durationMs = 1500 }: Props) {
  const particles = useMemo<Particle[]>(() => {
    return Array.from({ length: count }, (_, i) => ({
      id: i,
      dx: (Math.random() - 0.5) * 720,
      dy: -Math.random() * 360 - 60,
      rot: (Math.random() - 0.5) * 720,
      color: COLORS[i % COLORS.length],
      size: 6 + Math.random() * 8,
      delay: Math.random() * 0.08,
    }))
  }, [count])

  const duration = durationMs / 1000

  return (
    <div className="pointer-events-none absolute inset-0 z-30 overflow-hidden">
      {particles.map(p => (
        <motion.div
          key={p.id}
          className="absolute left-1/2 top-1/2 rounded-sm"
          style={{
            backgroundColor: p.color,
            width: p.size,
            height: p.size * 0.55,
          }}
          initial={{ x: 0, y: 0, opacity: 1, rotate: 0 }}
          animate={{
            x: p.dx,
            y: [p.dy, p.dy * 0.4, 320],
            opacity: [1, 1, 0],
            rotate: p.rot,
          }}
          transition={{
            duration,
            delay: p.delay,
            ease: [0.18, 0.62, 0.4, 1],
            times: [0, 0.4, 1],
          }}
        />
      ))}
    </div>
  )
}
