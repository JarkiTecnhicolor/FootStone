import {
  ACTION_PROGRESSION,
  EXTRA_TIME_TURNS,
  HALFTIME_AFTER_TURN,
  HALFTIME_DRAW_BONUS,
  INITIAL_HAND,
  MAX_TURN,
  OPP_HAND_START,
} from '../data/constants'
import { cloneCard, shuffle } from './lib'
import { calcDrawCount, drawN } from './rules/draw'
import { canAfford, payCost } from './rules/cost'
import { decayMids } from './rules/stamina'
import {
  hasBypass,
  hasInstantAttack,
  resolveAttack,
  validAttackTargetIndices,
  type AttackTarget,
  type ChemistryBonuses,
} from './rules/combat'
import { CHEMISTRY_THRESHOLD, countByNation } from './chemistry'
import {
  applyOnPlacePerks,
  applySniperChoice,
  isInvulnerable,
  type FieldSnapshot,
  type SniperTargetSelection,
} from './perks/dispatch'
import type {
  Card,
  DefenderCard,
  ForwardCard,
  ForwardStatus,
  Keeper,
  MatchState,
  MidfielderCard,
  OpponentDeck,
  Side,
} from './types'
import type { Perk } from './perks/types'

export type PlayResult =
  | { ok: true; state: MatchState }
  | { ok: false; reason: string }

export function makeFreshMatch(
  playerCollection: readonly Card[],
  playerKeepers: readonly Keeper[],
  opp: OpponentDeck,
): MatchState {
  const targetSize = Math.min(opp.cards.length, playerCollection.length)
  const playerShuffled = shuffle(playerCollection)
    .slice(0, targetSize)
    .map(cloneCard)
  const oppShuffled = shuffle(opp.cards.map(cloneCard))
  const myKeeper = pickRandomKeeper(playerKeepers)
  const oppKeeper = pickRandomKeeper(opp.keepers)
  return {
    turn: 1,
    maxTurn: MAX_TURN,
    actions: ACTION_PROGRESSION[0],
    maxActions: ACTION_PROGRESSION[0],
    oppName: opp.name,
    myKeeper,
    oppKeeper,
    myScore: 0,
    oppScore: 0,
    myDefenders: [],
    myMids: [],
    myFwds: [],
    oppDefenders: [],
    oppMids: [],
    oppFwds: [],
    hand: playerShuffled.slice(0, INITIAL_HAND),
    deck: playerShuffled.slice(INITIAL_HAND),
    discard: [],
    oppHand: oppShuffled.slice(0, OPP_HAND_START),
    oppDeck: oppShuffled.slice(OPP_HAND_START),
    oppDiscard: [],
    log: [`Матч проти ${opp.name}.`],
    gameOver: false,
    phase: 'player',
    firstTurn: true,
    pendingSniper: null,
    pendingTauntGrant: null,
    pendingInstantGrant: null,
    goalsByFwd: {},
    damageDealtByFwd: {},
    damageAbsorbedByDef: {},
    teamGoalsWhileAlive: {},
    oppGoalsWhileAlive: {},
    sniperKillsByCard: {},
    englandTurnBonus: 0,
  }
}

function pickRandomKeeper(keepers: readonly Keeper[]): Keeper {
  if (keepers.length === 0) {
    throw new Error('makeFreshMatch: keepers collection is empty')
  }
  const idx = Math.floor(Math.random() * keepers.length)
  return { ...keepers[idx] }
}

function hasDyingCaptain(d: DefenderCard): boolean {
  return d.perks.some(
    p => p.trigger === 'on_death' && p.effect.kind === 'summon_def_from_hand',
  )
}

function deployRandomDefFromHand(state: MatchState, side: Side): MatchState {
  const hand = side === 'player' ? state.hand : state.oppHand
  const defIndices: number[] = []
  hand.forEach((c, i) => { if (c.role === 'def') defIndices.push(i) })
  const owner = side === 'player' ? 'Ти' : 'Опонент'
  if (defIndices.length === 0) {
    return {
      ...state,
      log: [...state.log, `${owner}: ПОМИРАЮЧИЙ КАПІТАН — нема захисника в руці.`],
    }
  }
  const pickIdx = defIndices[Math.floor(Math.random() * defIndices.length)]
  const card = hand[pickIdx]
  const next = placeCardOnField(state, side, pickIdx)
  return {
    ...next,
    log: [...next.log, `${owner}: ПОМИРАЮЧИЙ КАПІТАН викликає ${card.name} на поле!`],
  }
}

function drainDyingCaptains(state: MatchState, side: Side): MatchState {
  const count = side === 'player'
    ? state.pendingDyingCaptainPlayer ?? 0
    : state.pendingDyingCaptainOpp ?? 0
  if (count === 0) return state
  let s: MatchState = side === 'player'
    ? { ...state, pendingDyingCaptainPlayer: 0 }
    : { ...state, pendingDyingCaptainOpp: 0 }
  for (let i = 0; i < count; i++) {
    s = deployRandomDefFromHand(s, side)
  }
  return s
}

