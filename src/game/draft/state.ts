import type { Card, Keeper, Rarity, Role } from '../types'
import { PLAYER_DECK } from '../cards/player-deck'
import { PLAYER_KEEPERS } from '../keepers/player-keepers'
import { cloneCard, shuffle } from '../lib'
import {
  MAX_DECK_SIZE,
  MIN_DECK_SIZE,
  STARTING_BUDGET,
  keeperPriceOf,
  priceOf,
} from './pricing'
import type { DraftState, DraftStep, DraftedTeam } from './types'

export const NEXT_STEP: Record<DraftStep, DraftStep> = {
  'star-legend': 'keeper',
  keeper: 'def',
  def: 'mid',
  mid: 'fwd',
  fwd: 'gold',
  gold: 'bench',
  bench: 'done',
  done: 'done',
}

const PICKS_PER_STEP = 3
const BENCH_OPTION_COUNT = 10

function rollCardOptions(
  step: DraftStep,
  excludedIds: ReadonlySet<string>,
): Card[] {
  let pool: Card[] = []
  if (step === 'star-legend') {
    pool = PLAYER_DECK.filter(c => c.rarity === 'legend')
  } else if (step === 'def' || step === 'mid' || step === 'fwd') {
    pool = PLAYER_DECK.filter(c => c.role === (step as Role))
  } else if (step === 'gold') {
    pool = PLAYER_DECK.filter(c => c.rarity === 'gold')
  } else if (step === 'bench') {
    pool = PLAYER_DECK.filter(c => {
      const r: Rarity = c.rarity ?? 'bronze'
      return r === 'silver' || r === 'bronze'
    })
  }
  pool = pool.filter(c => !excludedIds.has(c.id))
  const shuffled = shuffle(pool)
  const count = step === 'bench' ? BENCH_OPTION_COUNT : PICKS_PER_STEP
  return shuffled.slice(0, count).map(cloneCard)
}

function rollKeeperOptions(): Keeper[] {
  const pool = PLAYER_KEEPERS.filter(k => k.rarity !== 'legend')
  return shuffle(pool).slice(0, PICKS_PER_STEP).map(k => ({ ...k }))
}

function pickedIds(state: DraftState): Set<string> {
  return new Set(state.cards.map(c => c.id))
}

export function startDraft(): DraftState {
  return {
    step: 'star-legend',
    budget: STARTING_BUDGET,
    cards: [],
    keeper: null,
    cardOptions: rollCardOptions('star-legend', new Set()),
    keeperOptions: [],
  }
}

export function canAffordCard(state: DraftState, card: Card): boolean {
  return priceOf(card) <= state.budget
}

export function canAffordKeeper(state: DraftState, keeper: Keeper): boolean {
  return keeperPriceOf(keeper) <= state.budget
}

function advanceFrom(step: DraftStep, state: DraftState): DraftState {
  const nextStep = NEXT_STEP[step]
  if (nextStep === 'keeper') {
    return { ...state, step: nextStep, cardOptions: [], keeperOptions: rollKeeperOptions() }
  }
  if (nextStep === 'done') {
    return { ...state, step: nextStep, cardOptions: [], keeperOptions: [] }
  }
  // For all card-pick steps, roll new options excluding already-picked
  return {
    ...state,
    step: nextStep,
    cardOptions: rollCardOptions(nextStep, pickedIds(state)),
    keeperOptions: [],
  }
}

export function pickCard(state: DraftState, cardId: string): DraftState {
  if (state.step === 'keeper' || state.step === 'done') return state
  if (state.step === 'bench') return pickBenchCard(state, cardId)
  const opt = state.cardOptions.find(c => c.id === cardId)
  if (!opt) return state
  if (state.cards.length >= MAX_DECK_SIZE) return state
  const price = priceOf(opt)
  if (price > state.budget) return state
  const next: DraftState = {
    ...state,
    budget: state.budget - price,
    cards: [...state.cards, opt],
  }
  return advanceFrom(state.step, next)
}

export function pickKeeper(state: DraftState, keeperId: string): DraftState {
  if (state.step !== 'keeper') return state
  const opt = state.keeperOptions.find(k => k.id === keeperId)
  if (!opt) return state
  const price = keeperPriceOf(opt)
  if (price > state.budget) return state
  const next: DraftState = {
    ...state,
    budget: state.budget - price,
    keeper: opt,
  }
  return advanceFrom(state.step, next)
}

export function skipStep(state: DraftState): DraftState {
  if (state.step === 'done' || state.step === 'bench') return state
  if (state.step === 'keeper' && state.keeper === null) return state // must pick a keeper
  return advanceFrom(state.step, state)
}

function pickBenchCard(state: DraftState, cardId: string): DraftState {
  if (state.step !== 'bench') return state
  if (state.cards.length >= MAX_DECK_SIZE) return state
  const opt = state.cardOptions.find(c => c.id === cardId)
  if (!opt) return state
  const price = priceOf(opt)
  if (price > state.budget) return state
  return {
    ...state,
    budget: state.budget - price,
    cards: [...state.cards, opt],
    cardOptions: state.cardOptions.filter(c => c.id !== cardId),
  }
}

export function finishBench(state: DraftState): DraftState | null {
  if (state.step !== 'bench') return state
  // Must satisfy MIN_DECK_SIZE before finishing
  if (state.cards.length < MIN_DECK_SIZE) return null
  if (state.keeper === null) return null
  return { ...state, step: 'done' }
}

export function isDraftReady(state: DraftState): boolean {
  return (
    state.step === 'done' &&
    state.keeper !== null &&
    state.cards.length >= MIN_DECK_SIZE
  )
}

export function finalizeDraft(state: DraftState): DraftedTeam | null {
  if (!isDraftReady(state) || state.keeper === null) return null
  return {
    cards: state.cards.slice(),
    keeper: state.keeper,
    remainingBudget: state.budget,
  }
}
