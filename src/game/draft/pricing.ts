import type { BaseCard, Keeper, Rarity } from '../types'

export const STARTING_BUDGET = 250
export const MIN_DECK_SIZE = 8
export const MAX_DECK_SIZE = 12

const RARITY_BASE: Record<Rarity, number> = {
  bronze: 8,
  silver: 15,
  gold: 30,
  legend: 60,
}

const COST_MULT: Record<Rarity, number> = {
  bronze: 2,
  silver: 3,
  gold: 4,
  legend: 5,
}

export function priceOf(card: BaseCard): number {
  if (card.price != null) return card.price
  const r = card.rarity ?? 'bronze'
  return RARITY_BASE[r] + card.cost * COST_MULT[r]
}

export function keeperPriceOf(keeper: Keeper): number {
  if (keeper.price != null) return keeper.price
  const r = keeper.rarity ?? 'bronze'
  return RARITY_BASE[r] + keeper.save * 6
}

// Cost of releasing a contracted card mid-run
export function releasePriceOf(card: BaseCard): number {
  return Math.round(priceOf(card) * 1.5)
}