function queueDyingCaptains(
  state: MatchState,
  before: readonly DefenderCard[],
  after: readonly DefenderCard[],
  ownerSide: Side,
): MatchState {
  let count = 0
  for (const d of before) {
    if (after.some(a => a.id === d.id)) continue
    if (hasDyingCaptain(d)) count++
  }
  if (count === 0) return state
  if (ownerSide === 'player') {
    return { ...state, pendingDyingCaptainPlayer: (state.pendingDyingCaptainPlayer ?? 0) + count }
  }
  return { ...state, pendingDyingCaptainOpp: (state.pendingDyingCaptainOpp ?? 0) + count }
}

function fieldFor(state: MatchState, side: Side): FieldSnapshot {
  if (side === 'player') {
    return {
      ownDefenders: state.myDefenders,
      ownMids: state.myMids,
      ownFwds: state.myFwds,
      enemyDefenders: state.oppDefenders,
      enemyMids: state.oppMids,
      enemyFwds: state.oppFwds,
    }
  }
  return {
    ownDefenders: state.oppDefenders,
    ownMids: state.oppMids,
    ownFwds: state.oppFwds,
    enemyDefenders: state.myDefenders,
    enemyMids: state.myMids,
    enemyFwds: state.myFwds,
  }
}

function instantiate(card: Card, turn: number): Card {
  if (card.role === 'def') {
    const base = card.baseMaxHp ?? card.maxHp
    return {
      ...card,
      hp: base,
      maxHp: base,
      baseMaxHp: base,
      appliedHpBuffs: [],
    }
  }
  if (card.role === 'mid') return { ...card, stamina: card.maxStamina, turnPlaced: turn }
  const status: ForwardStatus = hasInstantAttack(card) ? 'ready_to_attack' : 'attacking_next'
  return { ...card, status }
}

function cleanForDiscard(card: Card): Card {
  if (card.role === 'def') {
    const base = card.baseMaxHp ?? card.maxHp
    const cleaned: DefenderCard = { ...card, hp: base, maxHp: base }
    delete cleaned.baseMaxHp
    delete cleaned.appliedHpBuffs
    return cleaned
  }
  if (card.role === 'mid') {
    const cleaned: MidfielderCard = { ...card, stamina: card.maxStamina }
    delete cleaned.turnPlaced
    return cleaned
  }
  if (card.morphedFrom) {
    const restored: DefenderCard = {
      id: card.id,
      name: card.name,
      role: 'def',
      cost: card.cost,
      rarity: card.rarity,
      unique: card.unique,
      hp: card.morphedFrom.maxHp,
      maxHp: card.morphedFrom.maxHp,
      perks: card.morphedFrom.perks,
    }
    return restored
  }
  const fwd: ForwardCard = { ...card }
  delete fwd.status
  delete fwd.jokerArmed
  return fwd
}

export function placeCardOnField(state: MatchState, side: Side, handIdx: number): MatchState {
  const hand = side === 'player' ? state.hand : state.oppHand
  const card = hand[handIdx]
  if (!card) throw new Error(`placeCardOnField: bad index ${handIdx}`)

  let fresh = instantiate(card, state.turn)
  const newHand = hand.filter((_, i) => i !== handIdx)
  const actor = side === 'player' ? 'Ти' : 'Опонент'

  if (fresh.role === 'fwd' && newHand.length === 0) {
    const hasJoker = fresh.perks.some(
      p =>
        p.trigger === 'self_modifier' &&
        p.effect.kind === 'atk_buff' &&
        p.effect.scope === 'self' &&
        p.effect.condition?.kind === 'last_in_hand',
    )
    if (hasJoker) fresh = { ...fresh, jokerArmed: true }
  }

  let myDefs = side === 'player' ? state.myDefenders : state.oppDefenders
  let myMids = side === 'player' ? state.myMids : state.oppMids
  let myFwds = side === 'player' ? state.myFwds : state.oppFwds
  if (fresh.role === 'def') myDefs = [...myDefs, fresh]
  else if (fresh.role === 'mid') myMids = [...myMids, fresh]
  else myFwds = [...myFwds, fresh]

  const intermediate: MatchState = {
    ...state,
    [side === 'player' ? 'hand' : 'oppHand']: newHand,
    [side === 'player' ? 'myDefenders' : 'oppDefenders']: myDefs,
    [side === 'player' ? 'myMids' : 'oppMids']: myMids,
    [side === 'player' ? 'myFwds' : 'oppFwds']: myFwds,
    log: [...state.log, `${actor}: виставив ${fresh.name} (${fresh.role.toUpperCase()}).`],
  }

  const placement = applyOnPlacePerks(fresh, fieldFor(intermediate, side))

  let after: MatchState =
    side === 'player'
      ? { ...intermediate, myDefenders: placement.ownDefenders }
      : { ...intermediate, oppDefenders: placement.ownDefenders }

  if (placement.card !== fresh && placement.card.role !== 'def') {
    after = replaceOnField(after, side, fresh.id, placement.card)
  }

  if (placement.enemyDiscard.length > 0) {
    after = applySniperSideEffects(after, side, placement)
    if (side === 'player') {
      after = {
        ...after,
        sniperKillsByCard: {
          ...after.sniperKillsByCard,
          [fresh.id]: (after.sniperKillsByCard[fresh.id] ?? 0) + placement.enemyDiscard.length,
        },
      }
    }
  }

  after = {
    ...after,
    log: [...after.log, ...placement.log],
  }

  if (placement.pendingSniperChoice) {
    after = { ...after, pendingSniper: { sourceId: fresh.id } }
  }
  if (placement.pendingTauntGrantChoice) {
    after = { ...after, pendingTauntGrant: { sourceId: fresh.id } }
  }
  if (placement.pendingInstantGrantChoice) {
    after = { ...after, pendingInstantGrant: { sourceId: fresh.id } }
  }

  return after
}

