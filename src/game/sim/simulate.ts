import type { Card, Keeper, MatchState, OpponentDeck } from '../types'
import { PLAYER_KEEPERS } from '../keepers/player-keepers'
import {
  advanceTurn,
  decideMatchResult,
  endPlayerTurn,
  makeFreshMatch,
  resolveOpponentForwards,
  startOpponentTurn,
} from '../match'
import { runSimpleOpponentTurn } from '../ai/simple'
import { dumbPlayerActions } from '../ai/dumb-player'
import { smartPlayerActionsV2 } from '../ai/smart-player-v2'
import { computeMvp, DEFAULT_COEF, type MvpCoefficients } from '../season/mvp'
import {
  buildSeasonOpponent,
  isSeasonChampion,
  isSeasonOver,
  nextMatchPlan,
  recordMatchResult,
  startSeason,
} from '../season/state'
import { keeperPriceOf, priceOf, STARTING_BUDGET } from '../draft/pricing'
import { cloneCard, shuffle } from '../lib'
import type { DraftedTeam } from '../draft/types'

export type PlayerAi = 'dumb' | 'smart'

export interface SeasonSimResult {
  champion: boolean
  matchesSurvived: number
  finalMoney: number
  totalMyGoals: number
  totalOppGoals: number
  upgradesEarned: number
  results: Array<{ idx: number; outcome: string; myScore: number; oppScore: number }>
}

function autoDraft(
  pool: readonly Card[],
  keepers: readonly Keeper[],
  budget: number,
): DraftedTeam {
  const shuffled = shuffle(pool.map(cloneCard))
  // Pick a keeper first (random non-legend)
  const nonLegend = keepers.filter(k => k.rarity !== 'legend')
  const keeperPool = nonLegend.length > 0 ? nonLegend : keepers
  const keeper = { ...keeperPool[Math.floor(Math.random() * keeperPool.length)] }
  let remaining = budget - keeperPriceOf(keeper)
  const cards: Card[] = []
  // Try to grab one legend if affordable
  const legends = shuffled.filter(c => c.rarity === 'legend')
  for (const c of legends) {
    const p = priceOf(c)
    if (p <= remaining) {
      cards.push(c)
      remaining -= p
      break
    }
  }
  // Then position picks (1 def, 1 mid, 1 fwd) prefer gold > silver > bronze
  for (const role of ['def', 'mid', 'fwd'] as const) {
    const candidates = shuffled.filter(c =>
      c.role === role && !cards.some(cc => cc.id === c.id),
    )
    candidates.sort((a, b) => priceOf(b) - priceOf(a))
    for (const c of candidates) {
      const p = priceOf(c)
      if (p <= remaining) {
        cards.push(c)
        remaining -= p
        break
      }
    }
  }
  // One gold reinforcement
  const golds = shuffled.filter(c => c.rarity === 'gold' && !cards.some(cc => cc.id === c.id))
  for (const c of golds) {
    const p = priceOf(c)
    if (p <= remaining) {
      cards.push(c)
      remaining -= p
      break
    }
  }
  // Fill bench up to 8-10 cards from cheapest available
  const bench = shuffled
    .filter(c => !cards.some(cc => cc.id === c.id))
    .filter(c => c.rarity === 'bronze' || c.rarity === 'silver')
    .sort((a, b) => priceOf(a) - priceOf(b))
  for (const c of bench) {
    if (cards.length >= 10) break
    const p = priceOf(c)
    if (p <= remaining) {
      cards.push(c)
      remaining -= p
    }
  }
  // If still under min, force-add cheapest
  while (cards.length < 8) {
    const fallback = shuffled.find(c => !cards.some(cc => cc.id === c.id))
    if (!fallback) break
    cards.push(fallback)
  }
  return { cards, keeper, remainingBudget: Math.max(0, remaining) }
}

