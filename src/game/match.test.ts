import { describe, expect, it } from 'vitest'
import {
  makeFreshMatch,
  playPlayerCard,
  resolvePendingSniper,
  attackWithForward,
  activateMorph,
  endPlayerTurn,
  advanceTurn,
  decideMatchResult,
} from './match'
import { simulateOne } from './sim/simulate'
import { PLAYER_DECK } from './cards/player-deck'
import { PLAYER_KEEPERS } from './keepers/player-keepers'
import { SHAKHTAR } from './cards/opponents/shakhtar'
import type { MatchState, ForwardCard } from './types'
import type { SniperTargetSelection } from './perks/dispatch'

describe('makeFreshMatch', () => {
  it('ініціалізує стан з правильними початковими значеннями', () => {
    const state = makeFreshMatch(PLAYER_DECK, PLAYER_KEEPERS, SHAKHTAR)
    expect(state.turn).toBe(1)
    expect(state.maxTurn).toBe(12)
    expect(state.actions).toBe(2)
    expect(state.maxActions).toBe(2)
    expect(state.myKeeper.save).toBeGreaterThanOrEqual(1)
    expect(state.oppKeeper.save).toBe(2)
    expect(state.hand).toHaveLength(5)
    expect(state.oppHand).toHaveLength(5)
    expect(state.deck).toHaveLength(SHAKHTAR.cards.length - 5)
    expect(state.oppDeck).toHaveLength(SHAKHTAR.cards.length - 5)
    expect(state.firstTurn).toBe(true)
    expect(state.pendingSniper).toBeNull()
  })

  it('перетасовує деки (різний порядок між запусками)', () => {
    const states = Array.from({ length: 20 }, () => makeFreshMatch(PLAYER_DECK, PLAYER_KEEPERS, SHAKHTAR))
    const firstHandIds = states.map(s => s.hand.map(c => c.id).join(','))
    const unique = new Set(firstHandIds).size
    expect(unique).toBeGreaterThan(1)
  })
})

describe('playPlayerCard', () => {
  function withHand(cards: typeof PLAYER_DECK): MatchState {
    const fresh = makeFreshMatch(PLAYER_DECK, PLAYER_KEEPERS, SHAKHTAR)
    return {
      ...fresh,
      hand: cards.map(c => ({ ...c })),
      deck: [],
      actions: 10,
      maxActions: 10,
    }
  }

  it('списує дії і виставляє карту на поле', () => {
    const state = withHand([PLAYER_DECK.find(c => c.id === 'p_d2')!])
    const result = playPlayerCard(state, 0)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.state.actions).toBe(8) // 10 - 2 (Saliboo)
    expect(result.state.myDefenders).toHaveLength(1)
    expect(result.state.hand).toHaveLength(0)
  })

  it('відмовляє коли не вистачає дій', () => {
    const state = { ...withHand([PLAYER_DECK.find(c => c.id === 'p_f1')!]), actions: 1 }
    const result = playPlayerCard(state, 0)
    expect(result.ok).toBe(false)
  })

  it('Rudidiger КАПІТАН: при виставленні баффає вже виставлених захисників', () => {
    let state = withHand([
      PLAYER_DECK.find(c => c.id === 'p_d4')!, // Acerbe (hp 1)
      PLAYER_DECK.find(c => c.id === 'p_d3')!, // Rudidiger
    ])
    let r = playPlayerCard(state, 0)
    expect(r.ok).toBe(true)
    if (!r.ok) return
    state = r.state
    expect(state.myDefenders[0].hp).toBe(1) // Acerbe still 1 hp
    r = playPlayerCard(state, 0)
    expect(r.ok).toBe(true)
    if (!r.ok) return
    const acerbe = r.state.myDefenders.find(d => d.id === 'p_d4')!
    expect(acerbe.hp).toBe(2) // boosted +1
    expect(acerbe.maxHp).toBe(2)
  })

  it('Kosomoto встановлює pendingSniper', () => {
    let state = withHand([PLAYER_DECK.find(c => c.id === 'p_m5')!])
    state = {
      ...state,
      oppDefenders: [{ ...SHAKHTAR.cards.find(c => c.id === 'o_d2')!, hp: 1, maxHp: 1 } as never],
    }
    const r = playPlayerCard(state, 0)
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.state.pendingSniper?.sourceId).toBe('p_m5')
  })

  it('блокує дії поки не вирішений pending sniper', () => {
    const arvalo = PLAYER_DECK.find(c => c.id === 'p_m5')!
    const mbarre = PLAYER_DECK.find(c => c.id === 'p_f1')!
    let state = withHand([arvalo, mbarre])
    state = {
      ...state,
      oppDefenders: [{ ...SHAKHTAR.cards.find(c => c.id === 'o_d2')!, hp: 1, maxHp: 1 } as never],
    }
    const r1 = playPlayerCard(state, 0)
    expect(r1.ok).toBe(true)
    if (!r1.ok) return
    const r2 = playPlayerCard(r1.state, 0)
    expect(r2.ok).toBe(false)
  })
})

