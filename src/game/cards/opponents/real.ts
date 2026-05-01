import type { Card, OpponentDeck } from '../../types'
import { PLAYER_DECK } from '../player-deck'
import { PLAYER_KEEPERS } from '../../keepers/player-keepers'
import { cloneCard } from '../../lib'

function pickById(id: string): Card {
  const c = PLAYER_DECK.find(card => card.id === id)
  if (!c) throw new Error(`Card ${id} not in PLAYER_DECK`)
  return cloneCard(c)
}

// Real Madrid galacticos — top legends with ES + FR chemistry potential
const cards: Card[] = [
  pickById('p_d16'), // Voron (Varane FR)
  pickById('p_d8'),  // Ramoris (Ramos ES)
  pickById('p_d3'),  // Rudidiger (Rüdiger DE)
  pickById('p_d2'),  // Saliboo (Saliba FR)
  pickById('p_m1'),  // Modruk (Modrić HR)
  pickById('p_m4'),  // Bellinghame (Bellingham EN)
  pickById('p_m5'),  // Kosomoto (Casemiro BR)
  pickById('p_m14'), // Gardensen (Gravesen DK)
  pickById('p_f8'),  // Cryspyano (Ronaldo PT)
  pickById('p_f1'),  // Mbarre (Mbappé FR)
  pickById('p_f3'),  // Vinicus (Vinícius BR)
]

const keeper = PLAYER_KEEPERS.find(k => k.id === 'k_lunin')
if (!keeper) throw new Error('Lunyn keeper missing')

export const REAL: OpponentDeck = {
  id: 'real',
  name: 'Real',
  cards,
  keepers: [{ ...keeper }],
}
