import { describe, expect, it } from 'vitest'
import { canAfford, payCost } from './cost'
import { PLAYER_DECK } from '../cards/player-deck'
import type { Card } from '../types'

const find = (id: string): Card => {
  const c = PLAYER_DECK.find(c => c.id === id)
  if (!c) throw new Error(id)
  return c
}

describe('cost', () => {
  it('canAfford true коли actions ≥ cost', () => {
    expect(canAfford(6, find('p_f1'))).toBe(true) // Mbarre cost 5
    expect(canAfford(5, find('p_f1'))).toBe(true)
  })

  it('canAfford false коли actions < cost', () => {
    expect(canAfford(4, find('p_f1'))).toBe(false) // Mbarre cost 5
    expect(canAfford(0, find('p_d4'))).toBe(false) // Acerbe cost 1
  })

  it('payCost зменшує actions на cost', () => {
    expect(payCost(6, find('p_f1'))).toBe(1) // 6 - 5
    expect(payCost(2, find('p_d4'))).toBe(1)
  })
})