function replaceOnField(state: MatchState, side: Side, cardId: string, replacement: Card): MatchState {
  const replace = <T extends Card>(arr: T[]): T[] =>
    arr.map(c => (c.id === cardId ? (replacement as T) : c))
  if (side === 'player') {
    return {
      ...state,
      myDefenders: replace(state.myDefenders),
      myMids: replace(state.myMids),
      myFwds: replace(state.myFwds),
    }
  }
  return {
    ...state,
    oppDefenders: replace(state.oppDefenders),
    oppMids: replace(state.oppMids),
    oppFwds: replace(state.oppFwds),
  }
}

function applySniperSideEffects(
  state: MatchState,
  placerSide: Side,
  placement: ReturnType<typeof applyOnPlacePerks>,
): MatchState {
  const enemySide: Side = placerSide === 'player' ? 'opp' : 'player'
  const enemyDiscardKey = enemySide === 'player' ? 'discard' : 'oppDiscard'
  const enemyDefsKey = enemySide === 'player' ? 'myDefenders' : 'oppDefenders'
  const enemyMidsKey = enemySide === 'player' ? 'myMids' : 'oppMids'
  const enemyFwdsKey = enemySide === 'player' ? 'myFwds' : 'oppFwds'

  const beforeDefs = state[enemyDefsKey] as DefenderCard[]
  let next: MatchState = {
    ...state,
    [enemyDefsKey]: placement.enemyDefenders,
    [enemyMidsKey]: placement.enemyMids,
    [enemyFwdsKey]: placement.enemyFwds,
    [enemyDiscardKey]: [
      ...state[enemyDiscardKey],
      ...placement.enemyDiscard.map(cleanForDiscard),
    ],
  }
  next = queueDyingCaptains(next, beforeDefs, placement.enemyDefenders, enemySide)
  return next
}

export type TauntGrantTarget = { defId: string }

export function resolvePendingTauntGrant(
  state: MatchState,
  defId: string,
): PlayResult {
  if (!state.pendingTauntGrant) return { ok: false, reason: 'no_pending_taunt' }
  const sourceId = state.pendingTauntGrant.sourceId
  if (defId === sourceId) return { ok: false, reason: 'cannot_target_self' }
  const isPlayerSide = state.myDefenders.some(d => d.id === sourceId)
  const ownDefs = isPlayerSide ? state.myDefenders : state.oppDefenders
  const target = ownDefs.find(d => d.id === defId)
  if (!target) return { ok: false, reason: 'target_not_found' }
  if (
    target.perks.some(p => p.trigger === 'aura' && p.effect.kind === 'forward_defender')
  ) {
    return { ok: false, reason: 'already_taunt' }
  }
  const grantedPerk: Perk = {
    trigger: 'aura',
    effect: { kind: 'forward_defender' },
    label: 'ВИСУНУТИЙ ЗАХИСНИК (від лідера): форварди змушені атакувати першим',
  }
  const updated: DefenderCard = { ...target, perks: [...target.perks, grantedPerk] }
  const log = `ПІДСТРАХОВКА: ${target.name} стає ВИСУНУТИМ ЗАХИСНИКОМ.`
  if (isPlayerSide) {
    return {
      ok: true,
      state: {
        ...state,
        myDefenders: state.myDefenders.map(d => (d.id === defId ? updated : d)),
        log: [...state.log, log],
        pendingTauntGrant: null,
      },
    }
  }
  return {
    ok: true,
    state: {
      ...state,
      oppDefenders: state.oppDefenders.map(d => (d.id === defId ? updated : d)),
      log: [...state.log, log],
      pendingTauntGrant: null,
    },
  }
}

export function resolveOppPendingTauntGrant(state: MatchState): MatchState {
  if (!state.pendingTauntGrant) return state
  const sourceId = state.pendingTauntGrant.sourceId
  const eligible = state.oppDefenders.filter(
    d =>
      d.id !== sourceId &&
      !d.perks.some(p => p.trigger === 'aura' && p.effect.kind === 'forward_defender'),
  )
  if (eligible.length === 0) {
    return { ...state, pendingTauntGrant: null }
  }
  let best = eligible[0]
  for (const d of eligible) {
    if (d.maxHp > best.maxHp) best = d
  }
  const r = resolvePendingTauntGrant(state, best.id)
  return r.ok ? r.state : { ...state, pendingTauntGrant: null }
}

