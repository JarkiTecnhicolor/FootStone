import type {
  Card,
  DefenderCard,
  ForwardCard,
  Keeper,
  MatchState,
  MidfielderCard,
  Side,
} from '../types'
import type { SniperTarget } from '../perks/types'
import type { SniperTargetSelection } from '../perks/dispatch'
import { calculateAtk } from '../rules/combat'
import { isBlockedInExtraTime, isExtraTime } from '../match'
import { isInvulnerable } from '../perks/dispatch'

export interface SideView {
  ownDefs: readonly DefenderCard[]
  ownMids: readonly MidfielderCard[]
  ownFwds: readonly ForwardCard[]
  enemyDefs: readonly DefenderCard[]
  enemyMids: readonly MidfielderCard[]
  enemyFwds: readonly ForwardCard[]
  ownHand: readonly Card[]
  enemyKeeper: Keeper
}

export function viewFor(state: MatchState, side: Side): SideView {
  if (side === 'player') {
    return {
      ownDefs: state.myDefenders,
      ownMids: state.myMids,
      ownFwds: state.myFwds,
      enemyDefs: state.oppDefenders,
      enemyMids: state.oppMids,
      enemyFwds: state.oppFwds,
      ownHand: state.hand,
      enemyKeeper: state.oppKeeper,
    }
  }
  return {
    ownDefs: state.oppDefenders,
    ownMids: state.oppMids,
    ownFwds: state.oppFwds,
    enemyDefs: state.myDefenders,
    enemyMids: state.myMids,
    enemyFwds: state.myFwds,
    ownHand: state.oppHand,
    enemyKeeper: state.myKeeper,
  }
}

function scoreDef(d: DefenderCard, view: SideView): number {
  let s = d.maxHp * 1.4
  if (view.ownDefs.length === 0 && view.enemyFwds.length > 0) s += 6
  if (view.ownDefs.length === 0) s += 2
  s -= view.ownDefs.length * 0.7

  for (const p of d.perks) {
    const e = p.effect
    if (e.kind === 'forward_defender') s += 3
    if (e.kind === 'summon_def_from_hand') {
      const others = view.ownHand.filter(c => c.role === 'def' && c.id !== d.id).length
      s += others * 1.4
    }
    if (e.kind === 'hp_buff' && p.trigger === 'on_place' && e.scope === 'other_defs') {
      s += e.amount * Math.max(1, view.ownDefs.length)
    }
    if (e.kind === 'intimidate' && view.enemyFwds.length >= e.threshold) {
      s += e.amount * 2
    }
  }
  return s
}

function sniperValue(view: SideView, target: SniperTarget): number {
  if (target === 'enemy_fwd_first') {
    const f = view.enemyFwds.find(c => !isInvulnerable(c))
    if (!f) return view.enemyFwds.length > 0 ? -2 : -4
    return 4 + f.atk * 0.6
  }
  let best = 0
  const all: Card[] = [...view.enemyDefs, ...view.enemyMids, ...view.enemyFwds]
  for (const c of all) {
    if (isInvulnerable(c)) continue
    let v = c.cost * 1.0
    if (c.role === 'mid') {
      if (
        c.perks.some(
          p =>
            p.trigger === 'aura' &&
            (p.effect.kind === 'atk_buff' ||
              p.effect.kind === 'draw_bonus' ||
              p.effect.kind === 'damage_reducer'),
        )
      ) v += 3
    }
    if (c.role === 'fwd') v += c.atk * 0.5
    best = Math.max(best, v)
  }
  return best > 0 ? best + 2 : -3
}

function scoreMid(m: MidfielderCard, view: SideView, state: MatchState): number {
  let s = m.maxStamina * 0.7
  s -= view.ownMids.length * 0.6

  const fwdsOnField = view.ownFwds.length
  const fwdsInHand = view.ownHand.filter(c => c.role === 'fwd').length
  const expectedFwds = Math.min(3, fwdsOnField + Math.min(2, fwdsInHand))
  const turnsLeft = Math.max(1, state.maxTurn - state.turn)
  const lifetime = Math.min(m.maxStamina, turnsLeft)

  for (const p of m.perks) {
    const e = p.effect
    if (p.trigger === 'aura' && e.kind === 'atk_buff' && e.scope === 'all_my_fwds') {
      s += e.amount * Math.max(1, expectedFwds) * lifetime * 0.45
    }
    if (p.trigger === 'aura' && e.kind === 'draw_bonus') {
      s += e.amount * lifetime * 1.4
    }
    if (p.trigger === 'aura' && e.kind === 'damage_reducer') {
      s += e.amount * Math.max(1, view.enemyFwds.length) * lifetime * 0.5
    }
    if (p.trigger === 'on_place' && e.kind === 'sniper') {
      s += sniperValue(view, e.target)
    }
    if (p.trigger === 'on_place' && e.kind === 'hp_buff' && e.scope === 'other_defs') {
      s += e.amount * view.ownDefs.length
    }
  }
  return s
}

