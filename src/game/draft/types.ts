import type { Card, Keeper } from '../types'

export type DraftStep =
  | 'star-legend'
  | 'keeper'
  | 'def'
  | 'mid'
  | 'fwd'
  | 'gold'
  | 'bench'
  | 'done'

export interface DraftState {
  step: DraftStep
  budget: number
  cards: Card[]
  keeper: Keeper | null
  // Options for current pick step (legend/def/mid/fwd/gold = 3 cards; bench = 10 cards)
  cardOptions: Card[]
  // Options for keeper step
  keeperOptions: Keeper[]
}

export interface DraftedTeam {
  cards: Card[]
  keeper: Keeper
  remainingBudget: number
}