export function resolvePendingInstantGrant(
  state: MatchState,
  fwdId: string,
): PlayResult {
  if (!state.pendingInstantGrant) return { ok: false, reason: 'no_pending_instant' }
  const sourceId = state.pendingInstantGrant.sourceId
  const isPlayerSide = state.myFwds.some(f => f.id === fwdId) ||
    state.myDefenders.some(d => d.id === sourceId) ||
    state.myMids.some(m => m.id === sourceId)
  const ownFwds = isPlayerSide ? state.myFwds : state.oppFwds
  const target = ownFwds.find(f => f.id === fwdId)
  if (!target) return { ok: false, reason: 'target_not_found' }
  if (
    target.perks.some(p => p.trigger === 'self_modifier' && p.effect.kind === 'instant_attack')
  ) {
    return { ok: false, reason: 'already_instant' }
  }
  const grantedPerk: Perk = {
    trigger: 'self_modifier',
    effect: { kind: 'instant_attack' },
    label: 'АТАКА ПЕРШИМ ТЕМПОМ (від плеймейкера): б\'є на поточному ході',
  }
  const updated: ForwardCard = {
    ...target,
    perks: [...target.perks, grantedPerk],
    status: 'ready_to_attack',
  }
  const log = `АСИСТ: ${target.name} отримує АТАКА ПЕРШИМ ТЕМПОМ.`
  if (isPlayerSide) {
    return {
      ok: true,
      state: {
        ...state,
        myFwds: state.myFwds.map(f => (f.id === fwdId ? updated : f)),
        log: [...state.log, log],
        pendingInstantGrant: null,
      },
    }
  }
  return {
    ok: true,
    state: {
      ...state,
      oppFwds: state.oppFwds.map(f => (f.id === fwdId ? updated : f)),
      log: [...state.log, log],
      pendingInstantGrant: null,
    },
  }
}

export function resolveOppPendingInstantGrant(state: MatchState): MatchState {
  if (!state.pendingInstantGrant) return state
  const eligible = state.oppFwds.filter(
    f =>
      !f.perks.some(p => p.trigger === 'self_modifier' && p.effect.kind === 'instant_attack'),
  )
  if (eligible.length === 0) {
    return { ...state, pendingInstantGrant: null }
  }
  // Pick highest-atk fwd
  let best = eligible[0]
  for (const f of eligible) {
    if (f.atk > best.atk) best = f
  }
  const r = resolvePendingInstantGrant(state, best.id)
  return r.ok ? r.state : { ...state, pendingInstantGrant: null }
}

export function resolveOppPendingSniper(state: MatchState): MatchState {
  if (!state.pendingSniper) return state
  const sourceId = state.pendingSniper.sourceId
  const source =
    state.oppMids.find(c => c.id === sourceId) ??
    state.oppDefenders.find(c => c.id === sourceId) ??
    state.oppFwds.find(c => c.id === sourceId)
  if (!source) {
    return { ...state, pendingSniper: null }
  }

  const candidates: Array<{ sel: SniperTargetSelection; card: Card }> = []
  state.myFwds.forEach((c, i) => {
    if (!isInvulnerable(c)) candidates.push({ sel: { kind: 'fwd', idx: i }, card: c })
  })
  state.myMids.forEach((c, i) => {
    if (!isInvulnerable(c)) candidates.push({ sel: { kind: 'mid', idx: i }, card: c })
  })
  state.myDefenders.forEach((c, i) => {
    if (!isInvulnerable(c)) candidates.push({ sel: { kind: 'def', idx: i }, card: c })
  })

  if (candidates.length === 0) {
    return {
      ...state,
      pendingSniper: null,
      log: [...state.log, `${source.name}: немає вразливої цілі — перка пропадає.`],
    }
  }

  const roleScore = (kind: SniperTargetSelection['kind']): number =>
    kind === 'fwd' ? 1 : kind === 'mid' ? 0.5 : 0
  let best = candidates[0]
  for (let i = 1; i < candidates.length; i++) {
    const a = candidates[i].card.cost + roleScore(candidates[i].sel.kind)
    const b = best.card.cost + roleScore(best.sel.kind)
    if (a > b) best = candidates[i]
  }

  const result = applySniperChoice(source, fieldFor(state, 'opp'), best.sel)
  let next: MatchState = {
    ...state,
    myDefenders: result.enemyDefenders,
    myMids: result.enemyMids,
    myFwds: result.enemyFwds,
    discard: [...state.discard, cleanForDiscard(result.removed)],
    log: [...state.log, ...result.log],
    pendingSniper: null,
  }
  next = queueDyingCaptains(next, state.myDefenders, result.enemyDefenders, 'player')
  return next
}

export function isExtraTime(state: MatchState): boolean {
  return (EXTRA_TIME_TURNS as readonly number[]).includes(state.turn)
}

export function currentHalf(state: MatchState): 1 | 2 {
  return state.turn <= HALFTIME_AFTER_TURN ? 1 : 2
}

export function isBlockedInExtraTime(card: Card, state: MatchState): boolean {
  if (!isExtraTime(state)) return false
  if (card.role !== 'fwd') return false
  return !hasInstantAttack(card)
}

