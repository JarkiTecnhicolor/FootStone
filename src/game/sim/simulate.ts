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

export interface SimulationResult {
  matches: number
  wins: number
  losses: number
  draws: number
  avgMyScore: number
  avgOppScore: number
  myScoreDistribution: Record<number, number>
  oppScoreDistribution: Record<number, number>
}

export function simulateOne(
  playerCards: readonly Card[],
  opponent: OpponentDeck,
  playerKeepers: readonly Keeper[] = PLAYER_KEEPERS,
): MatchState {
  let state = makeFreshMatch(playerCards, playerKeepers, opponent)
  let safety = 50
  while (!state.gameOver && safety-- > 0) {
    state = dumbPlayerActions(state)
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
): SimulationResult {
  let wins = 0
  let losses = 0
  let draws = 0
  let totalMy = 0
  let totalOpp = 0
  const myDist: Record<number, number> = {}
  const oppDist: Record<number, number> = {}

  for (let i = 0; i < matches; i++) {
    const final = simulateOne(playerCards, opponent)
    const result = decideMatchResult(final)
    if (result === 'win') wins++
    else if (result === 'loss') losses++
    else draws++
    totalMy += final.myScore
    totalOpp += final.oppScore
    myDist[final.myScore] = (myDist[final.myScore] || 0) + 1
    oppDist[final.oppScore] = (oppDist[final.oppScore] || 0) + 1
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
  }
}