export function simulateSeason(
  pool: readonly Card[],
  keepers: readonly Keeper[] = PLAYER_KEEPERS,
  playerAi: PlayerAi = 'smart',
  mvpCoef: MvpCoefficients = DEFAULT_COEF,
): SeasonSimResult {
  const team = autoDraft(pool, keepers, STARTING_BUDGET)
  let season = startSeason(team)
  let totalUpgrades = 0
  let safety = 10
  while (!isSeasonOver(season) && safety-- > 0) {
    const plan = nextMatchPlan(season)
    if (!plan) break
    const opp = buildSeasonOpponent(season)
    if (!opp) break
    const final = simulateOne(season.cards, opp, playerAi, [season.keeper])
    season = recordMatchResult(season, final.myScore, final.oppScore, final.goalsByFwd, final)
    if (season.results[season.results.length - 1]?.mvp?.reward.kind === 'upgrade') totalUpgrades++
  }
  void mvpCoef
  return {
    champion: isSeasonChampion(season),
    matchesSurvived: season.results.length,
    finalMoney: season.money,
    totalMyGoals: season.results.reduce((s, r) => s + r.myScore, 0),
    totalOppGoals: season.results.reduce((s, r) => s + r.oppScore, 0),
    upgradesEarned: totalUpgrades,
    results: season.results.map(r => ({
      idx: r.idx,
      outcome: r.outcome,
      myScore: r.myScore,
      oppScore: r.oppScore,
    })),
  }
}

export interface SimulationResult {
  matches: number
  wins: number
  losses: number
  draws: number
  avgMyScore: number
  avgOppScore: number
  myScoreDistribution: Record<number, number>
  oppScoreDistribution: Record<number, number>
  mvpByRole: Record<string, number>
  mvpAvgScoreByRole: Record<string, number>
  mvpNoneCount: number
}

export function simulateOne(
  playerCards: readonly Card[],
  opponent: OpponentDeck,
  playerAi: PlayerAi = 'dumb',
  playerKeepers: readonly Keeper[] = PLAYER_KEEPERS,
): MatchState {
  let state = makeFreshMatch(playerCards, playerKeepers, opponent)
  let safety = 50
  const playerFn = playerAi === 'smart' ? smartPlayerActionsV2 : dumbPlayerActions
  while (!state.gameOver && safety-- > 0) {
    state = playerFn(state)
    state = endPlayerTurn(state)
    state = startOpponentTurn(state)
    state = runSimpleOpponentTurn(state)
    state = resolveOpponentForwards(state)
    state = advanceTurn(state)
  }
  return state
}

export function runSimulation(
  playerCards: readonly Card[],
  opponent: OpponentDeck,
  matches: number,
  playerAi: PlayerAi = 'dumb',
  mvpCoef: MvpCoefficients = DEFAULT_COEF,
): SimulationResult {
  let wins = 0
  let losses = 0
  let draws = 0
  let totalMy = 0
  let totalOpp = 0
  const myDist: Record<number, number> = {}
  const oppDist: Record<number, number> = {}
  const mvpByRole: Record<string, number> = { fwd: 0, mid: 0, def: 0 }
  const mvpScoreSum: Record<string, number> = { fwd: 0, mid: 0, def: 0 }
  let mvpNoneCount = 0

  for (let i = 0; i < matches; i++) {
    const final = simulateOne(playerCards, opponent, playerAi)
    const result = decideMatchResult(final)
    if (result === 'win') wins++
    else if (result === 'loss') losses++
    else draws++
    totalMy += final.myScore
    totalOpp += final.oppScore
    myDist[final.myScore] = (myDist[final.myScore] || 0) + 1
    oppDist[final.oppScore] = (oppDist[final.oppScore] || 0) + 1
    const mvp = computeMvp(final, playerCards, mvpCoef)
    if (mvp) {
      mvpByRole[mvp.role] = (mvpByRole[mvp.role] || 0) + 1
      mvpScoreSum[mvp.role] = (mvpScoreSum[mvp.role] || 0) + mvp.score
    } else {
      mvpNoneCount++
    }
  }

  const mvpAvgScoreByRole: Record<string, number> = {}
  for (const role of ['fwd', 'mid', 'def']) {
    mvpAvgScoreByRole[role] = mvpByRole[role] > 0 ? mvpScoreSum[role] / mvpByRole[role] : 0
  }

  return {
    matches,
    wins,
    losses,
    draws,
    avgMyScore: totalMy / matches,
    avgOppScore: totalOpp / matches,
    myScoreDistribution: myDist,
    oppScoreDistribution: oppDist,
    mvpByRole,
    mvpAvgScoreByRole,
    mvpNoneCount,
  }
}
