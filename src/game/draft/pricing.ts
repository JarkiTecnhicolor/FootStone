import type { BaseCard, DefenderCard, ForwardCard, Keeper, MidfielderCard, Rarity } from '../types'

export const STARTING_BUDGET = 280
export const MIN_DECK_SIZE = 8
export const MAX_DECK_SIZE = 12

const RARITY_BASE: Record<Rarity, number> = {
  bronze: 5,
  silver: 12,
  gold: 26,
  legend: 52,
}

const COST_MULT: Record<Rarity, number> = {
  bronze: 1.5,
  silver: 2.5,
  gold: 3.5,
  legend: 5,
}

const PERK_VALUES = {
  atk_buff_unit: 4,
  hp_buff_unit: 3,
  draw_bonus_unit: 6,
  damage_reducer_unit: 4,
  instant_attack: 8,
  bypass_keeper: 10,
  isolation: 6,
  invulnerable: 12,
  forward_defender: 5,
  morph_to_fwd: 5,
  sniper_any: 9,
  sniper_first: 7,
  intimidate_unit: 4,
  summon_def_from_hand: 9,
  keeper_save_reducer_unit: 5,
  grant_taunt: 8,
  grant_instant_attack: 10,
  conditional_factor: 0.7,
}

function perksValue(card: BaseCard): number {
  let v = 0
  for (const p of card.perks) {
    const e = p.effect
    let perkV = 0
    let conditional = false
    if (e.kind === 'atk_buff') {
      perkV = e.amount * PERK_VALUES.atk_buff_unit
      if (e.condition) conditional = true
    } else if (e.kind === 'hp_buff') {
      perkV = e.amount * PERK_VALUES.hp_buff_unit
      if (e.condition) conditional = true
    } else if (e.kind === 'draw_bonus') {
      perkV = e.amount * PERK_VALUES.draw_bonus_unit
    } else if (e.kind === 'damage_reducer') {
      perkV = e.amount * PERK_VALUES.damage_reducer_unit
    } else if (e.kind === 'instant_attack') {
      perkV = PERK_VALUES.instant_attack
    } else if (e.kind === 'bypass_keeper') {
      perkV = PERK_VALUES.bypass_keeper
    } else if (e.kind === 'isolation') {
      perkV = PERK_VALUES.isolation
    } else if (e.kind === 'invulnerable') {
      perkV = PERK_VALUES.invulnerable
    } else if (e.kind === 'forward_defender') {
      perkV = PERK_VALUES.forward_defender
    } else if (e.kind === 'morph_to_fwd') {
      perkV = PERK_VALUES.morph_to_fwd
    } else if (e.kind === 'sniper') {
      perkV = e.target === 'any_enemy' ? PERK_VALUES.sniper_any : PERK_VALUES.sniper_first
    } else if (e.kind === 'intimidate') {
      perkV = e.amount * PERK_VALUES.intimidate_unit
    } else if (e.kind === 'summon_def_from_hand') {
      perkV = PERK_VALUES.summon_def_from_hand
    } else if (e.kind === 'keeper_save_reducer') {
      perkV = e.amount * PERK_VALUES.keeper_save_reducer_unit
    } else if (e.kind === 'grant_taunt') {
      perkV = PERK_VALUES.grant_taunt
    } else if (e.kind === 'grant_instant_attack') {
      perkV = PERK_VALUES.grant_instant_attack
    }
    v += conditional ? perkV * PERK_VALUES.conditional_factor : perkV
  }
  return v
}

function statValue(card: BaseCard): number {
  if (card.role === 'def') return (card as DefenderCard).maxHp * 1.0
  if (card.role === 'mid') return (card as MidfielderCard).maxStamina * 1.5
  return (card as ForwardCard).atk * 2.0
}

export function priceOf(card: BaseCard): number {
  if (card.price != null) return card.price
  const r = card.rarity ?? 'bronze'
  const base = RARITY_BASE[r] + card.cost * COST_MULT[r]
  return Math.round(base + statValue(card) + perksValue(card))
}

export function keeperPriceOf(keeper: Keeper): number {
  if (keeper.price != null) return keeper.price
  const r = keeper.rarity ?? 'bronze'
  let v = RARITY_BASE[r] + keeper.save * 6
  for (const a of keeper.abilities) {
    if (a.kind === 'random_save') v += a.chance * 30
    if (a.kind === 'strip_buffs') v += 12
  }
  return Math.round(v)
}

// Cost of releasing a contracted card mid-run
export function releasePriceOf(card: BaseCard): number {
  return Math.round(priceOf(card) * 1.5)
}
