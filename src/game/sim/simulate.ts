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

export type PlayerAi = 'dumb' | 'smart'

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
