import type { Card, OpponentDeck } from '../../types'
import { PLAYER_DECK } from '../player-deck'
import { PLAYER_KEEPERS } from '../../keepers/player-keepers'
import { cloneCard } from '../../lib'

function pickById(id: string): Card {
  const c = PLAYER_DECK.find(card => card.id === id)
  if (!c) throw new Error(`Card ${id} not in PLAYER_DECK`)
  return cloneCard(c)
}

// Barcelona tiki-taka — heavy ES chemistry (6 Spanish cards = constant +1 draw aura)
const cards: Card[] = [
  pickById('p_d9'),  // Paquet (Piqué ES)
  pickById('p_d4'),  // Acerbe (Acerbi IT) — ageing veteran filler
  pickById('p_d2'),  // Saliboo (Saliba FR)
  pickById('p_m15'), // Xomi (Xavi ES) — playmaker x3
  pickById('p_m19'), // Miniesta (Iniesta ES) — assist + +1 draw
  pickById('p_m3'),  // Pedrri (Pedri ES)
  pickById('p_m7'),  // Etxebarria (ES) — extra cycler
  pickById('p_f4'),  // Mossi (Messi AR — was Barca)
  pickById('p_f10'), // Bajan (Bojan ES)
  pickById('p_f14'), // Henky (Henry FR — was Barca briefly)
  pickById('p_f3'),  // Vinicus (Vinícius BR) — pace
  pickById('p_d11'), // Lugastiontiy (Luzhny UA) — sacrifice card filler
]

const keeper = PLAYER_KEEPERS.find(k => k.id === 'k_buffon')
if (!keeper) throw new Error('Baronior keeper missing')

export const BARCELONA: OpponentDeck = {
  id: 'barcelona',
  name: 'Barcelona',
  cards,
  keepers: [{ ...keeper }],
}
