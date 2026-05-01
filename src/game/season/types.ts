import type { Card, Keeper } from '../types'

export interface SeasonMatchPlan {
  idx: number
  oppName: string
  oppKind: 'shakhtar' | 'random'
  oppBudget?: number
}

export type MatchOutcome = 'win' | 'draw' | 'loss'

export interface SeasonMatchResult {
  idx: number
  oppName: string
  myScore: number
  oppScore: number
  outcome: MatchOutcome
  reward: number
}

export interface SeasonState {
  plan: readonly SeasonMatchPlan[]
  results: SeasonMatchResult[]
  cards: Card[]
  keeper: Keeper
  money: number
  shop: Card[]
}