describe('resolvePendingSniper', () => {
  it('видаляє обрану ціль і чистить pending', () => {
    const arvalo = PLAYER_DECK.find(c => c.id === 'p_m5')!
    const bondar = SHAKHTAR.cards.find(c => c.id === 'o_d2')!
    let state = makeFreshMatch(PLAYER_DECK, PLAYER_KEEPERS, SHAKHTAR)
    state = {
      ...state,
      hand: [{ ...arvalo }],
      oppDefenders: [{ ...bondar, hp: 1, maxHp: 1 } as never],
      actions: 10,
    }
    const placed = playPlayerCard(state, 0)
    expect(placed.ok).toBe(true)
    if (!placed.ok) return
    const target: SniperTargetSelection = { kind: 'def', idx: 0 }
    const resolved = resolvePendingSniper(placed.state, target)
    expect(resolved.ok).toBe(true)
    if (!resolved.ok) return
    expect(resolved.state.pendingSniper).toBeNull()
    expect(resolved.state.oppDefenders).toHaveLength(0)
    expect(resolved.state.oppDiscard).toHaveLength(1)
  })
})

describe('attackWithForward', () => {
  it('атака готового форварда забирає його з поля і збільшує рахунок при голі', () => {
    const mbarre: ForwardCard = {
      ...(PLAYER_DECK.find(c => c.id === 'p_f1')! as ForwardCard),
      status: 'ready_to_attack',
    }
    let state = makeFreshMatch(PLAYER_DECK, PLAYER_KEEPERS, SHAKHTAR)
    state = {
      ...state,
      myFwds: [mbarre],
      oppDefenders: [],
      oppKeeper: { id: 'tmp', name: 'tmp', save: 3, abilities: [] },
    }
    const r = attackWithForward(state, 'p_f1', { kind: 'keeper' })
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.state.myFwds).toHaveLength(0)
    expect(r.state.discard).toHaveLength(1)
    expect(r.state.myScore).toBe(1)
  })

  it('відмовляє атакувати форвардом attacking_next', () => {
    const mbarre: ForwardCard = {
      ...(PLAYER_DECK.find(c => c.id === 'p_f1')! as ForwardCard),
      status: 'attacking_next',
    }
    let state = makeFreshMatch(PLAYER_DECK, PLAYER_KEEPERS, SHAKHTAR)
    state = { ...state, myFwds: [mbarre] }
    const r = attackWithForward(state, 'p_f1', { kind: 'keeper' })
    expect(r.ok).toBe(false)
  })
})

