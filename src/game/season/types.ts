import type { Card, Keeper, OpponentDeck } from '../types'

export interface SeasonMatchPlan {
  idx: number
  oppName: string
  oppKind: 'shakhtar' | 'random'
  oppBudget?: number
}

export type MatchOutcome = 'win' | 'draw' | 'loss'

export interface RewardBreakdown {
  base: number
  goalBonus: number
  concedePenalty: number
  cleanSheet: number
  hatTrick: number
  blowout: number
}

export interface SeasonMatchResult {
  idx: number
  oppName: string
  myScore: number
  oppScore: number
  outcome: MatchOutcome
  reward: number
  breakdown: RewardBreakdown
}

export interface ScoutInfo {
  revealedIds: string[]
  full: boolean
}

export interface TradeOffer {
  card: Card
  multiplier: number
}

export interface SeasonState {
  plan: readonly SeasonMatchPlan[]
  results: SeasonMatchResult[]
  cards: Card[]
  keeper: Keeper
  money: number
  shop: Card[]
  nextOpp: OpponentDeck | null
  scoutInfo: ScoutInfo | null
  tradeOffer: TradeOffer | null
}
