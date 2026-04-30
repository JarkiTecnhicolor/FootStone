import { describe, expect, it } from 'vitest'
import { decayMids } from './stamina'
import { PLAYER_DECK } from '../cards/player-deck'
import type { MidfielderCard } from '../types'

const mid = (id: string): MidfielderCard => {
  const c = PLAYER_DECK.find(c => c.id === id)
  if (!c || c.role !== 'mid') throw new Error(id)
  return c
}

describe('decayMids', () => {
  it('зменшує stamina всім на 1 коли turnPlaced < currentTurn', () => {
    const modruk = { ...mid('p_m1'), turnPlaced: 1 }
    const result = decayMids([modruk], 2)
    expect(result.remaining).toHaveLength(1)
    expect(result.remaining[0].stamina).toBe(2)
    expect(result.toDiscard).toHaveLength(0)
  })

  it('пропускає decay коли turnPlaced === currentTurn', () => {
    const modruk = { ...mid('p_m1'), turnPlaced: 1 }
    const result = decayMids([modruk], 1)
    expect(result.remaining[0].stamina).toBe(3)
  })

  it('переносить у discard коли stamina ≤ 0', () => {
    const arvalo = { ...mid('p_m5'), turnPlaced: 1 } // stamina 1
    const result = decayMids([arvalo], 2)
    expect(result.remaining).toHaveLength(0)
    expect(result.toDiscard).toHaveLength(1)
    expect(result.toDiscard[0].id).toBe('p_m5')
  })

  it('відновлює stamina до max при поверненні в discard', () => {
    const arvalo = { ...mid('p_m5'), stamina: 1, maxStamina: 1, turnPlaced: 1 }
    const result = decayMids([arvalo], 2)
    expect(result.toDiscard[0].stamina).toBe(1)
  })

  it('не мутує вхідний масив', () => {
    const modruk = { ...mid('p_m1'), turnPlaced: 1 }
    const original = modruk.stamina
    decayMids([modruk], 2)
    expect(modruk.stamina).toBe(original)
  })
})
