import { describe, expect, it } from 'vitest'
import { calcDrawCount, drawOne, drawN } from './draw'
import { PLAYER_DECK } from '../cards/player-deck'
import { HAND_LIMIT, BASE_DRAW } from '../../data/constants'
import type { Card, MidfielderCard } from '../types'

const find = (id: string): Card => {
  const c = PLAYER_DECK.find(c => c.id === id)
  if (!c) throw new Error(id)
  return c
}
const mid = (id: string): MidfielderCard => {
  const c = find(id)
  if (c.role !== 'mid') throw new Error(`${id} не mid`)
  return c
}

describe('calcDrawCount', () => {
  it('повертає BASE_DRAW коли нема плеймейкерів', () => {
    expect(calcDrawCount([])).toBe(BASE_DRAW)
    expect(calcDrawCount([mid('p_m4')])).toBe(BASE_DRAW) // Bellinghame, atk-buff only
  })

  it('+1 за Pedrri', () => {
    expect(calcDrawCount([mid('p_m3')])).toBe(BASE_DRAW + 1)
  })

  it('стакається при двох плеймейкерах', () => {
    expect(calcDrawCount([mid('p_m3'), mid('p_m3')])).toBe(BASE_DRAW + 2)
  })
})

describe('drawOne', () => {
  it('забирає карту з топа деки в руку', () => {
    const card1 = find('p_f1')
    const card2 = find('p_f2')
    const result = drawOne([], [card1, card2], [])
    expect(result.drawn?.id).toBe('p_f1')
    expect(result.hand).toEqual([card1])
    expect(result.deck).toEqual([card2])
    expect(result.shuffled).toBe(false)
  })

  it('перетасовує discard коли дека пуста', () => {
    const card = find('p_f1')
    const result = drawOne([], [], [card])
    expect(result.drawn?.id).toBe('p_f1')
    expect(result.shuffled).toBe(true)
    expect(result.discard).toEqual([])
  })

  it('повертає drawn=null коли і дека і discard пусті', () => {
    const result = drawOne([], [], [])
    expect(result.drawn).toBeNull()
    expect(result.shuffled).toBe(false)
  })

  it('при перевищенні руки спалює випадкову карту (нова карта потрапляє в руку)', () => {
    const fullHand = Array(HAND_LIMIT).fill(find('p_f1')) as Card[]
    const newCard = find('p_f2')
    // random=()=>0 → вигорає індекс 0 з augmented hand (це p_f1)
    const result = drawOne(fullHand, [newCard], [], () => 0)
    expect(result.toDiscard).toBe(true)
    expect(result.hand).toHaveLength(HAND_LIMIT)
    expect(result.hand.some(c => c.id === 'p_f2')).toBe(true)
    expect(result.discard).toHaveLength(1)
    expect(result.discard[0].id).toBe('p_f1')
  })

  it('при random=()=>1 згоряє drawn-card (остання в augmented hand)', () => {
    const fullHand = Array(HAND_LIMIT).fill(find('p_f1')) as Card[]
    const newCard = find('p_f2')
    // random=()=>0.99 → індекс HAND_LIMIT (=newCard) згоряє
    const result = drawOne(fullHand, [newCard], [], () => 0.99)
    expect(result.toDiscard).toBe(true)
    expect(result.hand).toHaveLength(HAND_LIMIT)
    expect(result.hand.every(c => c.id === 'p_f1')).toBe(true)
    expect(result.discard[0].id).toBe('p_f2')
  })
})

describe('drawN', () => {
  it('тягне n карт', () => {
    const cards = [find('p_f1'), find('p_f2'), find('p_f3')]
    const result = drawN([], cards, [], 3)
    expect(result.drawnCount).toBe(3)
    expect(result.hand).toHaveLength(3)
    expect(result.deck).toHaveLength(0)
  })

  it('зупиняється коли немає що тягнути', () => {
    const result = drawN([], [find('p_f1')], [], 5)
    expect(result.drawnCount).toBe(1)
  })
})
