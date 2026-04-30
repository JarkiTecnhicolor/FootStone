import type { Card, MatchState } from '../types'
import type { SniperTargetSelection } from '../perks/dispatch'
import type { AttackTarget } from '../rules/combat'
import { canAfford } from '../rules/cost'
import {
  activateMorph,
  attackWithForward,
  autoTarget,
  isBlockedInExtraTime,
  playPlayerCard,
  resolvePendingSniper,
} from '../match'

function hasAuraAtkBuff(card: Card): boolean {
  return card.perks.some(
    p => p.trigger === 'aura' && p.effect.kind === 'atk_buff' && p.effect.scope === 'all_my_fwds',
  )
}

function isPlaymaker(card: Card): boolean {
  return card.perks.some(
    p => p.trigger === 'aura' && p.effect.kind === 'draw_bonus',
  )
}

function isHiddenGem(card: Card): boolean {
  return card.perks.some(
    p =>
      p.effect.kind === 'atk_buff' &&
      p.effect.scope === 'self' &&
      p.effect.condition?.kind === 'mid_present',
  )
}

function isPlaymakerHungry(card: Card): boolean {
  return card.perks.some(
    p =>
      p.effect.kind === 'atk_buff' &&
      p.effect.condition?.kind === 'playmaker_present',
  )
}

function isInstantFwd(card: Card): boolean {
  return card.role === 'fwd' && card.perks.some(p => p.effect.kind === 'instant_attack')
}

function isUniversalSniper(card: Card): boolean {
  return card.perks.some(
    p =>
      p.trigger === 'on_place' &&
      p.effect.kind === 'sniper' &&
      p.effect.target === 'any_enemy',
  )
}

function isMorphCard(card: Card): boolean {
  return card.perks.some(
    p => p.trigger === 'active' && p.effect.kind === 'morph_to_fwd',
  )
}

function scoreCard(card: Card, state: MatchState): number {
  if (!canAfford(state.actions, card)) return -Infinity
  if (isBlockedInExtraTime(card, state)) return -Infinity

  let s = 0
  const turnsLeft = state.maxTurn - state.turn
  const myMidsCount = state.myMids.length
  const hasBuff = state.myMids.some(hasAuraAtkBuff)
  const hasPlaymaker = state.myMids.some(isPlaymaker)
  const oppFwdCount = state.oppFwds.length
  const myDefCount = state.myDefenders.length

  // FWD scoring
  if (card.role === 'fwd') {
    s += card.atk * 4 // base atk value
    if (isInstantFwd(card)) {
      s += 8 // instant atk same turn = strong
      if (!hasBuff && card.atk <= 2) s -= 10 // Vonyat without buff = waste
    } else {
      // Regular fwd needs next turn — penalize on last turns
      if (turnsLeft <= 1) s -= 30 // can't attack
    }
    if (isHiddenGem(card)) {
      if (myMidsCount > 0) s += 18 // hidden gem +3 huge
      else s -= 25 // wasted potential without mid
    }
    if (isPlaymakerHungry(card)) {
      if (hasPlaymaker) s += 22
      else s -= 8 // suboptimal but still 4 atk
    }
    if (hasBuff && card.atk >= 4) s += 10 // big fwd benefits from buff
    if (card.perks.some(p => p.effect.kind === 'bypass_keeper')) s += 12
    if (card.perks.some(p => p.effect.kind === 'isolation')) s += 8
  }

  // MID scoring
  if (card.role === 'mid') {
    if (hasAuraAtkBuff(card)) {
      const amount = card.perks
        .filter(p => p.trigger === 'aura' && p.effect.kind === 'atk_buff')
        .map(p => (p.effect.kind === 'atk_buff' ? p.effect.amount : 0))
        .reduce((a, b) => Math.max(a, b), 0)
      s += amount * 8
      if (!hasBuff) s += 12 // first buffer is critical
    }
    if (isPlaymaker(card)) {
      const amount = card.perks
        .filter(p => p.trigger === 'aura' && p.effect.kind === 'draw_bonus')
        .map(p => (p.effect.kind === 'draw_bonus' ? p.effect.amount : 0))
        .reduce((a, b) => a + b, 0)
      s += amount * 6
      if (!hasPlaymaker) s += 10 // first playmaker if needed
    }
    if (card.perks.some(p => p.effect.kind === 'damage_reducer')) {
      s += 8
      if (oppFwdCount > 0) s += 5 // more useful when opp has threats
    }
    if (isUniversalSniper(card)) {
      // Sniper especially good against opp's strong aura mid
      const oppHasStrongMid = state.oppMids.some(m =>
        m.perks.some(
          p =>
            p.trigger === 'aura' &&
            p.effect.kind === 'atk_buff' &&
            p.effect.amount >= 2,
        ),
      )
      s += oppHasStrongMid ? 25 : 10
    }
    // Mids only useful while alive — penalize on last turns
    if (turnsLeft <= 1) s -= 15
  }

  // DEF scoring
  if (card.role === 'def') {
    s += card.maxHp * 3
    if (oppFwdCount === 0) s -= 5 // no immediate threat
    if (myDefCount === 0) s += 8 // no current def — need wall
    if (card.perks.some(p => p.effect.kind === 'forward_defender')) {
      s += 12 // taunt is strong
    }
    if (card.perks.some(p => p.effect.kind === 'hp_buff' && p.effect.scope === 'other_defs')) {
      s += myDefCount * 3 // captain effect scales with existing defs
    }
    if (isMorphCard(card)) s += 6 // versatile
    // Trap check — Acerbe-like vs Mudruk-like opponents
    if (card.maxHp === 1) {
      const oppHasHp1Counter = [...state.oppFwds, ...state.oppHand].some(c =>
        c.perks.some(
          p =>
            p.effect.kind === 'atk_buff' &&
            p.effect.condition?.kind === 'enemy_def_hp_eq',
        ),
      )
      if (oppHasHp1Counter) s -= 8
    }
  }

  // Cost efficiency — slight penalty for using all actions on one card if hand is full
  if (state.hand.length >= 6 && card.cost === state.actions) s -= 3

  return s
}

