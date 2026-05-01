import type { MatchState } from '../types'
import type { SniperTargetSelection } from '../perks/dispatch'
import {
  attackWithForward,
  autoTarget,
  playPlayerCard,
  resolvePendingInstantGrant,
  resolvePendingSniper,
  resolvePendingTauntGrant,
} from '../match'

function pickSniperTarget(state: MatchState): SniperTargetSelection {
  if (state.oppDefenders.length > 0) return { kind: 'def', idx: 0 }
  if (state.oppMids.length > 0) return { kind: 'mid', idx: 0 }
  return { kind: 'fwd', idx: 0 }
}

function pickTauntTarget(state: MatchState): string | null {
  const src = state.pendingTauntGrant?.sourceId
  for (const d of state.myDefenders) {
    if (d.id === src) continue
    if (d.perks.some(p => p.trigger === 'aura' && p.effect.kind === 'forward_defender')) continue
    return d.id
  }
  return null
}

function pickInstantTarget(state: MatchState): string | null {
  for (const f of state.myFwds) {
    if (!f.perks.some(p => p.trigger === 'self_modifier' && p.effect.kind === 'instant_attack')) {
      return f.id
    }
  }
  return null
}

export function dumbPlayerActions(state: MatchState): MatchState {
  let s = state

  for (let safety = 30; safety > 0; safety--) {
    if (s.pendingSniper) {
      const r = resolvePendingSniper(s, pickSniperTarget(s))
      if (!r.ok) break
      s = r.state
      continue
    }
    if (s.pendingTauntGrant) {
      const tid = pickTauntTarget(s)
      if (!tid) {
        s = { ...s, pendingTauntGrant: null }
        continue
      }
      const r = resolvePendingTauntGrant(s, tid)
      if (!r.ok) { s = { ...s, pendingTauntGrant: null }; continue }
      s = r.state
      continue
    }
    if (s.pendingInstantGrant) {
      const fid = pickInstantTarget(s)
      if (!fid) {
        s = { ...s, pendingInstantGrant: null }
        continue
      }
      const r = resolvePendingInstantGrant(s, fid)
      if (!r.ok) { s = { ...s, pendingInstantGrant: null }; continue }
      s = r.state
      continue
    }

    let placed = false
    for (let i = 0; i < s.hand.length; i++) {
      const r = playPlayerCard(s, i)
      if (r.ok) {
        s = r.state
        placed = true
        break
      }
    }
    if (!placed) break
  }

  for (let safety = 10; safety > 0; safety--) {
    const ready = s.myFwds.find(f => f.status === 'ready_to_attack')
    if (!ready) break
    const r = attackWithForward(s, ready.id, autoTarget(s, 'player'))
    if (!r.ok) break
    s = r.state
  }

  return s
}
