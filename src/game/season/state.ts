import type { Card, MatchState, OpponentDeck, Role } from '../types'
import { PLAYER_DECK } from '../cards/player-deck'
import { PLAYER_KEEPERS } from '../keepers/player-keepers'
import { SHAKHTAR } from '../cards/opponents/shakhtar'
import { cloneCard, shuffle } from '../lib'
import { MAX_DECK_SIZE, MIN_DECK_SIZE, priceOf, releasePriceOf } from '../draft/pricing'
import type { DraftedTeam } from '../draft/types'
import { computeMvp, MONEY_BONUS, rollMvpReward } from './mvp'
import type {
  MatchOutcome,
  MvpAward,
  RewardBreakdown,
  SeasonMatchPlan,
  SeasonMatchResult,
  SeasonState,
  TradeOffer,
} from './types'

const UPGRADE_CAP_PER_CARD = 2

export const SEASON_PLAN: readonly SeasonMatchPlan[] = [
  { idx: 0, oppKind: 'random', oppName: 'Юні мрійники', oppBudget: 160 },
  { idx: 1, oppKind: 'shakhtar', oppName: 'Шахтар' },
  { idx: 2, oppKind: 'random', oppName: 'Серйозні дядьки', oppBudget: 200 },
  { idx: 3, oppKind: 'shakhtar', oppName: 'Шахтар (відплата)' },
  { idx: 4, oppKind: 'random', oppName: 'Гроссмейстри', oppBudget: 270 },
]

const SHOP_OPTIONS = 3

function rollShop(ownedIds: ReadonlySet<string>): Card[] {
  const candidates = PLAYER_DECK.filter(c => !ownedIds.has(c.id))
  return shuffle(candidates).slice(0, SHOP_OPTIONS).map(cloneCard)
}

function rollTradeOffer(ownedIds: ReadonlySet<string>): TradeOffer | null {
  const candidates = PLAYER_DECK.filter(c => !ownedIds.has(c.id))
  if (candidates.length === 0) return null
  const pick = candidates[Math.floor(Math.random() * candidates.length)]
  const multiplier = 0.5 + Math.random() // 0.5..1.5
  return { card: cloneCard(pick), multiplier: Math.round(multiplier * 100) / 100 }
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
    nextOpp: null,
    scoutInfo: null,
    tradeOffer: rollTradeOffer(ownedIds),
    eliminated: false,
  }
}

export function isSeasonOver(state: SeasonState): boolean {
  return state.eliminated || state.results.length >= state.plan.length
}

export function isSeasonChampion(state: SeasonState): boolean {
  return (
    !state.eliminated &&
    state.results.length === state.plan.length &&
    state.results.every(r => r.outcome === 'win')
  )
}

export function nextMatchPlan(state: SeasonState): SeasonMatchPlan | null {
  if (isSeasonOver(state)) return null
  return state.plan[state.results.length]
}

export function rewardBreakdownFor(
  outcome: MatchOutcome,
  myScore: number,
  oppScore: number,
  goalsByFwd: Record<string, number>,
): RewardBreakdown {
  const base = outcome === 'win' ? 35 : outcome === 'draw' ? 18 : 5
  const goalBonus = myScore * 4
  const concedePenalty = oppScore * 2
  const cleanSheet = oppScore === 0 ? 20 : 0
  const maxFwdGoals = Object.values(goalsByFwd).reduce((m, v) => Math.max(m, v), 0)
  const hatTrick = maxFwdGoals >= 3 ? 25 : 0
  const blowout = myScore - oppScore >= 3 && myScore >= 3 ? 15 : 0
  return { base, goalBonus, concedePenalty, cleanSheet, hatTrick, blowout }
}

export function totalReward(b: RewardBreakdown): number {
  return Math.max(
    0,
    b.base + b.goalBonus - b.concedePenalty + b.cleanSheet + b.hatTrick + b.blowout,
  )
}

