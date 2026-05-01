import type { Card, OpponentDeck } from '../types'
import { PLAYER_DECK } from '../cards/player-deck'
import { PLAYER_KEEPERS } from '../keepers/player-keepers'
import { SHAKHTAR } from '../cards/opponents/shakhtar'
import { cloneCard, shuffle } from '../lib'
import { MAX_DECK_SIZE, MIN_DECK_SIZE, priceOf, releasePriceOf } from '../draft/pricing'
import type { DraftedTeam } from '../draft/types'
import type {
  MatchOutcome,
  SeasonMatchPlan,
  SeasonMatchResult,
  SeasonState,
} from './types'

export const SEASON_PLAN: readonly SeasonMatchPlan[] = [
  { idx: 0, oppKind: 'shakhtar', oppName: 'Шахтар' },
  { idx: 1, oppKind: 'shakhtar', oppName: 'Шахтар (відплата)' },
  { idx: 2, oppKind: 'random', oppName: 'Юні мрійники', oppBudget: 160 },
  { idx: 3, oppKind: 'random', oppName: 'Серйозні дядьки', oppBudget: 200 },
  { idx: 4, oppKind: 'random', oppName: 'Гроссмейстри', oppBudget: 270 },
]

const SHOP_OPTIONS = 3

function rollShop(ownedIds: ReadonlySet<string>): Card[] {
  const candidates = PLAYER_DECK.filter(c => !ownedIds.has(c.id))
  return shuffle(candidates).slice(0, SHOP_OPTIONS).map(cloneCard)
}

export function startSeason(team: DraftedTeam): SeasonState {
  const ownedIds = new Set(team.cards.map(c => c.id))
  return {
    plan: SEASON_PLAN,
    results: [],
    cards: team.cards.slice(),
    keeper: team.keeper,
    money: team.remainingBudget,
    shop: rollShop(ownedIds),
  }
}

export function isSeasonOver(state: SeasonState): boolean {
  return state.results.length >= state.plan.length
}

export function nextMatchPlan(state: SeasonState): SeasonMatchPlan | null {
  if (isSeasonOver(state)) return null
  return state.plan[state.results.length]
}

export function rewardFor(outcome: MatchOutcome, myScore: number, oppScore: number): number {
  const base = outcome === 'win' ? 35 : outcome === 'draw' ? 18 : 5
  const goalBonus = myScore * 4 - oppScore * 2
  return Math.max(0, base + goalBonus)
}

export function recordMatchResult(
  state: SeasonState,
  myScore: number,
  oppScore: number,
): SeasonState {
  const idx = state.results.length
  if (idx >= state.plan.length) return state
  const plan = state.plan[idx]
  const outcome: MatchOutcome =
    myScore > oppScore ? 'win' : myScore === oppScore ? 'draw' : 'loss'
  const reward = rewardFor(outcome, myScore, oppScore)
  const result: SeasonMatchResult = {
    idx,
    oppName: plan.oppName,
    myScore,
    oppScore,
    outcome,
    reward,
  }
  const ownedIds = new Set(state.cards.map(c => c.id))
  return {
    ...state,
    results: [...state.results, result],
    money: state.money + reward,
    shop: rollShop(ownedIds),
  }
}

export function buyShopCard(state: SeasonState, cardId: string): SeasonState {
  const card = state.shop.find(c => c.id === cardId)
  if (!card) return state
  const price = priceOf(card)
  if (price > state.money) return state
  if (state.cards.length >= MAX_DECK_SIZE) return state
  return {
    ...state,
    cards: [...state.cards, card],
    money: state.money - price,
    shop: state.shop.filter(c => c.id !== cardId),
  }
}

export function releaseCard(state: SeasonState, cardId: string): SeasonState {
  const card = state.cards.find(c => c.id === cardId)
  if (!card) return state
  const cost = releasePriceOf(card)
  if (cost > state.money) return state
  if (state.cards.length <= MIN_DECK_SIZE) return state
  return {
    ...state,
    cards: state.cards.filter(c => c.id !== cardId),
    money: state.money - cost,
  }
}

export function rerollShop(state: SeasonState, fee: number = 10): SeasonState {
  if (state.money < fee) return state
  const ownedIds = new Set(state.cards.map(c => c.id))
  return {
    ...state,
    money: state.money - fee,
    shop: rollShop(ownedIds),
  }
}

export function buildSeasonOpponent(state: SeasonState): OpponentDeck | null {
  const plan = nextMatchPlan(state)
  if (!plan) return null
  if (plan.oppKind === 'shakhtar') return SHAKHTAR
  if (plan.oppKind === 'random' && plan.oppBudget) {
    return makeOpponentByBudget(plan.oppName, plan.oppBudget)
  }
  return null
}

export function makeOpponentByBudget(name: string, budget: number): OpponentDeck {
  const shuffled = shuffle(PLAYER_DECK.map(cloneCard))
  const cards: Card[] = []
  let remaining = budget
  for (const c of shuffled) {
    if (cards.length >= MAX_DECK_SIZE) break
    const p = priceOf(c)
    if (p <= remaining) {
      cards.push(c)
      remaining -= p
    }
  }
  // Fallback: ensure min size by allowing budget overflow if pool too small
  if (cards.length < MIN_DECK_SIZE) {
    for (const c of shuffled) {
      if (cards.length >= MIN_DECK_SIZE) break
      if (cards.some(cc => cc.id === c.id)) continue
      cards.push(c)
    }
  }
  return {
    id: `random-${name.replace(/\s+/g, '-')}`,
    name,
    cards,
    keepers: PLAYER_KEEPERS.slice(),
  }
}
