import { NATIONALITY_BY_ID } from '../data/player-nationalities'
import type { Card, Keeper } from './types'

export const CHEMISTRY_THRESHOLD = 3

export interface ChemistryDef {
  code: string
  label: string
  desc: string
}

export const CHEMISTRY_DEFS: Record<string, ChemistryDef> = {
  UA: {
    code: 'UA',
    label: 'Україна',
    desc: '+10M в кінці матчу якщо 3+ українців на полі',
  },
  ES: {
    code: 'ES',
    label: 'Іспанія',
    desc: '+1 карта щоходу (tiki-taka контроль)',
  },
  FR: {
    code: 'FR',
    label: 'Франція',
    desc: '+1 stamina півзахисникам при виставленні',
  },
  IT: {
    code: 'IT',
    label: 'Італія',
    desc: '-1 шкоди ворожим атакам (catenaccio)',
  },
  DE: {
    code: 'DE',
    label: 'Німеччина',
    desc: '+1 до save воротаря (дисципліна)',
  },
  BR: {
    code: 'BR',
    label: 'Бразилія',
    desc: '+1 атаки усім форвардам (jogo bonito)',
  },
  AR: {
    code: 'AR',
    label: 'Аргентина',
    desc: '+1 атаки форвардам якщо є півзахисник на полі (magic 10s)',
  },
  EN: {
    code: 'EN',
    label: 'Англія',
    desc: '+20M за кожен хід що завершився з 3+ британцями на полі',
  },
  BE: {
    code: 'BE',
    label: 'Бельгія',
    desc: 'Форварди ігнорують перки воротаря',
  },
}

export function countByNation(
  cards: readonly { id: string }[],
  keeper?: Keeper | null,
): Record<string, number> {
  const counts: Record<string, number> = {}
  for (const c of cards) {
    const code = NATIONALITY_BY_ID[c.id]
    if (code) counts[code] = (counts[code] ?? 0) + 1
  }
  if (keeper) {
    const code = NATIONALITY_BY_ID[keeper.id]
    if (code) counts[code] = (counts[code] ?? 0) + 1
  }
  return counts
}

export function activeChemistries(
  defenders: readonly Card[],
  mids: readonly Card[],
  fwds: readonly Card[],
  keeper: Keeper | null,
): string[] {
  const counts = countByNation([...defenders, ...mids, ...fwds], keeper)
  return Object.entries(counts)
    .filter(([code, n]) => n >= CHEMISTRY_THRESHOLD && CHEMISTRY_DEFS[code])
    .map(([code]) => code)
}

export function isChemistryActive(
  code: string,
  defenders: readonly Card[],
  mids: readonly Card[],
  fwds: readonly Card[],
  keeper: Keeper | null,
): boolean {
  const counts = countByNation([...defenders, ...mids, ...fwds], keeper)
  return (counts[code] ?? 0) >= CHEMISTRY_THRESHOLD
}
