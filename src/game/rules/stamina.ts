import type { MidfielderCard } from '../types'

export interface DecayResult {
  remaining: MidfielderCard[]
  toDiscard: MidfielderCard[]
}

export function decayMids(
  mids: readonly MidfielderCard[],
  currentTurn: number,
): DecayResult {
  const decayed = mids.map(m =>
    (m.turnPlaced ?? -Infinity) < currentTurn
      ? { ...m, stamina: m.stamina - 1 }
      : m,
  )
  const remaining = decayed.filter(m => m.stamina > 0)
  const expired = decayed.filter(m => m.stamina <= 0)
  const toDiscard = expired.map(m => ({ ...m, stamina: m.maxStamina }))
  return { remaining, toDiscard }
}
