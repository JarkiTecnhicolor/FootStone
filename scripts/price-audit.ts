import { PLAYER_DECK } from '../src/game/cards/player-deck'
import { PLAYER_KEEPERS } from '../src/game/keepers/player-keepers'
import { keeperPriceOf, priceOf } from '../src/game/draft/pricing'
import type { Rarity } from '../src/game/types'

interface Row {
  id: string
  name: string
  role: string
  rarity: string
  cost: number
  price: number
}

const rows: Row[] = []
for (const c of PLAYER_DECK) {
  rows.push({
    id: c.id,
    name: c.name,
    role: c.role,
    rarity: c.rarity ?? 'bronze',
    cost: c.cost,
    price: priceOf(c),
  })
}
for (const k of PLAYER_KEEPERS) {
  rows.push({
    id: k.id,
    name: k.name,
    role: 'gk',
    rarity: k.rarity ?? 'bronze',
    cost: k.save,
    price: keeperPriceOf(k),
  })
}

rows.sort((a, b) => a.price - b.price)

console.log('--- All cards by price ---')
for (const r of rows) {
  console.log(
    `${r.price.toString().padStart(4)}M  ${r.rarity.padEnd(7)} ${r.role.padEnd(4)} c${r.cost}  ${r.name}`,
  )
}

const byRarity: Record<string, number[]> = {}
for (const r of rows) {
  if (!byRarity[r.rarity]) byRarity[r.rarity] = []
  byRarity[r.rarity].push(r.price)
}

console.log()
console.log('--- Per-rarity ranges ---')
for (const rarity of ['bronze', 'silver', 'gold', 'legend'] as Rarity[]) {
  const arr = byRarity[rarity] ?? []
  if (arr.length === 0) continue
  const min = Math.min(...arr)
  const max = Math.max(...arr)
  const mean = arr.reduce((s, v) => s + v, 0) / arr.length
  const unique = new Set(arr).size
  console.log(
    `${rarity.padEnd(7)}  ${arr.length} cards · range ${min}M-${max}M · mean ${mean.toFixed(1)}M · ${unique}/${arr.length} unique prices`,
  )
}