export function playPlayerCard(state: MatchState, handIdx: number): PlayResult {
  if (state.phase !== 'player') return { ok: false, reason: 'not_player_turn' }
  if (state.pendingSniper) return { ok: false, reason: 'pending_sniper' }
  if (state.pendingTauntGrant) return { ok: false, reason: 'pending_taunt_grant' }
  if (state.pendingInstantGrant) return { ok: false, reason: 'pending_instant_grant' }
  const card = state.hand[handIdx]
  if (!card) return { ok: false, reason: 'invalid_index' }
  if (!canAfford(state.actions, card)) return { ok: false, reason: 'cant_afford' }
  if (isBlockedInExtraTime(card, state)) {
    return { ok: false, reason: 'extra_time_no_regular_fwd' }
  }

  let next = { ...state, actions: payCost(state.actions, card) }
  next = placeCardOnField(next, 'player', handIdx)
  return { ok: true, state: next }
}

export function resolvePendingSniper(state: MatchState, target: SniperTargetSelection): PlayResult {
  if (!state.pendingSniper) return { ok: false, reason: 'no_pending_sniper' }
  const sourceId = state.pendingSniper.sourceId
  const source =
    state.myMids.find(c => c.id === sourceId) ??
    state.myDefenders.find(c => c.id === sourceId) ??
    state.myFwds.find(c => c.id === sourceId)
  if (!source) return { ok: false, reason: 'source_missing' }

  const result = applySniperChoice(source, fieldFor(state, 'player'), target)
  let nextState: MatchState = {
    ...state,
    oppDefenders: result.enemyDefenders,
    oppMids: result.enemyMids,
    oppFwds: result.enemyFwds,
    oppDiscard: [...state.oppDiscard, cleanForDiscard(result.removed)],
    log: [...state.log, ...result.log],
    pendingSniper: null,
    sniperKillsByCard: {
      ...state.sniperKillsByCard,
      [sourceId]: (state.sniperKillsByCard[sourceId] ?? 0) + 1,
    },
  }
  nextState = queueDyingCaptains(nextState, state.oppDefenders, result.enemyDefenders, 'opp')
  return { ok: true, state: nextState }
}

export function activateMorph(
  state: MatchState,
  cardId: string,
  side: Side = 'player',
): PlayResult {
  const expectedPhase = side === 'player' ? 'player' : 'opponent'
  if (state.phase !== expectedPhase) return { ok: false, reason: 'wrong_phase' }
  if (state.pendingSniper) return { ok: false, reason: 'pending_sniper' }
  if (state.pendingTauntGrant) return { ok: false, reason: 'pending_taunt_grant' }
  if (state.pendingInstantGrant) return { ok: false, reason: 'pending_instant_grant' }
  const ownDefs = side === 'player' ? state.myDefenders : state.oppDefenders
  const def = ownDefs.find(d => d.id === cardId)
  if (!def) return { ok: false, reason: 'card_not_found' }
  const morphPerk = def.perks.find(
    p => p.trigger === 'active' && p.effect.kind === 'morph_to_fwd',
  )
  if (!morphPerk || morphPerk.effect.kind !== 'morph_to_fwd') {
    return { ok: false, reason: 'no_morph_perk' }
  }
  const newAtk = Math.ceil(def.maxHp / morphPerk.effect.atkDivisor)
  const baseMaxHp = def.baseMaxHp ?? def.maxHp
  const newFwd: ForwardCard = {
    id: def.id,
    name: def.name,
    role: 'fwd',
    cost: def.cost,
    rarity: def.rarity,
    unique: def.unique,
    atk: newAtk,
    perks: [],
    status: 'attacking_next',
    morphedFrom: {
      hp: baseMaxHp,
      maxHp: baseMaxHp,
      perks: def.perks,
    },
  }
  const actor = side === 'player' ? 'Ти' : 'Опонент'
  const logLine = `${actor}: ${def.name} ВСІ В АТАКУ! Стає форвардом (atk ${newAtk}, з MaxHP ${def.maxHp}).`
  if (side === 'player') {
    return {
      ok: true,
      state: {
        ...state,
        myDefenders: state.myDefenders.filter(d => d.id !== cardId),
        myFwds: [...state.myFwds, newFwd],
        log: [...state.log, logLine],
      },
    }
  }
  return {
    ok: true,
    state: {
      ...state,
      oppDefenders: state.oppDefenders.filter(d => d.id !== cardId),
      oppFwds: [...state.oppFwds, newFwd],
      log: [...state.log, logLine],
    },
  }
}

export function tryOppMorph(state: MatchState): MatchState {
  if (state.phase !== 'opponent') return state
  if (state.pendingSniper) return state
  if (state.pendingTauntGrant) return state
  if (state.pendingInstantGrant) return state
  if (!isExtraTime(state)) return state
  let s = state
  for (let safety = 0; safety < 5; safety++) {
    const morphDef = s.oppDefenders.find(d =>
      d.perks.some(p => p.trigger === 'active' && p.effect.kind === 'morph_to_fwd'),
    )
    if (!morphDef) break
    const r = activateMorph(s, morphDef.id, 'opp')
    if (!r.ok) break
    s = r.state
  }
  return s
}

