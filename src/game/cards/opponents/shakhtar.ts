import type { Card, OpponentDeck } from '../../types'
import { SHAKHTAR_KEEPERS } from '../../keepers/shakhtar-keepers'

const cards: Card[] = [
  {
    id: 'o_d2', name: 'Bondarro', role: 'def', cost: 1,
    rarity: 'bronze',
    hp: 1, maxHp: 1,
    perks: [],
  },
  {
    id: 'o_d3', name: 'Marlossi', role: 'def', cost: 3,
    rarity: 'silver',
    hp: 3, maxHp: 3,
    perks: [],
  },
  {
    id: 'o_d4', name: 'Rapunskiy', role: 'def', cost: 4,
    rarity: 'gold',
    hp: 2, maxHp: 2,
    perks: [{
      trigger: 'on_place',
      effect: { kind: 'sniper', target: 'enemy_fwd_random' },
      label: 'ЖОРСТКИЙ ПІДКАТ (випадковий форвард): знеси випадкового виставленого форварда опонента',
    }],
  },
  {
    id: 'o_m1', name: 'Steppanenko', role: 'mid', cost: 3,
    rarity: 'gold',
    stamina: 2, maxStamina: 2,
    perks: [{
      trigger: 'aura',
      effect: { kind: 'atk_buff', amount: 2, scope: 'all_my_fwds' },
      label: '+2 атаки форвардам',
    }],
  },
  {
    id: 'o_m2', name: 'Maycoon', role: 'mid', cost: 2,
    rarity: 'silver',
    stamina: 2, maxStamina: 2,
    perks: [{
      trigger: 'aura',
      effect: { kind: 'atk_buff', amount: 1, scope: 'all_my_fwds' },
      label: '+1 атаки форвардам',
    }],
  },
  {
    id: 'o_m3', name: 'Patrico', role: 'mid', cost: 3,
    rarity: 'silver',
    stamina: 3, maxStamina: 3,
    perks: [{
      trigger: 'aura',
      effect: { kind: 'draw_bonus', amount: 1 },
      label: 'ПЛЕЙМЕЙКЕР: +1 карта щоходу',
    }],
  },
  {
    id: 'o_f1', name: 'Mudruk', role: 'fwd', cost: 2,
    rarity: 'gold',
    atk: 3,
    perks: [{
      trigger: 'self_modifier',
      effect: { kind: 'atk_buff', amount: 2, scope: 'self', condition: { kind: 'enemy_def_hp_eq', hp: 1 } },
      label: '+2 атаки проти HP1 захисників',
    }],
  },
  {
    id: 'o_f2', name: 'Juniyor Moraz', role: 'fwd', cost: 4,
    rarity: 'silver',
    atk: 4,
    perks: [],
  },
  {
    id: 'o_f3', name: 'Ferrayra', role: 'fwd', cost: 3,
    rarity: 'silver',
    atk: 3,
    perks: [],
  },
  {
    id: 'o_f4', name: 'Saloman', role: 'fwd', cost: 2,
    rarity: 'silver',
    atk: 3,
    perks: [],
  },
  {
    id: 'o_f5', name: 'Allison', role: 'fwd', cost: 2,
    rarity: 'bronze',
    atk: 2,
    perks: [{
      trigger: 'self_modifier',
      effect: { kind: 'atk_buff', amount: 1, scope: 'self', condition: { kind: 'mid_present' } },
      label: '+1 атаки якщо є півзах. на полі',
    }],
  },
]

export const SHAKHTAR: OpponentDeck = {
  id: 'shakhtar',
  name: 'Shakhtar',
  cards,
  keepers: SHAKHTAR_KEEPERS,
}