function bumpStat(card: Card, stat: 'atk' | 'hp' | 'stamina', matchIdx: number): Card {
  const upgrades = [...(card.upgrades ?? []), { stat, amount: 1, matchIdx }]
  if (stat === 'atk' && card.role === 'fwd') {
    return { ...card, atk: card.atk + 1, upgrades }
  }
  if (stat === 'hp' && card.role === 'def') {
    const baseMaxHp = card.maxHp + 1
    return {
      ...card,
      hp: baseMaxHp,
      maxHp: baseMaxHp,
      upgrades,
    }
  }
  if (stat === 'stamina' && card.role === 'mid') {
    return {
      ...card,
      stamina: card.maxStamina + 1,
      maxStamina: card.maxStamina + 1,
      upgrades,
    }
  }
  return card
}

function totalUpgradesOf(card: Card): number {
  return (card.upgrades ?? []).reduce((s, u) => s + u.amount, 0)
}

export function recordMatchResult(
  state: SeasonState,
  myScore: number,
  oppScore: number,
  goalsByFwd: Record<string, number>,
  match: MatchState,
): SeasonState {
  const idx = state.results.length
  if (idx >= state.plan.length) return state
  const plan = state.plan[idx]
  const outcome: MatchOutcome =
    myScore > oppScore ? 'win' : myScore === oppScore ? 'draw' : 'loss'
  const breakdown = rewardBreakdownFor(outcome, myScore, oppScore, goalsByFwd)
  let reward = totalReward(breakdown)

  // MVP detection
  const mvpInfo = computeMvp(match, state.cards)
  let mvpAward: MvpAward | null = null
  let updatedCards = state.cards
  if (mvpInfo) {
    const card = state.cards.find(c => c.id === mvpInfo.cardId)
    if (card) {
      const totalUp = totalUpgradesOf(card)
      const atCap = totalUp >= UPGRADE_CAP_PER_CARD
      const rolled = rollMvpReward(mvpInfo.role)
      if (rolled.kind === 'upgrade' && !atCap) {
        updatedCards = state.cards.map(c =>
          c.id === card.id ? bumpStat(c, rolled.stat, idx) : c,
        )
        mvpAward = {
          cardId: card.id,
          cardName: card.name,
          role: mvpInfo.role,
          score: mvpInfo.score,
          breakdown: mvpInfo.breakdown,
          reward: { kind: 'upgrade', stat: rolled.stat, amount: 1 },
        }
      } else {
        reward += MONEY_BONUS
        const reason: 'rolled' | 'capped' = atCap ? 'capped' : 'rolled'
        mvpAward = {
          cardId: card.id,
          cardName: card.name,
          role: mvpInfo.role,
          score: mvpInfo.score,
          breakdown: mvpInfo.breakdown,
          reward: { kind: 'money', amount: MONEY_BONUS, reason },
        }
      }
    }
  }

  const result: SeasonMatchResult = {
    idx,
    oppName: plan.oppName,
    myScore,
    oppScore,
    outcome,
    reward,
    breakdown,
    mvp: mvpAward,
  }
  const ownedIds = new Set(updatedCards.map(c => c.id))
  const eliminated = state.eliminated || outcome === 'loss'
  return {
    ...state,
    cards: updatedCards,
    results: [...state.results, result],
    money: state.money + reward,
    shop: eliminated ? state.shop : rollShop(ownedIds),
    nextOpp: null,
    scoutInfo: null,
    tradeOffer: eliminated ? null : rollTradeOffer(ownedIds),
    eliminated,
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
  if (state.nextOpp) return state.nextOpp
  const plan = nextMatchPlan(state)
  if (!plan) return null
  if (plan.oppKind === 'shakhtar') return SHAKHTAR
  if (plan.oppKind === 'random' && plan.oppBudget) {
    return makeOpponentByBudget(plan.oppName, plan.oppBudget)
  }
  return null
}

export function ensureNextOppCached(state: SeasonState): SeasonState {
  if (state.nextOpp) return state
  const opp = buildSeasonOpponent(state)
  if (!opp) return state
  return { ...state, nextOpp: opp }
}

const SCOUT_CHEAP_COST = 10
const SCOUT_DEEP_COST = 25

export function scoutCheap(state: SeasonState): SeasonState {
  if (state.scoutInfo) return state
  if (state.money < SCOUT_CHEAP_COST) return state
  const next = ensureNextOppCached(state)
  if (!next.nextOpp) return state
  const shuffled = shuffle(next.nextOpp.cards)
  const revealedIds = shuffled.slice(0, 3).map(c => c.id)
  return {
    ...next,
    money: next.money - SCOUT_CHEAP_COST,
    scoutInfo: { revealedIds, full: false },
  }
}

export function scoutDeep(state: SeasonState): SeasonState {
  if (state.scoutInfo) return state
  if (state.money < SCOUT_DEEP_COST) return state
  const next = ensureNextOppCached(state)
  if (!next.nextOpp) return state
  const cards = next.nextOpp.cards
  const top = (role: Role) =>
    cards
      .filter(c => c.role === role)
      .sort((a, b) => priceOf(b) - priceOf(a))
      .slice(0, 3)
  const revealedIds = [...top('def'), ...top('mid'), ...top('fwd')].map(c => c.id)
  return {
    ...next,
    money: next.money - SCOUT_DEEP_COST,
    scoutInfo: { revealedIds, full: true },
  }
}

export function acceptTradeOffer(state: SeasonState, ownCardId: string): SeasonState {
  if (!state.tradeOffer) return state
  const own = state.cards.find(c => c.id === ownCardId)
  if (!own) return state
  const theirPrice = priceOf(state.tradeOffer.card)
  const ownPrice = priceOf(own)
  const diff = theirPrice - ownPrice
  const payment = Math.round(diff * state.tradeOffer.multiplier)
  if (payment > 0 && payment > state.money) return state
  const newCards = state.cards
    .filter(c => c.id !== ownCardId)
    .concat(cloneCard(state.tradeOffer.card))
  return {
    ...state,
    cards: newCards,
    money: state.money - payment,
    tradeOffer: null,
  }
}

export function skipTradeOffer(state: SeasonState): SeasonState {
  if (!state.tradeOffer) return state
  return { ...state, tradeOffer: null }
}

export function tradePaymentFor(offer: TradeOffer | null, myCard: Card | undefined): number | null {
  if (!offer || !myCard) return null
  const diff = priceOf(offer.card) - priceOf(myCard)
  return Math.round(diff * offer.multiplier)
}

const RANDOM_OPP_DECK_SIZE = 8

export function makeOpponentByBudget(name: string, budget: number): OpponentDeck {
  const shuffled = shuffle(PLAYER_DECK.map(cloneCard))
  // Greedy fill up to fixed deck size while staying within budget — pricier cards first
  // so a high-budget opp actually fields strong cards (not just cheap fillers).
  const sorted = shuffled.slice().sort((a, b) => priceOf(b) - priceOf(a))
  const cards: Card[] = []
  let remaining = budget
  for (const c of sorted) {
    if (cards.length >= RANDOM_OPP_DECK_SIZE) break
    const p = priceOf(c)
    if (p <= remaining) {
      cards.push(c)
      remaining -= p
    }
  }
  // If still short of fixed size (budget too tight), fill with cheapest remaining
  if (cards.length < RANDOM_OPP_DECK_SIZE) {
    const cheap = shuffled
      .filter(c => !cards.some(cc => cc.id === c.id))
      .sort((a, b) => priceOf(a) - priceOf(b))
    for (const c of cheap) {
      if (cards.length >= RANDOM_OPP_DECK_SIZE) break
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
