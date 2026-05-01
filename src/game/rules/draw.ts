import type { Card, MidfielderCard } from '../types'
import { BASE_DRAW, HAND_LIMIT } from '../../data/constants'
import { shuffle } from '../lib'

export function calcDrawCount(mids: readonly MidfielderCard[]): number {
  let total = BASE_DRAW
  for (const mid of mids) {
    for (const perk of mid.perks) {
      if (perk.trigger === 'aura' && perk.effect.kind === 'draw_bonus') {
        total += perk.effect.amount
      }
    }
  }
  return total
}

export interface DrawOneResult {
  hand: Card[]
  deck: Card[]
  discard: Card[]
  drawn: Card | null
  shuffled: boolean
  toDiscard: boolean
}

export function drawOne(
  hand: readonly Card[],
  deck: readonly Card[],
  discard: readonly Card[],
  random: () => number = Math.random,
): DrawOneResult {
  let workDeck: Card[] = deck.slice()
  let workDiscard: Card[] = discard.slice()
  let shuffled = false

  if (workDeck.length === 0) {
    if (workDiscard.length === 0) {
      return {
        hand: hand.slice(),
        deck: workDeck,
        discard: workDiscard,
        drawn: null,
        shuffled: false,
        toDiscard: false,
      }
    }
    workDeck = shuffle(workDiscard)
    workDiscard = []
    shuffled = true
  }

  const drawn = workDeck.shift()!
  const augmented = [...hand, drawn]

  if (augmented.length > HAND_LIMIT) {
    const burnIdx = Math.floor(random() * augmented.length)
    const burned = augmented[burnIdx]
    const finalHand = augmented.filter((_, i) => i !== burnIdx)
    return {
      hand: finalHand,
      deck: workDeck,
      discard: [...workDiscard, burned],
      drawn,
      shuffled,
      toDiscard: true,
    }
  }

  return {
    hand: augmented,
    deck: workDeck,
    discard: workDiscard,
    drawn,
    shuffled,
    toDiscard: false,
  }
}

export interface DrawNResult {
  hand: Card[]
  deck: Card[]
  discard: Card[]
  drawnCount: number
  burnedToDiscard: number
}

export function drawN(
  hand: readonly Card[],
  deck: readonly Card[],
  discard: readonly Card[],
  n: number,
): DrawNResult {
  let h: Card[] = hand.slice()
  let d: Card[] = deck.slice()
  let dc: Card[] = discard.slice()
  let drawnCount = 0
  let burnedToDiscard = 0

  for (let i = 0; i < n; i++) {
    const result = drawOne(h, d, dc)
    if (result.drawn === null) break
    h = result.hand
    d = result.deck
    dc = result.discard
    drawnCount++
    if (result.toDiscard) burnedToDiscard++
  }

  return { hand: h, deck: d, discard: dc, drawnCount, burnedToDiscard }
}
