import type { Card } from '../../game/types'

const ROLE_BG: Record<Card['role'], string> = {
  def: 'cfe2f4,a3c8e9',
  mid: 'f4e4c4,e9c98a',
  fwd: 'f4cfcf,e9a3a3',
}

export function avatarUrl(card: Card): string {
  const bg = ROLE_BG[card.role]
  const seed = encodeURIComponent(card.name)
  return `https://api.dicebear.com/9.x/personas/svg?seed=${seed}&backgroundType=gradientLinear&backgroundColor=${bg}`
}
