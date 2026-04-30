import type { Card, MatchState } from '../types'
import { payCost } from '../rules/cost'
import { isBlockedInExtraTime, placeCardOnField } from '../match'

function isFwdSniper(card: Card): boolean {
  return card.perks.some(
    p =>
      p.trigger === 'on_place' &&
      p.effect.kind === 'sniper' &&
      p.effect.target === 'enemy_fwd_first',
  )
}

function pickCardIdx(state: MatchState, oppActions: number): number {
  const playable = (c: Card): boolean =>
    c.cost <= oppActions && !isBlockedInExtraTime(c, state)

  if (state.myFwds.length > 0) {
    const idx = state.oppHand.findIndex(c => isFwdSniper(c) && playable(c))
    if (idx !== -1) return idx
  }
  const order: Card['role'][] = ['fwd', 'mid', 'def']
  for (const role of order) {
    const idx = state.oppHand.findIndex(c => c.role === role && playable(c))
    if (idx !== -1) return idx
  }
  return -1
}

export function pickAndPlaceOneOppCard(
  state: MatchState,
  oppActionsAvailable: number,
): { state: MatchState; remainingActions: number; done: boolean } {
  if (oppActionsAvailable <= 0 || state.oppHand.length === 0) {
    return { state, remainingActions: oppActionsAvailable, done: true }
  }
  const idx = pickCardIdx(state, oppActionsAvailable)
  if (idx === -1) return { state, remainingActions: oppActionsAvailable, done: true }
  const card = state.oppHand[idx]
  const newActions = payCost(oppActionsAvailable, card)
  const newState = placeCardOnField(state, 'opp', idx)
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
