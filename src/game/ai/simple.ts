import type { MatchState } from '../types'
import { payCost } from '../rules/cost'
import { placeCardOnField, resolveOppPendingSniper, resolveOppPendingTauntGrant } from '../match'
import { pickBestCardIdx } from './smart-ai'

export function pickAndPlaceOneOppCard(
  state: MatchState,
  oppActionsAvailable: number,
): { state: MatchState; remainingActions: number; done: boolean } {
  if (oppActionsAvailable <= 0 || state.oppHand.length === 0) {
    return { state, remainingActions: oppActionsAvailable, done: true }
  }
  const idx = pickBestCardIdx(state, 'opp', oppActionsAvailable)
  if (idx === -1) return { state, remainingActions: oppActionsAvailable, done: true }
  const card = state.oppHand[idx]
  const newActions = payCost(oppActionsAvailable, card)
  let newState = placeCardOnField(state, 'opp', idx)
  if (newState.pendingSniper) {
    newState = resolveOppPendingSniper(newState)
  }
  if (newState.pendingTauntGrant) {
    newState = resolveOppPendingTauntGrant(newState)
  }
  return { state: newState, remainingActions: newActions, done: false }
}

export function runSimpleOpponentTurn(state: MatchState): MatchState {
  let s = state
  let oppActions = s.maxActions
  for (let safety = 20; safety > 0; safety--) {
    const r = pickAndPlaceOneOppCard(s, oppActions)
    if (r.done) break
    s = r.state
    oppActions = r.remainingActions
  }
  return s
}
