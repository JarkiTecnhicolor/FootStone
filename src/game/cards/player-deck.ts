import type { Card } from '../types'

export const PLAYER_DECK: Card[] = [
  {
    id: 'p_d1', name: 'Van Dijra', role: 'def', cost: 3,
    rarity: 'gold',
    hp: 4, maxHp: 4,
    perks: [],
  },
  {
    id: 'p_d2', name: 'Saliboo', role: 'def', cost: 2,
    rarity: 'silver',
    hp: 3, maxHp: 3,
    perks: [],
  },
  {
    id: 'p_d3', name: 'Rudidiger', role: 'def', cost: 3,
    rarity: 'gold',
    hp: 3, maxHp: 3,
    perks: [{
      trigger: 'on_place',
      effect: { kind: 'hp_buff', amount: 1, scope: 'other_defs' },
      label: 'КАПІТАН: +1 HP усім іншим захисникам',
    }],
  },
  {
    id: 'p_d4', name: 'Acerbe', role: 'def', cost: 1,
    rarity: 'bronze',
    hp: 1, maxHp: 1,
    perks: [{
      trigger: 'aura',
      effect: { kind: 'forward_defender' },
      label: 'ВИСУНУТИЙ ЗАХИСНИК — форварди змушені атакувати його першим',
    }],
  },
  {
    id: 'p_d5', name: 'Purifier', role: 'def', cost: 5,
    rarity: 'gold',
    hp: 6, maxHp: 6,
    perks: [{
      trigger: 'active',
      effect: { kind: 'morph_to_fwd', atkDivisor: 2 },
      label: 'ВСІ В АТАКУ — стає форвардом з atk = MaxHP/2 (округлено вгору)',
    }],
  },
  {
    id: 'p_d6', name: 'Huh', role: 'def', cost: 2,
    rarity: 'silver',
    hp: 3, maxHp: 3,
    perks: [{
      trigger: 'active',
      effect: { kind: 'morph_to_fwd', atkDivisor: 2 },
      label: 'ВСІ В АТАКУ — стає форвардом з atk = MaxHP/2 (округлено вгору)',
    }],
  },
  {
    id: 'p_d7', name: 'Connotaro', role: 'def', cost: 4,
    rarity: 'legend',
    hp: 3, maxHp: 3,
    perks: [{
      trigger: 'on_place',
      effect: { kind: 'hp_buff', amount: 3, scope: 'other_defs' },
      label: 'ВЕТЕРАН: +3 HP усім іншим захисникам',
    }],
  },
  {
    id: 'p_d8', name: 'Ramoris', role: 'def', cost: 4,
    rarity: 'legend',
    hp: 6, maxHp: 6,
    perks: [{
      trigger: 'aura',
      effect: { kind: 'forward_defender' },
      label: 'ВИСУНУТИЙ ЗАХИСНИК — форварди змушені атакувати його першим',
    }],
  },
  {
    id: 'p_m1', name: 'Modruk', role: 'mid', cost: 4,
    rarity: 'legend',
    stamina: 3, maxStamina: 3,
    perks: [{
      trigger: 'aura',
      effect: { kind: 'atk_buff', amount: 2, scope: 'all_my_fwds' },
      label: '+2 атаки усім твоїм форвардам',
    }],
  },
  {
    id: 'p_m2', name: 'Kantee', role: 'mid', cost: 2,
    rarity: 'silver',
    stamina: 2, maxStamina: 2,
    perks: [{
      trigger: 'aura',
      effect: { kind: 'damage_reducer', amount: 2 },
      label: '-2 damage атакам опонента',
    }],
  },
  {
    id: 'p_m3', name: 'Pedrri', role: 'mid', cost: 3,
    rarity: 'silver',
    stamina: 3, maxStamina: 3,
    perks: [{
      trigger: 'aura',
      effect: { kind: 'draw_bonus', amount: 1 },
      label: '+1 draw щоходу',
    }],
  },
  {
    id: 'p_m4', name: 'Bellinghame', role: 'mid', cost: 3,
    rarity: 'gold',
    stamina: 3, maxStamina: 3,
    perks: [{
      trigger: 'aura',
      effect: { kind: 'atk_buff', amount: 1, scope: 'all_my_fwds' },
      label: '+1 атаки форвардам',
    }],
  },
  {
    id: 'p_m5', name: 'Kosomoto', role: 'mid', cost: 4,
    rarity: 'gold',
    stamina: 1, maxStamina: 1,
    perks: [{
      trigger: 'on_place',
      effect: { kind: 'sniper', target: 'any_enemy' },
      label: 'ПІДКАТ ЗЗАДУ: знеси будь-яку карту опонента',
    }],
  },
  {
    id: 'p_m6', name: 'Chapa-Chapa', role: 'mid', cost: 1,
    rarity: 'silver',
    stamina: 2, maxStamina: 2,
    perks: [
      {
        trigger: 'aura',
        effect: { kind: 'atk_buff', amount: 1, scope: 'all_my_fwds' },
        label: '+1 атаки форвардам',
      },
      {
        trigger: 'on_place',
        effect: { kind: 'hp_buff', amount: 1, scope: 'other_defs' },
        label: '+1 HP захисникам',
      },
    ],
  },
  {
    id: 'p_m7', name: 'Etxebarria', role: 'mid', cost: 1,
    rarity: 'silver',
    stamina: 2, maxStamina: 2,
    perks: [{
      trigger: 'aura',
      effect: { kind: 'draw_bonus', amount: 1 },
      label: '+1 draw щоходу',
    }],
  },
  {
    id: 'p_m8', name: 'Porcelo', role: 'mid', cost: 5,
    rarity: 'legend',
    stamina: 2, maxStamina: 2,
    perks: [
      {
        trigger: 'aura',
        effect: { kind: 'draw_bonus', amount: 2 },
        label: 'ПЛЕЙМЕЙКЕР x2: +2 карти щоходу',
      },
      {
        trigger: 'aura',
        effect: { kind: 'atk_buff', amount: 2, scope: 'all_my_fwds' },
        label: '+2 атаки форвардам',
      },
    ],
  },
  {
    id: 'p_f1', name: 'Mbarre', role: 'fwd', cost: 5,
    rarity: 'legend',
    atk: 5,
    perks: [{
      trigger: 'self_modifier',
      effect: { kind: 'instant_attack' },
      label: 'АТАКА ПЕРШИМ ТЕМПОМ — б\'є на поточному ході',
    }],
  },
  {
    id: 'p_f2', name: 'Holande', role: 'fwd', cost: 3,
    rarity: 'legend',
    atk: 4,
    perks: [{
      trigger: 'self_modifier',
      effect: {
        kind: 'atk_buff',
        amount: 4,
        scope: 'self',
        condition: { kind: 'playmaker_present' },
      },
      label: '+4 атаки якщо плеймейкер на полі',
    }],
  },
  {
    id: 'p_f3', name: 'Vinicus', role: 'fwd', cost: 1,
    rarity: 'gold',
    atk: 2,
    perks: [{
      trigger: 'self_modifier',
      effect: { kind: 'atk_buff', amount: 3, scope: 'self', condition: { kind: 'mid_present' } },
      label: '+3 атаки якщо є півзах. на полі (hidden gem)',
    }],
  },
  {
    id: 'p_f4', name: 'Mossi', role: 'fwd', cost: 6,
    rarity: 'legend',
    atk: 4,
    perks: [
      {
        trigger: 'self_modifier',
        effect: { kind: 'bypass_keeper' },
        label: 'ПРОХІД НАСКРІЗЬ — атакує тільки воротаря',
      },
      {
        trigger: 'self_modifier',
        effect: { kind: 'instant_attack' },
        label: 'АТАКА ПЕРШИМ ТЕМПОМ — б\'є на поточному ході',
      },
    ],
  },
  {
    id: 'p_f5', name: 'Vomit', role: 'fwd', cost: 2,
    rarity: 'silver',
    atk: 2,
    perks: [{
      trigger: 'self_modifier',
      effect: { kind: 'instant_attack' },
      label: 'АТАКА ПЕРШИМ ТЕМПОМ — б\'є на поточному ході',
    }],
  },
  {
    id: 'p_f6', name: 'Harvard', role: 'fwd', cost: 4,
    rarity: 'legend',
    atk: 5,
    perks: [{
      trigger: 'self_modifier',
      effect: { kind: 'isolation' },
      label: 'ІЗОЛЯЦІЯ — після пробиття захисника одразу б\'є у воротаря',
    }],
  },
  {
    id: 'p_f7', name: 'Shock', role: 'fwd', cost: 2,
    rarity: 'silver',
    atk: 3,
    perks: [],
  },
  {
    id: 'p_f8', name: 'Cryspyano', role: 'fwd', cost: 6,
    rarity: 'legend',
    atk: 8,
    perks: [{
      trigger: 'aura',
      effect: { kind: 'invulnerable' },
      label: 'НЕВРАЗЛИВИЙ — точкові здібності опонента не діють',
    }],
  },
]
