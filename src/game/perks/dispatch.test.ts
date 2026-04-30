import { describe, expect, it } from 'vitest'
import { applyOnPlacePerks, applySniperChoice } from './dispatch'
import type { FieldSnapshot } from './dispatch'
import { PLAYER_DECK } from '../cards/player-deck'
import { SHAKHTAR } from '../cards/opponents/shakhtar'
import type { Card, DefenderCard, ForwardCard, MidfielderCard } from '../types'

function pick<T extends Card['role']>(deck: readonly Card[], id: string, role: T): Extract<Card, { role: T }> {
  const c = deck.find(c => c.id === id)
  if (!c || c.role !== role) throw new Error(id)
  return c as Extract<Card, { role: T }>
}
const fwd = (deck: readonly Card[], id: string) => pick(deck, id, 'fwd') as ForwardCard
const mid = (deck: readonly Card[], id: string) => pick(deck, id, 'mid') as MidfielderCard
const def = (deck: readonly Card[], id: string) => pick(deck, id, 'def') as DefenderCard

const oppDeck = SHAKHTAR.cards

function emptyField(overrides: Partial<FieldSnapshot> = {}): FieldSnapshot {
  return {
    ownDefenders: [],
    ownMids: [],
    ownFwds: [],
    enemyDefenders: [],
    enemyMids: [],
    enemyFwds: [],
    ...overrides,
  }
}

describe('applyOnPlacePerks — Rudidiger (hp_buff to other_defs)', () => {
  it('без інших захисників — нікого не баффає, своє HP не міняється', () => {
    const rud = def(PLAYER_DECK, 'p_d3')
    const result = applyOnPlacePerks(rud, emptyField({ ownDefenders: [rud] }))
    expect((result.card as DefenderCard).hp).toBe(3)
    expect(result.ownDefenders).toHaveLength(1)
  })

  it('виставлений з Acerbe на полі — Acerbe отримує +1 HP', () => {
    const rud = def(PLAYER_DECK, 'p_d3')
    const acerbe = def(PLAYER_DECK, 'p_d4')
    const result = applyOnPlacePerks(rud, emptyField({ ownDefenders: [acerbe, rud] }))
    expect(result.ownDefenders).toHaveLength(2)
    const updatedAcerbe = result.ownDefenders.find(d => d.id === 'p_d4')
    expect(updatedAcerbe?.hp).toBe(2)
    expect(updatedAcerbe?.maxHp).toBe(2)
    expect(result.log[0]).toMatch(/Acerbe/)
  })

  it('Acerbe виставляється коли Rudidiger вже на полі — Acerbe отримує +1 HP', () => {
    const rud = def(PLAYER_DECK, 'p_d3')
    const acerbe = def(PLAYER_DECK, 'p_d4')
    const result = applyOnPlacePerks(acerbe, emptyField({ ownDefenders: [rud, acerbe] }))
    const updatedAcerbe = result.ownDefenders.find(d => d.id === 'p_d4')
    expect(updatedAcerbe?.hp).toBe(2)
    expect(updatedAcerbe?.maxHp).toBe(2)
    expect(result.log[0]).toMatch(/від капітана/)
  })
})

describe('applyOnPlacePerks — Rapunskiy (sniper enemy_fwd_first)', () => {
  it('знесе ворожого форварда на полі', () => {
    const krivtsov = def(oppDeck, 'o_d4')
    const mbarre: ForwardCard = { ...fwd(PLAYER_DECK, 'p_f1'), status: 'attacking_next' }
    const result = applyOnPlacePerks(krivtsov, emptyField({ enemyFwds: [mbarre] }))
    expect(result.enemyFwds).toHaveLength(0)
    expect(result.enemyDiscard).toHaveLength(1)
    expect(result.enemyDiscard[0].id).toBe('p_f1')
    expect(result.log[0]).toMatch(/знесе Mbarre/)
  })

  it('коли немає форварда — немає ефекту', () => {
    const krivtsov = def(oppDeck, 'o_d4')
    const result = applyOnPlacePerks(krivtsov, emptyField())
    expect(result.enemyDiscard).toHaveLength(0)
    expect(result.log[0]).toMatch(/немає цілі/)
  })
})

describe('applyOnPlacePerks — Kosomoto (sniper any_enemy)', () => {
  it('сигналить pendingSniperChoice коли є цілі', () => {
    const arvalo = mid(PLAYER_DECK, 'p_m5')
    const bondar = def(oppDeck, 'o_d2')
    const result = applyOnPlacePerks(arvalo, emptyField({ enemyDefenders: [bondar] }))
    expect(result.pendingSniperChoice).toBe(true)
  })

  it('не сигналить коли поле опонента пусте', () => {
    const arvalo = mid(PLAYER_DECK, 'p_m5')
    const result = applyOnPlacePerks(arvalo, emptyField())
    expect(result.pendingSniperChoice).toBe(false)
    expect(result.log[0]).toMatch(/пропадає/)
  })
})

describe('applySniperChoice', () => {
  it('видаляє обраного захисника', () => {
    const arvalo = mid(PLAYER_DECK, 'p_m5')
    const stepan = mid(oppDeck, 'o_m1')
    const result = applySniperChoice(
      arvalo,
      emptyField({ enemyMids: [stepan] }),
      { kind: 'mid', idx: 0 },
    )
    expect(result.enemyMids).toHaveLength(0)
    expect(result.removed.id).toBe('o_m1')
  })

  it('кидає на невалідному індексі', () => {
    const arvalo = mid(PLAYER_DECK, 'p_m5')
    expect(() =>
      applySniperChoice(arvalo, emptyField(), { kind: 'def', idx: 0 }),
    ).toThrow()
  })
})
