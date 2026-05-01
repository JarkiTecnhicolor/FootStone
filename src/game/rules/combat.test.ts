import { describe, expect, it } from 'vitest'
import { resolveAttack, calculateAtk } from './combat'
import { PLAYER_DECK } from '../cards/player-deck'
import { SHAKHTAR } from '../cards/opponents/shakhtar'
import type { Card, DefenderCard, ForwardCard, Keeper, MidfielderCard } from '../types'

const k = (save: number): Keeper => ({ id: 'test', name: 'TestKeeper', save, abilities: [] })

function getCard<T extends Card['role']>(deck: readonly Card[], id: string, role: T): Extract<Card, { role: T }> {
  const c = deck.find(c => c.id === id)
  if (!c) throw new Error(`Card not found: ${id}`)
  if (c.role !== role) throw new Error(`Card ${id} is ${c.role}, expected ${role}`)
  return c as Extract<Card, { role: T }>
}

const fwd = (deck: readonly Card[], id: string) => getCard(deck, id, 'fwd') as ForwardCard
const mid = (deck: readonly Card[], id: string) => getCard(deck, id, 'mid') as MidfielderCard
const def = (deck: readonly Card[], id: string) => getCard(deck, id, 'def') as DefenderCard

const oppDeck = SHAKHTAR.cards

describe('calculateAtk', () => {
  it('повертає базовий atk коли немає бафів', () => {
    const mbarre = fwd(PLAYER_DECK, 'p_f1')
    const result = calculateAtk(mbarre, [], [])
    expect(result.baseAtk).toBe(5)
    expect(result.finalAtk).toBe(5)
    expect(result.buffs).toEqual([])
  })

  it('Modruk дає +2 будь-якому форварду', () => {
    const mbarre = fwd(PLAYER_DECK, 'p_f1')
    const modruk = mid(PLAYER_DECK, 'p_m1')
    const result = calculateAtk(mbarre, [modruk], [])
    expect(result.finalAtk).toBe(7)
    expect(result.buffs).toEqual([{ source: 'Modruk', amount: 2, origin: 'aura' }])
  })

  it('Modruk + Bellinghame стакаються (+3)', () => {
    const mbarre = fwd(PLAYER_DECK, 'p_f1')
    const modruk = mid(PLAYER_DECK, 'p_m1')
    const bell = mid(PLAYER_DECK, 'p_m4')
    const result = calculateAtk(mbarre, [modruk, bell], [])
    expect(result.finalAtk).toBe(8)
    expect(result.buffs).toHaveLength(2)
  })

  it('Vinicus без півзах = базові 2 (hidden gem мовчить)', () => {
    const vinicus = fwd(PLAYER_DECK, 'p_f3')
    const result = calculateAtk(vinicus, [], [])
    expect(result.finalAtk).toBe(2)
  })

  it('Vinicus + Modruk = atk 7 (2 base + Modruk +2 + hidden gem +3)', () => {
    const vinicus = fwd(PLAYER_DECK, 'p_f3')
    const modruk = mid(PLAYER_DECK, 'p_m1')
    const result = calculateAtk(vinicus, [modruk], [])
    expect(result.finalAtk).toBe(7)
    expect(result.buffs).toEqual([
      { source: 'Modruk', amount: 2, origin: 'aura' },
      { source: 'Vinicus', amount: 3, origin: 'self' },
    ])
  })

  it('Mudruk +2 проти HP1 захисника', () => {
    const mudruk = fwd(oppDeck, 'o_f1')
    const bondar = def(oppDeck, 'o_d2')
    const result = calculateAtk(mudruk, [], [bondar])
    expect(result.finalAtk).toBe(5)
    expect(result.buffs).toEqual([{ source: 'Mudruk', amount: 2, origin: 'self' }])
  })

  it('Mudruk не отримує бонус якщо немає HP1 захисника', () => {
    const mudruk = fwd(oppDeck, 'o_f1')
    const vanDijra = def(PLAYER_DECK, 'p_d1')
    const result = calculateAtk(mudruk, [], [vanDijra])
    expect(result.finalAtk).toBe(3)
    expect(result.buffs).toEqual([])
  })
})

describe('resolveAttack — defender absorbs', () => {
  it('Vinicus 2 vs Van Dijra 4 → захисник зменшує hp до 2', () => {
    const vinicus = fwd(PLAYER_DECK, 'p_f3')
    const vanDijra = def(PLAYER_DECK, 'p_d1')
    const result = resolveAttack({
      attacker: vinicus,
      defenders: [vanDijra],
      keeper: k(3),
      attackerMids: [],
      defenderMids: [],
      target: { kind: 'defender', idx: 0 },
    })
    expect(result.damageDealt).toBe(2)
    expect(result.defenderRemoved).toBe(false)
    expect(result.newEnemyDefenders[0].hp).toBe(2)
    expect(result.reachedKeeper).toBe(false)
    expect(result.goal).toBe(false)
  })
})

