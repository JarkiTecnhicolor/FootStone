import type { MatchState } from '../types'
import type { AttackTarget } from '../rules/combat'
import {
  activateMorph,
  attackWithForward,
  autoTarget,
  isExtraTime,
  playPlayerCard,
  resolvePendingInstantGrant,
  resolvePendingSniper,
  resolvePendingTauntGrant,
} from '../match'
import { chooseSniperTarget, pickBestCardIdx } from './smart-ai'

function pickTauntTarget(state: MatchState): string | null {
  const src = state.pendingTauntGrant?.sourceId
  let best: { id: string; hp: number } | null = null
  for (const d of state.myDefenders) {
    if (d.id === src) continue
    if (d.perks.some(p => p.trigger === 'aura' && p.effect.kind === 'forward_defender')) continue
    if (!best || d.maxHp > best.hp) best = { id: d.id, hp: d.maxHp }
  }
  return best?.id ?? null
}

function pickInstantTarget(state: MatchState): string | null {
  let best: { id: string; atk: number } | null = null
  for (const f of state.myFwds) {
    if (f.perks.some(p => p.trigger === 'self_modifier' && p.effect.kind === 'instant_attack')) continue
    if (!best || f.atk > best.atk) best = { id: f.id, atk: f.atk }
  }
  return best?.id ?? null
}

function maybeActivateMorph(state: MatchState): MatchState {
  if (state.phase !== 'player' || state.pendingSniper) return state
  const morphDef = state.myDefenders.find(d =>
    d.perks.some(p => p.trigger === 'active' && p.effect.kind === 'morph_to_fwd'),
  )
  if (!morphDef) return state
  const turnsLeft = state.maxTurn - state.turn
  if (!isExtraTime(state) && morphDef.hp >= morphDef.maxHp * 0.6) return state
  if (turnsLeft < 1 && !isExtraTime(state)) return state
  const r = activateMorph(state, morphDef.id)
  return r.ok ? r.state : state
}

export function smartPlayerActionsV2(state: MatchState): MatchState {
  let s = state
  for (let safety = 30; safety > 0; safety--) {
    if (s.pendingSniper) {
      const r = resolvePendingSniper(s, chooseSniperTarget(s, 'player'))
      if (!r.ok) break
      s = r.state
      continue
    }
    if (s.pendingTauntGrant) {
      const tid = pickTauntTarget(s)
      if (!tid) { s = { ...s, pendingTauntGrant: null }; continue }
      const r = resolvePendingTauntGrant(s, tid)
      if (!r.ok) { s = { ...s, pendingTauntGrant: null }; continue }
      s = r.state
      continue
    }
    if (s.pendingInstantGrant) {
      const fid = pickInstantTarget(s)
      if (!fid) { s = { ...s, pendingInstantGrant: null }; continue }
      const r = resolvePendingInstantGrant(s, fid)
      if (!r.ok) { s = { ...s, pendingInstantGrant: null }; continue }
      s = r.state
      continue
    }
    const idx = pickBestCardIdx(s, 'player', s.actions)
    if (idx === -1) break
    const r = playPlayerCard(s, idx)
    if (!r.ok) break
    s = r.state
  }
  s = maybeActivateMorph(s)
  for (let safety = 10; safety > 0; safety--) {
    const ready = s.myFwds.find(f => f.status === 'ready_to_attack')
    if (!ready) break
    const target: AttackTarget = autoTarget(s, 'player')
    const r = attackWithForward(s, ready.id, target)
    if (!r.ok) break
    s = r.state
  }
  return s
}