export function attackWithForward(
  state: MatchState,
  fwdId: string,
  target: AttackTarget,
): PlayResult {
  if (state.phase !== 'player') return { ok: false, reason: 'not_player_turn' }
  if (state.pendingSniper) return { ok: false, reason: 'pending_sniper' }
  if (state.pendingTauntGrant) return { ok: false, reason: 'pending_taunt_grant' }
  if (state.pendingInstantGrant) return { ok: false, reason: 'pending_instant_grant' }
  const fwd = state.myFwds.find(f => f.id === fwdId)
  if (!fwd) return { ok: false, reason: 'fwd_not_found' }
  if (fwd.status !== 'ready_to_attack') return { ok: false, reason: 'fwd_not_ready' }
  if (target.kind === 'defender' && !hasBypass(fwd)) {
    const valid = validAttackTargetIndices(state.oppDefenders)
    if (!valid.includes(target.idx)) {
      return { ok: false, reason: 'forced_target_taunt' }
    }
  }

  const result = resolveAttack({
    attacker: fwd,
    defenders: state.oppDefenders,
    keeper: state.oppKeeper,
    attackerMids: state.myMids,
    defenderMids: state.oppMids,
    attackerFwdCount: state.myFwds.length,
    attackerFwds: state.myFwds,
    chemistry: {
      ...chemistryForSide(state, 'player'),
      ...defenderChemistryForSide(state, 'opp'),
    },
    target,
  })

  const log: string[] = []
  log.push(`Ти: ${fwd.name} б'є на ${result.atk.finalAtk}${result.atk.buffs.length ? ` (${result.atk.buffs.map(b => `${b.source} +${b.amount}`).join(', ')})` : ''}.`)
  if (result.bypass) log.push('  Прохід наскрізь.')
  if (result.defenderRemoved) log.push(`  Захисник пробитий.`)
  if (result.buffsStripped > 0) log.push(`  ${state.oppKeeper.name} зриває aura-бафи (-${result.buffsStripped}).`)
  if (result.keeperSavedRandom) log.push(`  🧤 ${state.oppKeeper.name} відбиває в стрибку!`)
  else if (result.goal) log.push(`  ⚽ ГОЛ! (${result.keeperDamage} > save ${state.oppKeeper.save})`)
  else if (result.reachedKeeper) log.push(`  Воротар бере (${result.keeperDamage} ≤ save ${state.oppKeeper.save}).`)

  const teamGoalsAfter = result.goal ? bumpAlive(state, state.teamGoalsWhileAlive) : state.teamGoalsWhileAlive
  let nextState: MatchState = {
    ...state,
    myFwds: state.myFwds.filter(f => f.id !== fwdId),
    oppDefenders: result.newEnemyDefenders,
    discard: [...state.discard, cleanForDiscard(fwd)],
    myScore: state.myScore + (result.goal ? 1 : 0),
    log: [...state.log, ...log],
    goalsByFwd: result.goal
      ? { ...state.goalsByFwd, [fwd.id]: (state.goalsByFwd[fwd.id] ?? 0) + 1 }
      : state.goalsByFwd,
    damageDealtByFwd: result.damageDealt > 0
      ? { ...state.damageDealtByFwd, [fwd.id]: (state.damageDealtByFwd[fwd.id] ?? 0) + result.damageDealt }
      : state.damageDealtByFwd,
    teamGoalsWhileAlive: teamGoalsAfter,
  }
  nextState = queueDyingCaptains(nextState, state.oppDefenders, result.newEnemyDefenders, 'opp')
  return { ok: true, state: nextState }
}

function chemistryForSide(state: MatchState, side: Side): ChemistryBonuses {
  const cards =
    side === 'player'
      ? [...state.myDefenders, ...state.myMids, ...state.myFwds]
      : [...state.oppDefenders, ...state.oppMids, ...state.oppFwds]
  const keeper = side === 'player' ? state.myKeeper : state.oppKeeper
  const counts = countByNation(cards, keeper)
  const has = (code: string) => (counts[code] ?? 0) >= CHEMISTRY_THRESHOLD
  return {
    attackerAtk: (has('BR') ? 1 : 0),
    attackerAtkIfMid: has('AR') ? 1 : 0,
    skipKeeperAbilities: has('BE'),
  }
}

function defenderChemistryForSide(state: MatchState, side: Side): ChemistryBonuses {
  const cards =
    side === 'player'
      ? [...state.myDefenders, ...state.myMids, ...state.myFwds]
      : [...state.oppDefenders, ...state.oppMids, ...state.oppFwds]
  const keeper = side === 'player' ? state.myKeeper : state.oppKeeper
  const counts = countByNation(cards, keeper)
  const has = (code: string) => (counts[code] ?? 0) >= CHEMISTRY_THRESHOLD
  return {
    defenderDamageReduction: has('IT') ? 1 : 0,
    keeperSaveBonus: has('DE') ? 1 : 0,
  }
}

