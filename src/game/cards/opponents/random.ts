import type { Card, Keeper, OpponentDeck } from '../../types'
import { cloneCard, shuffle } from '../../lib'

export function makeRandomOpponent(
  cardPool: readonly Card[],
  keeperPool: readonly Keeper[],
  cardCount: number = 12,
): OpponentDeck {
  const cards = shuffle(cardPool).slice(0, cardCount).map(cloneCard)
  return {
    id: 'random',
    name: 'Випадкова команда',
    cards,
    keepers: keeperPool.slice(),
  }
}
