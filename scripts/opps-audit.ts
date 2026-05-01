import { SHAKHTAR } from '../src/game/cards/opponents/shakhtar'
import { REAL } from '../src/game/cards/opponents/real'
import { BARCELONA } from '../src/game/cards/opponents/barcelona'
import { WORLD_ALLSTAR } from '../src/game/cards/opponents/world'
import { keeperPriceOf, priceOf } from '../src/game/draft/pricing'
import { NATIONALITY_BY_ID } from '../src/data/player-nationalities'

for (const opp of [SHAKHTAR, BARCELONA, REAL, WORLD_ALLSTAR]) {
  let total = 0
  const nationCounts: Record<string, number> = {}
  for (const c of opp.cards) {
    total += priceOf(c)
    const n = NATIONALITY_BY_ID[c.id]
    if (n) nationCounts[n] = (nationCounts[n] ?? 0) + 1
  }
  for (const k of opp.keepers) {
    const n = NATIONALITY_BY_ID[k.id]
    if (n) nationCounts[n] = (nationCounts[n] ?? 0) + 1
  }
  const nations = Object.entries(nationCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([n, c]) => `${n}×${c}`)
    .join(' ')
  const activeChem = Object.entries(nationCounts)
    .filter(([, c]) => c >= 3)
    .map(([n]) => n)
  console.log(`${opp.name}: ${opp.cards.length} cards, ${total}M total + ${keeperPriceOf(opp.keepers[0])}M GK`)
  console.log(`  nations: ${nations}`)
  console.log(`  chemistry active: ${activeChem.length > 0 ? activeChem.join(', ') : 'none'}`)
  console.log()
}