function bumpAlive(state: MatchState, current: Record<string, number>): Record<string, number> {
  const out = { ...current }
  for (const c of state.myDefenders) out[c.id] = (out[c.id] ?? 0) + 1
  for (const c of state.myMids) out[c.id] = (out[c.id] ?? 0) + 1
  for (const c of state.myFwds) out[c.id] = (out[c.id] ?? 0) + 1
  return out
}

export function autoTarget(state: MatchState, attackerSide: Side): AttackTarget {
  const enemyDefs = attackerSide === 'player' ? state.oppDefenders : state.myDefenders
  if (enemyDefs.length === 0) return { kind: 'keeper' }
  const valid = validAttackTargetIndices(enemyDefs)
  return { kind: 'defender', idx: valid[0] }
}

export function nextPlayerAutoAttack(state: MatchState): { state: MatchState; done: boolean } {
  if (state.phase !== 'player') return { state, done: true }
  const ready = state.myFwds.find(f => f.status === 'ready_to_attack')
  if (!ready) return { state, done: true }
  const target: AttackTarget = hasBypass(ready)
    ? { kind: 'keeper' }
    : autoTarget(state, 'player')
  const r = attackWithForward(state, ready.id, target)
  if (!r.ok) return { state, done: true }
  return { state: r.state, done: false }
}

export function finalizePlayerTurn(state: MatchState): MatchState {
  if (state.phase !== 'player') return state
  return { ...state, phase: 'opponent' }
}

export function endPlayerTurn(state: MatchState): MatchState {
  let s = state
  for (let safety = 10; safety > 0; safety--) {
    const r = nextPlayerAutoAttack(s)
    if (r.done) break
    s = r.state
  }
  return finalizePlayerTurn(s)
}

export function resolveOneOpponentForward(state: MatchState): { state: MatchState; done: boolean } {
  const ready = state.oppFwds.find(f => f.status === 'ready_to_attack')
  if (!ready) return { state, done: true }
  const target: AttackTarget = hasBypass(ready)
    ? { kind: 'keeper' }
    : autoTarget(state, 'opp')
  const result = resolveAttack({
    attacker: ready,
    defenders: state.myDefenders,
    keeper: state.myKeeper,
    attackerMids: state.oppMids,
    defenderMids: state.myMids,
    attackerFwdCount: state.oppFwds.length,
    attackerFwds: state.oppFwds,
    chemistry: {
      ...chemistryForSide(state, 'opp'),
      ...defenderChemistryForSide(state, 'player'),
    },
    target,
  })
  const log: string[] = []
  log.push(`Опонент: ${ready.name} б'є на ${result.atk.finalAtk}.`)
  if (result.defenderRemoved) log.push(`  Захисник пробитий.`)
  if (result.buffsStripped > 0) log.push(`  ${state.myKeeper.name} зриває aura-бафи (-${result.buffsStripped}).`)
  if (result.keeperSavedRandom) log.push(`  🧤 ${state.myKeeper.name} відбиває в стрибку!`)
  else if (result.goal) log.push(`  ⚽ ОПОНЕНТ ЗАБИВАЄ! (${result.keeperDamage} > save ${state.myKeeper.save})`)
  else if (result.reachedKeeper) log.push(`  Воротар бере.`)
  // Compute damage absorbed per player def
  const damageAbsorbedAfter = { ...state.damageAbsorbedByDef }
  for (const oldDef of state.myDefenders) {
    const newDef = result.newEnemyDefenders.find(d => d.id === oldDef.id)
    const dmg = newDef ? oldDef.hp - newDef.hp : oldDef.hp
    if (dmg > 0) {
      damageAbsorbedAfter[oldDef.id] = (damageAbsorbedAfter[oldDef.id] ?? 0) + dmg
    }
  }
  const oppGoalsAfter = result.goal ? bumpAlive(state, state.oppGoalsWhileAlive) : state.oppGoalsWhileAlive
  let nextState: MatchState = {
    ...state,
    oppFwds: state.oppFwds.filter(f => f.id !== ready.id),
    myDefenders: result.newEnemyDefenders,
    oppDiscard: [...state.oppDiscard, cleanForDiscard(ready)],
    oppScore: state.oppScore + (result.goal ? 1 : 0),
    log: [...state.log, ...log],
    damageAbsorbedByDef: damageAbsorbedAfter,
    oppGoalsWhileAlive: oppGoalsAfter,
  }
  nextState = queueDyingCaptains(nextState, state.myDefenders, result.newEnemyDefenders, 'player')
  return { state: nextState, done: false }
}

export function resolveOpponentForwards(state: MatchState): MatchState {
  let s: MatchState = state
  for (let safety = 20; safety > 0; safety--) {
    const r = resolveOneOpponentForward(s)
    if (r.done) break
    s = r.state
  }
  return s
}

export function decayPlayerMids(state: MatchState): MatchState {
  const result = decayMids(state.myMids, state.turn)
  if (result.toDiscard.length === 0 && result.remaining.length === state.myMids.length) {
    return { ...state, myMids: result.remaining }
  }
  const log = [...state.log]
  for (const m of result.toDiscard) log.push(`${m.name} (твій) у відбій.`)
  return {
    ...state,
    myMids: result.remaining,
    discard: [...state.discard, ...result.toDiscard.map(cleanForDiscard)],
    log,
  }
}

