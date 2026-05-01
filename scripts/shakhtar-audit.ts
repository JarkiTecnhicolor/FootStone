import { SHAKHTAR } from '../src/game/cards/opponents/shakhtar'
import { SHAKHTAR_KEEPERS } from '../src/game/keepers/shakhtar-keepers'
import { keeperPriceOf, priceOf } from '../src/game/draft/pricing'

let totalCardValue = 0
console.log('=== Shakhtar deck ===')
console.log(`Cards: ${SHAKHTAR.cards.length}`)
for (const c of SHAKHTAR.cards) {
  const p = priceOf(c)
  totalCardValue += p
  console.log(
    `  ${c.role.padEnd(3)}  ${c.rarity?.padEnd(7) ?? 'bronze '}  c${c.cost} hp/atk/stm:${
      c.role === 'def' ? c.hp : c.role === 'mid' ? c.stamina : c.atk
    }  ${p}M  ${c.name}${c.perks.length ? ' [' + c.perks.length + ' perk]' : ''}`,
  )
}
console.log(`Total card value: ${totalCardValue}M`)
console.log()
console.log('Keepers:')
for (const k of SHAKHTAR_KEEPERS) {
  console.log(`  ${k.rarity ?? 'bronze'}  save ${k.save}  ${keeperPriceOf(k)}M  ${k.name}`)
}
