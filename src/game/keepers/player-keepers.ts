import type { Keeper } from '../types'

export const PLAYER_KEEPERS: Keeper[] = [
  {
    id: 'k_onana',
    name: 'Onunana',
    save: 1,
    rarity: 'silver',
    abilities: [{ kind: 'random_save', chance: 0.33 }],
    label: '33% шанс відбити голевий удар',
  },
  {
    id: 'k_nojer',
    name: 'Nomer',
    save: 2,
    rarity: 'gold',
    abilities: [{ kind: 'random_save', chance: 0.33 }],
    label: '33% шанс відбити голевий удар',
  },
  {
    id: 'k_weiden',
    name: 'Waisburfeller',
    save: 3,
    rarity: 'gold',
    abilities: [],
  },
  {
    id: 'k_buffon',
    name: 'Baronior',
    save: 2,
    rarity: 'legend',
    abilities: [{ kind: 'strip_buffs' }],
    label: 'Зриває aura-бафи з нападника',
  },
  {
    id: 'k_lunin',
    name: 'Lunyn',
    save: 2,
    rarity: 'silver',
    abilities: [],
  },
  {
    id: 'k_shovkov',
    name: 'Shovkovsky',
    save: 3,
    rarity: 'gold',
    abilities: [],
  },
  {
    id: 'k_pyatov',
    name: 'Pyatyk',
    save: 2,
    rarity: 'silver',
    abilities: [{ kind: 'random_save', chance: 0.20 }],
    label: '20% шанс відбити голевий удар',
  },
]