export function decayOpponentMids(state: MatchState): MatchState {
  const result = decayMids(state.oppMids, state.turn)
  if (result.toDiscard.length === 0 && result.remaining.length === state.oppMids.length) {
    return { ...state, oppMids: result.remaining }
  }
  const log = [...state.log]
  for (const m of result.toDiscard) log.push(`${m.name} (опон.) у відбій.`)
  return {
    ...state,
    oppMids: result.remaining,
    oppDiscard: [...state.oppDiscard, ...result.toDiscard.map(cleanForDiscard)],
    log,
  }
}

function applyHalftime(state: MatchState): MatchState {
  const playerDraw = drawN(state.hand, state.deck, state.discard, HALFTIME_DRAW_BONUS)
  const oppDraw = drawN(state.oppHand, state.oppDeck, state.oppDiscard, HALFTIME_DRAW_BONUS)
  return {
    ...state,
    hand: playerDraw.hand,
    deck: playerDraw.deck,
    discard: playerDraw.discard,
    oppHand: oppDraw.hand,
    oppDeck: oppDraw.deck,
    oppDiscard: oppDraw.discard,
    log: [
      ...state.log,
      `🟡 ПЕРЕРВА — обидві команди беруть +${HALFTIME_DRAW_BONUS} карт.`,
    ],
  }
}

export function advanceTurn(state: MatchState): MatchState {
  // England chemistry: +20M for each turn ending with 3+ EN on field
  const playerCounts = countByNation(
    [...state.myDefenders, ...state.myMids, ...state.myFwds],
    state.myKeeper,
  )
  const englandBonusThisTurn = (playerCounts['EN'] ?? 0) >= CHEMISTRY_THRESHOLD ? 20 : 0
  state = { ...state, englandTurnBonus: state.englandTurnBonus + englandBonusThisTurn }

  const newTurn = state.turn + 1
  if (newTurn > state.maxTurn) {
    return { ...state, gameOver: true, phase: 'player', firstTurn: false }
  }
  const newMaxActions = ACTION_PROGRESSION[Math.min(newTurn - 1, ACTION_PROGRESSION.length - 1)]
  const myFwdsTransitioned = state.myFwds.map(f =>
    f.status === 'attacking_next' ? { ...f, status: 'ready_to_attack' as const } : f,
  )
  const oppFwdsTransitioned = state.oppFwds.map(f =>
    f.status === 'attacking_next' ? { ...f, status: 'ready_to_attack' as const } : f,
  )

  let next: MatchState = {
    ...state,
    turn: newTurn,
    actions: newMaxActions,
    maxActions: newMaxActions,
    myFwds: myFwdsTransitioned,
    oppFwds: oppFwdsTransitioned,
    phase: 'player',
    firstTurn: false,
  }

  if (newTurn === HALFTIME_AFTER_TURN + 1) {
    next = applyHalftime(next)
  }

  next = drainDyingCaptains(next, 'player')
  next = decayPlayerMids(next)

  const playerCountsForDraw = countByNation(
    [...next.myDefenders, ...next.myMids, ...next.myFwds],
    next.myKeeper,
  )
  const spainBonus = (playerCountsForDraw['ES'] ?? 0) >= CHEMISTRY_THRESHOLD ? 1 : 0
  const drawCount = calcDrawCount(next.myMids) + spainBonus
  const drew = drawN(next.hand, next.deck, next.discard, drawCount)
  next = {
    ...next,
    hand: drew.hand,
    deck: drew.deck,
    discard: drew.discard,
    log: drew.drawnCount > 0
      ? [...next.log, `Хід ${newTurn}: тягнеш ${drew.drawnCount} карт.`]
      : next.log,
  }

  return next
}

export function drawForOpponentTurn(state: MatchState): MatchState {
  if (state.firstTurn) return state
  const oppCounts = countByNation(
    [...state.oppDefenders, ...state.oppMids, ...state.oppFwds],
    state.oppKeeper,
  )
  const spainBonus = (oppCounts['ES'] ?? 0) >= CHEMISTRY_THRESHOLD ? 1 : 0
  const count = calcDrawCount(state.oppMids) + spainBonus
  const drew = drawN(state.oppHand, state.oppDeck, state.oppDiscard, count)
  return {
    ...state,
    oppHand: drew.hand,
    oppDeck: drew.deck,
    oppDiscard: drew.discard,
  }
}

export function startOpponentTurn(state: MatchState): MatchState {
  let s = drainDyingCaptains(state, 'opp')
  s = decayOpponentMids(s)
  s = drawForOpponentTurn(s)
  return s
}

export function decideMatchResult(state: MatchState): 'win' | 'loss' | 'draw' | null {
  if (!state.gameOver) return null
  if (state.myScore > state.oppScore) return 'win'
  if (state.myScore < state.oppScore) return 'loss'
  return 'draw'
}
