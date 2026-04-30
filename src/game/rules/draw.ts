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

  if (hand.length >= HAND_LIMIT) {
    return {
      hand: hand.slice(),
      deck: workDeck,
      discard: [...workDiscard, drawn],
      drawn,
      shuffled,
      toDiscard: true,
    }
  }

  return {
    hand: [...hand, drawn],
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
