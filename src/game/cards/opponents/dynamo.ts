import type { Card, OpponentDeck } from '../../types'
import { PLAYER_DECK } from '../player-deck'
import { PLAYER_KEEPERS } from '../../keepers/player-keepers'
import { cloneCard } from '../../lib'

function pickById(id: string): Card {
  const c = PLAYER_DECK.find(card => card.id === id)
  if (!c) throw new Error(`Card ${id} not in PLAYER_DECK`)
  return cloneCard(c)
}

// Dynamo Kyiv — повна UA-хімія: усі 11 + воротар українці.
const cards: Card[] = [
  pickById('p_d10'), // Mechanic (Mykhavko UA)
  pickById('p_d11'), // Lugastiontiy (Luzhny UA) — legend
  pickById('p_d14'), // Goalovko (Holovko UA) — legend
  pickById('p_d15'), // Karavay (Karavayev UA)
  pickById('p_m6'),  // Chapa-Chapa (Shaparenko UA)
  pickById('p_m10'), // Bunjaku (Buyalskyi UA)
  pickById('p_m16'), // Husein (Husin UA) — legend
  pickById('p_f5'),  // Vomit (Vanat UA)
  pickById('p_f11'), // Sosadin (Besedin UA)
  pickById('p_f16'), // Tsi-Tsi (Tsygankov UA)
  pickById('p_f20'), // Yarmolo (Yarmolenko UA) — legend
]

const keeper = PLAYER_KEEPERS.find(k => k.id === 'k_shovkov')
if (!keeper) throw new Error('Shovkovsky keeper missing')

export const DYNAMO: OpponentDeck = {
  id: 'dynamo',
  name: 'Dynamo Kyiv',
  cards,
  keepers: [{ ...keeper }],
}
