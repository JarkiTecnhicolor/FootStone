import { useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Card } from './Card'
import { KeeperCard } from './KeeperCard'
import { PLAYER_DECK } from '../../game/cards/player-deck'
import { PLAYER_KEEPERS } from '../../game/keepers/player-keepers'
import { SHAKHTAR } from '../../game/cards/opponents/shakhtar'
import { BARCELONA } from '../../game/cards/opponents/barcelona'
import { REAL } from '../../game/cards/opponents/real'
import { WORLD_ALLSTAR } from '../../game/cards/opponents/world'
import { DYNAMO } from '../../game/cards/opponents/dynamo'
import { keeperPriceOf, priceOf } from '../../game/draft/pricing'
import { displayName } from '../../data/player-real-names'
import type { Card as CardData, Keeper, OpponentDeck, Rarity } from '../../game/types'

const RARITY_ORDER: Record<Rarity, number> = { bronze: 0, silver: 1, gold: 2, legend: 3 }

function compareCards(a: CardData, b: CardData): number {
  if (a.cost !== b.cost) return a.cost - b.cost
  const ra = a.rarity ? RARITY_ORDER[a.rarity] : -1
  const rb = b.rarity ? RARITY_ORDER[b.rarity] : -1
  if (ra !== rb) return ra - rb
  return displayName(a.id, a.name).localeCompare(displayName(b.id, b.name))
}

interface Props {
  open: boolean
  onClose: () => void
}

type Tab = 'player' | 'dynamo' | 'shakhtar' | 'barcelona' | 'real' | 'world'

const OPP_DECKS: Record<Exclude<Tab, 'player'>, OpponentDeck> = {
  dynamo: DYNAMO,
  shakhtar: SHAKHTAR,
  barcelona: BARCELONA,
  real: REAL,
  world: WORLD_ALLSTAR,
}

const TAB_LABELS: Record<Tab, string> = {
  player: 'Твоя дека',
  dynamo: 'Dynamo Kyiv',
  shakhtar: 'Shakhtar',
  barcelona: 'Barcelona',
  real: 'Real',
  world: 'World All-star',
}

function CardWithPrice({ card }: { card: CardData }) {
  return (
    <Card
      card={card}
      showCost
      footer={
        <div className="rounded bg-black/10 px-2 py-0.5 text-center text-[10px] font-semibold tabular-nums">
          💰 {priceOf(card)} M
        </div>
      }
    />
  )
}

function KeeperWithPrice({ keeper }: { keeper: Keeper }) {
  return (
    <KeeperCard
      keeper={keeper}
      footer={
        <div className="rounded bg-black/10 px-2 py-0.5 text-center text-[10px] font-semibold tabular-nums">
          💰 {keeperPriceOf(keeper)} M
        </div>
      }
    />
  )
}

function groupByRole(cards: readonly CardData[]) {
  return {
    def: cards.filter(c => c.role === 'def').slice().sort(compareCards),
    mid: cards.filter(c => c.role === 'mid').slice().sort(compareCards),
    fwd: cards.filter(c => c.role === 'fwd').slice().sort(compareCards),
  }
}

const ROLE_TITLE: Record<CardData['role'], string> = {
  def: 'Захист',
  mid: 'Півзахист',
  fwd: 'Атака',
}

export function Gallery({ open, onClose }: Props) {
  const [tab, setTab] = useState<Tab>('player')
  const cards = tab === 'player' ? PLAYER_DECK : OPP_DECKS[tab].cards
  const keepers = tab === 'player' ? PLAYER_KEEPERS : OPP_DECKS[tab].keepers
  const grouped = groupByRole(cards)

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-3 backdrop-blur-sm"
          onClick={onClose}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
        >
          <motion.div
            onClick={e => e.stopPropagation()}
            className="flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-xl bg-white shadow-xl"
            initial={{ y: 20, scale: 0.96, opacity: 0 }}
            animate={{ y: 0, scale: 1, opacity: 1 }}
            exit={{ y: 20, scale: 0.96, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 320, damping: 28 }}
          >
            <div className="flex items-center justify-between border-b border-stone-200 px-4 py-3">
              <div className="flex flex-wrap gap-1.5">
                <button
                  onClick={() => setTab('player')}
                  className={`rounded-md px-3 py-1.5 text-xs transition ${
                    tab === 'player'
                      ? 'bg-stone-900 text-white'
                      : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                  }`}
                >
                  {TAB_LABELS.player} · {PLAYER_DECK.length}
                </button>
                {(['dynamo', 'shakhtar', 'barcelona', 'real', 'world'] as const).map(key => (
                  <button
                    key={key}
                    onClick={() => setTab(key)}
                    className={`rounded-md px-3 py-1.5 text-xs transition ${
                      tab === key
                        ? 'bg-stone-900 text-white'
                        : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                    }`}
                  >
                    {TAB_LABELS[key]} · {OPP_DECKS[key].cards.length}
                  </button>
                ))}
              </div>
              <button
                onClick={onClose}
                className="rounded-md px-2 py-1 text-stone-500 transition hover:bg-stone-100 hover:text-stone-900"
                aria-label="Закрити"
              >
                ✕
              </button>
            </div>

            <div className="overflow-y-auto p-4">
              {keepers.length > 0 && (
                <div className="mb-4">
                  <div className="mb-2 text-xs font-medium uppercase tracking-wide text-stone-500">
                    🧤 Воротарі · {keepers.length}
                  </div>
                  <div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(auto-fill, 160px)' }}>
                    {keepers.map(k => (
                      <KeeperWithPrice key={k.id} keeper={k} />
                    ))}
                  </div>
                </div>
              )}
              {(['def', 'mid', 'fwd'] as const).map(role => {
                const roleCards = grouped[role]
                if (roleCards.length === 0) return null
                return (
                  <div key={role} className="mb-4 last:mb-0">
                    <div className="mb-2 text-xs font-medium uppercase tracking-wide text-stone-500">
                      {ROLE_TITLE[role]} · {roleCards.length}
                    </div>
                    <div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(auto-fill, 160px)' }}>
                      {roleCards.map(c => (
                        <CardWithPrice key={c.id} card={c} />
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