describe('activateMorph (Purifier)', () => {
  it('Purifier при активації стає форвардом з atk = ceil(hp/2)', () => {
    const purifier = PLAYER_DECK.find(c => c.id === 'p_d5')!
    let state = makeFreshMatch(PLAYER_DECK, PLAYER_KEEPERS, SHAKHTAR)
    state = { ...state, myDefenders: [{ ...purifier, hp: 6, maxHp: 6 } as never] }
    const r = activateMorph(state, 'p_d5')
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.state.myDefenders).toHaveLength(0)
    expect(r.state.myFwds).toHaveLength(1)
    expect(r.state.myFwds[0].id).toBe('p_d5')
    expect(r.state.myFwds[0].atk).toBe(3) // 6/2 = 3
    expect(r.state.myFwds[0].status).toBe('attacking_next')
  })

  it('atk округляється вгору при непарному MaxHP', () => {
    const purifier = PLAYER_DECK.find(c => c.id === 'p_d5')!
    let state = makeFreshMatch(PLAYER_DECK, PLAYER_KEEPERS, SHAKHTAR)
    state = { ...state, myDefenders: [{ ...purifier, hp: 5, maxHp: 5 } as never] }
    const r = activateMorph(state, 'p_d5')
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.state.myFwds[0].atk).toBe(3) // ceil(5/2) = 3
  })

  it('atk рахується від MaxHP, ігнорує пошкодження поточного HP', () => {
    const purifier = PLAYER_DECK.find(c => c.id === 'p_d5')!
    let state = makeFreshMatch(PLAYER_DECK, PLAYER_KEEPERS, SHAKHTAR)
    state = { ...state, myDefenders: [{ ...purifier, hp: 2, maxHp: 6 } as never] }
    const r = activateMorph(state, 'p_d5')
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.state.myFwds[0].atk).toBe(3) // ceil(6/2) = 3, ignoring hp 2
  })

  it('відмовляє коли карта не має morph перки', () => {
    const vanDijra = PLAYER_DECK.find(c => c.id === 'p_d1')!
    let state = makeFreshMatch(PLAYER_DECK, PLAYER_KEEPERS, SHAKHTAR)
    state = { ...state, myDefenders: [{ ...vanDijra } as never] }
    const r = activateMorph(state, 'p_d1')
    expect(r.ok).toBe(false)
  })
})

describe('endPlayerTurn', () => {
  it('переносить неатакованих ready форвардів у відбій', () => {
    const mbarre: ForwardCard = {
      ...(PLAYER_DECK.find(c => c.id === 'p_f1')! as ForwardCard),
      status: 'ready_to_attack',
    }
    const vinicus: ForwardCard = {
      ...(PLAYER_DECK.find(c => c.id === 'p_f3')! as ForwardCard),
      status: 'attacking_next',
    }
    let state = makeFreshMatch(PLAYER_DECK, PLAYER_KEEPERS, SHAKHTAR)
    state = { ...state, myFwds: [mbarre, vinicus] }
    const after = endPlayerTurn(state)
    expect(after.phase).toBe('opponent')
    expect(after.myFwds).toHaveLength(1)
    expect(after.myFwds[0].id).toBe('p_f3')
    expect(after.discard).toHaveLength(1)
  })
})

describe('advanceTurn', () => {
  it('форварди attacking_next стають ready_to_attack', () => {
    const vinicus: ForwardCard = {
      ...(PLAYER_DECK.find(c => c.id === 'p_f3')! as ForwardCard),
      status: 'attacking_next',
    }
    let state = makeFreshMatch(PLAYER_DECK, PLAYER_KEEPERS, SHAKHTAR)
    state = { ...state, myFwds: [vinicus], turn: 1, maxActions: 2 }
    const after = advanceTurn(state)
    expect(after.turn).toBe(2)
    expect(after.maxActions).toBe(3)
    expect(after.actions).toBe(3)
    expect(after.myFwds[0].status).toBe('ready_to_attack')
  })

  it('після maxTurn ставить gameOver', () => {
    let state = makeFreshMatch(PLAYER_DECK, PLAYER_KEEPERS, SHAKHTAR)
    state = { ...state, turn: 12 }
    const after = advanceTurn(state)
    expect(after.gameOver).toBe(true)
  })
})

describe('integration — повний матч проти Шахтаря', () => {
  it('доходить до 5 ходу і дає результат', () => {
    const state = simulateOne(PLAYER_DECK, SHAKHTAR)
    expect(state.gameOver).toBe(true)
    expect(decideMatchResult(state)).toMatch(/win|loss|draw/)
  })

  it('20 матчів — без винятків і завжди gameOver', () => {
    for (let i = 0; i < 20; i++) {
      const state = simulateOne(PLAYER_DECK, SHAKHTAR)
      expect(state.gameOver).toBe(true)
    }
  })
})
