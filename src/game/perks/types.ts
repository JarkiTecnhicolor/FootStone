export type PerkTrigger =
  | 'aura'
  | 'on_place'
  | 'on_death'
  | 'self_modifier'
  | 'active'

export type PerkCondition =
  | { kind: 'mid_present' }
  | { kind: 'enemy_def_hp_eq'; hp: number }
  | { kind: 'playmaker_present' }
  | { kind: 'last_in_hand' }

export type AtkBuffScope = 'all_my_fwds' | 'self'

export type SniperTarget = 'any_enemy' | 'enemy_fwd_first'

export type HpBuffScope = 'self' | 'other_defs'

export type PerkEffect =
  | { kind: 'atk_buff'; amount: number; scope: AtkBuffScope; condition?: PerkCondition }
  | { kind: 'hp_buff'; amount: number; scope?: HpBuffScope; condition?: PerkCondition }
  | { kind: 'damage_reducer'; amount: number }
  | { kind: 'draw_bonus'; amount: number }
  | { kind: 'sniper'; target: SniperTarget }
  | { kind: 'bypass_keeper' }
  | { kind: 'instant_attack' }
  | { kind: 'isolation' }
  | { kind: 'morph_to_fwd'; atkDivisor: number }
  | { kind: 'forward_defender' }
  | { kind: 'invulnerable' }
  | { kind: 'intimidate'; amount: number; threshold: number }
  | { kind: 'summon_def_from_hand' }

export interface Perk {
  trigger: PerkTrigger
  effect: PerkEffect
  label: string
}

export type PerkCategory = 'bonus' | 'perk'

export function categoryOf(perk: Perk): PerkCategory {
  switch (perk.effect.kind) {
    case 'atk_buff':
    case 'hp_buff':
    case 'damage_reducer':
    case 'draw_bonus':
      return 'bonus'
    default:
      return 'perk'
  }
}