function scoreFwd(f: ForwardCard, view: SideView, state: MatchState): number {
  if (isExtraTime(state)) {
    const instant = f.perks.some(p => p.effect.kind === 'instant_attack')
    if (!instant) return -100
  }

  const eff = calculateAtk(
    f,
    view.ownMids as MidfielderCard[],
    view.enemyDefs as DefenderCard[],
    view.ownFwds.length + 1,
    view.ownFwds,
  ).finalAtk
  const keeperSave = view.enemyKeeper.save
  let s = eff * 1.1
  if (eff > keeperSave) s += 4.5
  else if (eff <= keeperSave - 1) s -= 2

  for (const p of f.perks) {
    const e = p.effect
    if (e.kind === 'instant_attack') s += 3
    if (e.kind === 'bypass_keeper') s += 5
    if (e.kind === 'isolation') s += 2
    if (e.kind === 'invulnerable') s += 3
  }

  const turnsLeft = state.maxTurn - state.turn
  const instant = f.perks.some(p => p.effect.kind === 'instant_attack')
  if (!instant && turnsLeft <= 0) s -= 20
  return s
}

export function scoreCard(c: Card, state: MatchState, side: Side): number {
  const view = viewFor(state, side)
  if (c.role === 'def') return scoreDef(c, view)
  if (c.role === 'mid') return scoreMid(c, view, state)
  return scoreFwd(c, view, state)
}

export function pickBestCardIdx(
  state: MatchState,
  side: Side,
  availableActions: number,
): number {
  const view = viewFor(state, side)
  let bestIdx = -1
  let bestScore = -Infinity
  for (let i = 0; i < view.ownHand.length; i++) {
    const c = view.ownHand[i]
    if (c.cost > availableActions) continue
    if (isBlockedInExtraTime(c, state)) continue
    const s = scoreCard(c, state, side) - c.cost * 0.35
    if (s > bestScore) {
      bestScore = s
      bestIdx = i
    }
  }
  return bestIdx
}

export function chooseSniperTarget(state: MatchState, side: Side): SniperTargetSelection {
  const view = viewFor(state, side)
  for (let i = 0; i < view.enemyMids.length; i++) {
    const m = view.enemyMids[i]
    if (isInvulnerable(m)) continue
    if (
      m.perks.some(
        p =>
          p.trigger === 'aura' &&
          (p.effect.kind === 'atk_buff' ||
            p.effect.kind === 'draw_bonus' ||
            p.effect.kind === 'damage_reducer'),
      )
    ) {
      return { kind: 'mid', idx: i }
    }
  }
  let bestFwd = -1
  let bestFwdAtk = -1
  for (let i = 0; i < view.enemyFwds.length; i++) {
    const f = view.enemyFwds[i]
    if (isInvulnerable(f)) continue
    if (f.atk > bestFwdAtk) {
      bestFwd = i
      bestFwdAtk = f.atk
    }
  }
  if (bestFwd >= 0) return { kind: 'fwd', idx: bestFwd }
  let bestDef = -1
  let bestDefHp = -1
  for (let i = 0; i < view.enemyDefs.length; i++) {
    const d = view.enemyDefs[i]
    if (isInvulnerable(d)) continue
    if (d.hp > bestDefHp) {
      bestDef = i
      bestDefHp = d.hp
    }
  }
  if (bestDef >= 0) return { kind: 'def', idx: bestDef }
  if (view.enemyMids.length > 0) return { kind: 'mid', idx: 0 }
  if (view.enemyFwds.length > 0) return { kind: 'fwd', idx: 0 }
  return { kind: 'def', idx: 0 }
}
