import type { Card, OpponentDeck } from '../../types'
import { PLAYER_DECK } from '../player-deck'
import { PLAYER_KEEPERS } from '../../keepers/player-keepers'
import { cloneCard } from '../../lib'

function pickById(id: string): Card {
  const c = PLAYER_DECK.find(card => card.id === id)
  if (!c) throw new Error(`Card ${id} not in PLAYER_DECK`)
  return cloneCard(c)
}

// World All-star team — top legends across nations + BR chemistry triple
const cards: Card[] = [
  // BR triple — guaranteed Brazil chemistry (+1 atk fwds)
  pickById('p_m5'),  // Kosomoto (Casemiro BR)
  pickById('p_f3'),  // Vinicus (Vinícius BR)
  pickById('p_f22'), // Rumourio (Romário BR)
  // Top legends from other nations
  pickById('p_d1'),  // Van Dijra (NL legend)
  pickById('p_d18'), // Nosti (Nesta IT)
  pickById('p_d16'), // Voron (Varane FR)
  pickById('p_m1'),  // Modruk (Modrić HR)
  pickById('p_m8'),  // Porcelo (Pirlo IT)
  pickById('p_m18'), // Riquale (Riquelme AR)
  pickById('p_f8'),  // Cryspyano (Ronaldo PT)
  pickById('p_f4'),  // Mossi (Messi AR)
  pickById('p_f1'),  // Mbarre (Mbappé FR)
]

const keeper = PLAYER_KEEPERS.find(k => k.id === 'k_buffon')
if (!keeper) throw new Error('Baronior keeper missing')

export const WORLD_ALLSTAR: OpponentDeck = {
  id: 'world',
  name: 'World All-star team',
  cards,
  keepers: [{ ...keeper }],
}