describe('resolveAttack — defender removed exact', () => {
  it('Holande 4 vs Van Dijra 4 → захисник знесений, 0 leftover', () => {
    const holande = fwd(PLAYER_DECK, 'p_f2')
    const vanDijra = def(PLAYER_DECK, 'p_d1')
    const result = resolveAttack({
      attacker: holande,
      defenders: [vanDijra],
      keeper: k(3),
      attackerMids: [],
      defenderMids: [],
      target: { kind: 'defender', idx: 0 },
    })
    expect(result.defenderRemoved).toBe(true)
    expect(result.newEnemyDefenders).toHaveLength(0)
    expect(result.reachedKeeper).toBe(false)
    expect(result.keeperDamage).toBe(0)
    expect(result.goal).toBe(false)
  })
})

describe('resolveAttack — defender removed + leftover', () => {
  it('Mbarre 5 vs Marlos 3, keeper save 2 → знесений, 2 leftover, save (2 не > 2)', () => {
    const mbarre = fwd(PLAYER_DECK, 'p_f1')
    const marlos = def(oppDeck, 'o_d3')
    const result = resolveAttack({
      attacker: mbarre,
      defenders: [marlos],
      keeper: k(2),
      attackerMids: [],
      defenderMids: [],
      target: { kind: 'defender', idx: 0 },
    })
    expect(result.defenderRemoved).toBe(true)
    expect(result.reachedKeeper).toBe(true)
    expect(result.keeperDamage).toBe(2)
    expect(result.goal).toBe(false)
  })

  it('Vinicus + Modruk vs Bondar 1, keeper save 2 → знесений, 6 leftover, ГОЛ', () => {
    const vinicus = fwd(PLAYER_DECK, 'p_f3')
    const modruk = mid(PLAYER_DECK, 'p_m1')
    const bondar = def(oppDeck, 'o_d2')
    const result = resolveAttack({
      attacker: vinicus,
      defenders: [bondar],
      keeper: k(2),
      attackerMids: [modruk],
      defenderMids: [],
      target: { kind: 'defender', idx: 0 },
    })
    expect(result.atk.finalAtk).toBe(7)
    expect(result.defenderRemoved).toBe(true)
    expect(result.keeperDamage).toBe(6)
    expect(result.goal).toBe(true)
  })
})

describe('resolveAttack — direct keeper', () => {
  it('Mbarre vs порожній захист, keeper save 3 → ГОЛ (5 > 3)', () => {
    const mbarre = fwd(PLAYER_DECK, 'p_f1')
    const result = resolveAttack({
      attacker: mbarre,
      defenders: [],
      keeper: k(3),
      attackerMids: [],
      defenderMids: [],
      target: { kind: 'keeper' },
    })
    expect(result.keeperDamage).toBe(5)
    expect(result.goal).toBe(true)
    expect(result.defenderRemoved).toBe(false)
  })

  it('Vinicus 2 vs порожній захист, keeper save 3 → save (2 не > 3)', () => {
    const vinicus = fwd(PLAYER_DECK, 'p_f3')
    const result = resolveAttack({
      attacker: vinicus,
      defenders: [],
      keeper: k(3),
      attackerMids: [],
      defenderMids: [],
      target: { kind: 'keeper' },
    })
    expect(result.goal).toBe(false)
    expect(result.keeperDamage).toBe(2)
  })
})

describe('resolveAttack — cascade through defenders', () => {
  it('atk 5 vs [hp1, hp3] target idx 0 → пробиває обох з 1 leftover у воротаря', () => {
    const mbarre = fwd(PLAYER_DECK, 'p_f1')
    const bondar = def(oppDeck, 'o_d2')
    const marlos = def(oppDeck, 'o_d3')
    const result = resolveAttack({
      attacker: mbarre,
      defenders: [bondar, marlos],
      keeper: k(0),
      attackerMids: [],
      defenderMids: [],
      target: { kind: 'defender', idx: 0 },
    })
    expect(result.defenderRemoved).toBe(true)
    expect(result.newEnemyDefenders).toHaveLength(0)
    expect(result.keeperDamage).toBe(1)
    expect(result.goal).toBe(true)
  })

  it('atk 4 vs [hp1, hp3] target idx 0 → пробиває першого, абсорбується другим (hp 3→0 = remove)', () => {
    const holande = fwd(PLAYER_DECK, 'p_f2')
    const bondar = def(oppDeck, 'o_d2')
    const marlos = def(oppDeck, 'o_d3')
    const result = resolveAttack({
      attacker: holande,
      defenders: [bondar, marlos],
      keeper: k(2),
      attackerMids: [],
      defenderMids: [],
      target: { kind: 'defender', idx: 0 },
    })
    expect(result.defenderRemoved).toBe(true)
    expect(result.newEnemyDefenders).toHaveLength(0)
    expect(result.keeperDamage).toBe(0)
    expect(result.goal).toBe(false)
  })

  it('atk 3 vs [hp1, hp3] target idx 0 → пробиває першого, другий ослаблений до hp 1', () => {
    const holande = fwd(PLAYER_DECK, 'p_f2')
    const holandeNerf: typeof holande = { ...holande, atk: 3 }
    const bondar = def(oppDeck, 'o_d2')
    const marlos = def(oppDeck, 'o_d3')
    const result = resolveAttack({
      attacker: holandeNerf,
      defenders: [bondar, marlos],
      keeper: k(2),
      attackerMids: [],
      defenderMids: [],
      target: { kind: 'defender', idx: 0 },
    })
    expect(result.newEnemyDefenders).toHaveLength(1)
    expect(result.newEnemyDefenders[0].id).toBe('o_d3')
    expect(result.newEnemyDefenders[0].hp).toBe(1)
    expect(result.keeperDamage).toBe(0)
  })
})