function pickSniperTarget(state: MatchState): SniperTargetSelection {
  for (let i = 0; i < state.oppMids.length; i++) {
    const m = state.oppMids[i]
    if (
      m.perks.some(
        p =>
          p.trigger === 'aura' &&
          p.effect.kind === 'atk_buff' &&
          p.effect.amount >= 2,
      )
    ) {
      return { kind: 'mid', idx: i }
    }
  }
  for (let i = 0; i < state.oppMids.length; i++) {
    const m = state.oppMids[i]
    if (
      m.perks.some(
        p =>
          p.trigger === 'aura' &&
          (p.effect.kind === 'atk_buff' ||
            p.effect.kind === 'damage_reducer' ||
            p.effect.kind === 'draw_bonus'),
      )
    ) {
      return { kind: 'mid', idx: i }
    }
  }
  if (state.oppFwds.length > 0) {
    let bestIdx = 0
    for (let i = 1; i < state.oppFwds.length; i++) {
      if (state.oppFwds[i].atk > state.oppFwds[bestIdx].atk) bestIdx = i
    }
    return { kind: 'fwd', idx: bestIdx }
  }
  if (state.oppDefenders.length > 0) {
    let bestIdx = 0
    for (let i = 1; i < state.oppDefenders.length; i++) {
      if (state.oppDefenders[i].hp > state.oppDefenders[bestIdx].hp) bestIdx = i
    }
    return { kind: 'def', idx: bestIdx }
  }
  return { kind: 'def', idx: 0 }
}

function maybeActivateMorph(state: MatchState): MatchState {
  if (state.phase !== 'player' || state.pendingSniper) return state
  const morphDef = state.myDefenders.find(d => isMorphCard(d))
  if (!morphDef) return state
  const turnsLeft = state.maxTurn - state.turn
  if (turnsLeft >= 1) {
    const r = activateMorph(state, morphDef.id)
    if (r.ok) return r.state
  }
  return state
}

function isBadPlayNow(card: Card, state: MatchState): boolean {
  const hasBuff = state.myMids.some(hasAuraAtkBuff)
  const hasPlaymaker = state.myMids.some(isPlaymaker)
  const hasMid = state.myMids.length > 0
  const turnsLeft = state.maxTurn - state.turn
  if (isHiddenGem(card) && !hasMid) return true
  if (isInstantFwd(card) && !hasBuff && card.role === 'fwd' && card.atk <= 2) return true
  if (isPlaymakerHungry(card) && !hasPlaymaker) return true
  if (card.role === 'fwd' && !isInstantFwd(card) && turnsLeft <= 1) return true
  if (card.role === 'def' && card.maxHp === 1) {
    const oppHasHp1Counter = [...state.oppFwds, ...state.oppHand].some(c =>
      c.perks.some(
        p =>
          p.effect.kind === 'atk_buff' && p.effect.condition?.kind === 'enemy_def_hp_eq',
      ),
    )
    if (oppHasHp1Counter) return true
  }
  return false
}

function pickBestCardIdx(state: MatchState): number {
  const hand = state.hand
  const playable = (c: Card): boolean =>
    canAfford(state.actions, c) && !isBlockedInExtraTime(c, state)

  // Phase 1: pick highest-score among NON-bad plays
  let bestIdx = -1
  let bestScore = -Infinity
  for (let i = 0; i < hand.length; i++) {
    const c = hand[i]
    if (!playable(c)) continue
    if (isBadPlayNow(c, state)) continue
    const sc = scoreCard(c, state)
    if (sc > bestScore) {
      bestScore = sc
      bestIdx = i
    }
  }
  if (bestIdx >= 0) return bestIdx

  // Phase 2: fallback — any playable card (allows "bad" if nothing else)
  for (let i = 0; i < hand.length; i++) {
    if (playable(hand[i])) return i
  }
  return -1
}

export function smartPlayerActions(state: MatchState): MatchState {
  let s = state

  for (let safety = 30; safety > 0; safety--) {
    if (s.pendingSniper) {
      const r = resolvePendingSniper(s, pickSniperTarget(s))
      if (!r.ok) break
      s = r.state
      continue
    }
    const idx = pickBestCardIdx(s)
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