describe('resolveAttack — cascade hits ALL defs (target first, then rest)', () => {
  it('atk 5 vs [hp1, hp2] target idx 1 → пробиває цільового, потім каскадить на idx 0', () => {
    const mbarre = fwd(PLAYER_DECK, 'p_f1')
    const bondar = def(oppDeck, 'o_d2') // hp 1
    const krochovyak: DefenderCard = {
      id: 'test_def_hp2', name: 'TestDef', role: 'def', cost: 1,
      hp: 2, maxHp: 2, perks: [],
    }
    const result = resolveAttack({
      attacker: mbarre,
      defenders: [bondar, krochovyak],
      keeper: k(2),
      attackerMids: [],
      defenderMids: [],
      target: { kind: 'defender', idx: 1 },
    })
    expect(result.defenderRemoved).toBe(true)
    expect(result.newEnemyDefenders).toHaveLength(0) // обидва пробиті
    expect(result.keeperDamage).toBe(2) // 5 - 2 - 1 = 2
    expect(result.goal).toBe(false) // 2 не > save 2 → save
  })
})

describe('resolveAttack — isolation perk', () => {
  it('Harvard atk 5 vs [hp1, hp3] target idx 0 → пробиває першого, leftover оминає другого, у воротаря', () => {
    const harvard = fwd(PLAYER_DECK, 'p_f6')
    const bondar = def(oppDeck, 'o_d2')
    const marlos = def(oppDeck, 'o_d3')
    const result = resolveAttack({
      attacker: harvard,
      defenders: [bondar, marlos],
      keeper: k(2),
      attackerMids: [],
      defenderMids: [],
      target: { kind: 'defender', idx: 0 },
    })
    expect(result.defenderRemoved).toBe(true)
    expect(result.newEnemyDefenders).toHaveLength(1)
    expect(result.newEnemyDefenders[0].id).toBe('o_d3')
    expect(result.keeperDamage).toBe(4)
    expect(result.goal).toBe(true)
  })
})

describe('resolveAttack — bypass', () => {
  it('Mossi (bypass) ігнорує захист, прямо у воротаря', () => {
    const mossi = fwd(PLAYER_DECK, 'p_f4')
    const vanDijra = def(PLAYER_DECK, 'p_d1')
    const result = resolveAttack({
      attacker: mossi,
      defenders: [vanDijra],
      keeper: k(2),
      attackerMids: [],
      defenderMids: [],
      target: { kind: 'defender', idx: 0 },
    })
    expect(result.bypass).toBe(true)
    expect(result.defenderHitIdx).toBeNull()
    expect(result.defenderRemoved).toBe(false)
    expect(result.newEnemyDefenders).toHaveLength(1)
    expect(result.newEnemyDefenders[0].hp).toBe(4)
    expect(result.keeperDamage).toBe(4)
    expect(result.goal).toBe(true)
  })
})

describe('resolveAttack — damage reduction (Kantee)', () => {
  it('Mbarre 5, опонент має Kantee → damage 3 (-2)', () => {
    const mbarre = fwd(PLAYER_DECK, 'p_f1')
    const kantee = mid(PLAYER_DECK, 'p_m2')
    const result = resolveAttack({
      attacker: mbarre,
      defenders: [],
      keeper: k(3),
      attackerMids: [],
      defenderMids: [kantee],
      target: { kind: 'keeper' },
    })
    expect(result.atk.finalAtk).toBe(5)
    expect(result.damageReduction).toBe(2)
    expect(result.damageDealt).toBe(3)
    expect(result.goal).toBe(false)
  })

  it('Kantee не робить damage негативним', () => {
    const vinicus = fwd(PLAYER_DECK, 'p_f3')
    const kantee = mid(PLAYER_DECK, 'p_m2')
    const result = resolveAttack({
      attacker: vinicus,
      defenders: [],
      keeper: k(3),
      attackerMids: [],
      defenderMids: [kantee],
      target: { kind: 'keeper' },
    })
    expect(result.damageDealt).toBe(0)
  })
})

describe('resolveAttack — immutability', () => {
  it('не мутує захисників на полі', () => {
    const mbarre = fwd(PLAYER_DECK, 'p_f1')
    const marlos = def(oppDeck, 'o_d3')
    const defenders = [{ ...marlos }]
    const hpBefore = defenders[0].hp
    resolveAttack({
      attacker: mbarre,
      defenders,
      keeper: k(2),
      attackerMids: [],
      defenderMids: [],
      target: { kind: 'defender', idx: 0 },
    })
    expect(defenders[0].hp).toBe(hpBefore)
    expect(defenders).toHaveLength(1)
  })
})
