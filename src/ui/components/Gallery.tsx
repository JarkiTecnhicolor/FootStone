import { useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Card } from './Card'
import { KeeperCard } from './KeeperCard'
import { PLAYER_DECK } from '../../game/cards/player-deck'
import { PLAYER_KEEPERS } from '../../game/keepers/player-keepers'
import { SHAKHTAR } from '../../game/cards/opponents/shakhtar'
import { keeperPriceOf, priceOf } from '../../game/draft/pricing'
import { flagOf, NATIONALITY_BY_ID, NATIONALITY_LABELS } from '../../data/player-nationalities'
import type { Card as CardData, Keeper, Rarity } from '../../game/types'

function labelOf(cardId: string): string {
  const code = NATIONALITY_BY_ID[cardId]
  return code ? NATIONALITY_LABELS[code] ?? '' : ''
}

const RARITY_ORDER: Record<Rarity, number> = { bronze: 0, silver: 1, gold: 2, legend: 3 }

function compareCards(a: CardData, b: CardData): number {
  if (a.cost !== b.cost) return a.cost - b.cost
  const ra = a.rarity ? RARITY_ORDER[a.rarity] : -1
  const rb = b.rarity ? RARITY_ORDER[b.rarity] : -1
  if (ra !== rb) return ra - rb
  return a.name.localeCompare(b.name)
}

interface Props {
  open: boolean
  onClose: () => void
}

type Tab = 'player' | 'opp'

function CardWithPrice({ card }: { card: CardData }) {
  const flag = flagOf(card.id)
  const label = labelOf(card.id)
  return (
    <div className="flex flex-col items-center justify-between rounded-lg border border-stone-100 bg-white p-1.5">
      <div className="flex w-full justify-center">
        <Card card={card} size="lg" showCost />
      </div>
      <div className="mt-2 flex flex-col items-center gap-0.5">
        <div className="rounded bg-stone-100 px-2 py-0.5 text-[10px] font-semibold tabular-nums text-stone-700">
          💰 {priceOf(card)} M
        </div>
        {flag && (
          <div className="rounded bg-blue-50 px-2 py-0.5 text-[10px] text-blue-900">
            {flag} {label}
          </div>
        )}
      </div>
    </div>
  )
}

function KeeperWithPrice({ keeper }: { keeper: Keeper }) {
  const flag = flagOf(keeper.id)
  const label = labelOf(keeper.id)
  return (
    <div className="flex flex-col items-center justify-between rounded-lg border border-stone-100 bg-white p-1.5">
      <div className="flex w-full justify-center">
        <KeeperCard keeper={keeper} size="lg" />
      </div>
      <div className="mt-2 flex flex-col items-center gap-0.5">
        <div className="rounded bg-stone-100 px-2 py-0.5 text-[10px] font-semibold tabular-nums text-stone-700">
          💰 {keeperPriceOf(keeper)} M
        </div>
        {flag && (
          <div className="rounded bg-blue-50 px-2 py-0.5 text-[10px] text-blue-900">
            {flag} {label}
          </div>
        )}
      </div>
    </div>
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
  const cards = tab === 'player' ? PLAYER_DECK : SHAKHTAR.cards
  const keepers = tab === 'player' ? PLAYER_KEEPERS : SHAKHTAR.keepers
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
              <div className="flex gap-1.5">
                <button
                  onClick={() => setTab('player')}
                  className={`rounded-md px-3 py-1.5 text-sm transition ${
                    tab === 'player'
                      ? 'bg-stone-900 text-white'
                      : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                  }`}
                >
                  Твоя дека · {PLAYER_DECK.length}
                </button>
                <button
                  onClick={() => setTab('opp')}
                  className={`rounded-md px-3 py-1.5 text-sm transition ${
                    tab === 'opp'
                      ? 'bg-stone-900 text-white'
                      : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                  }`}
                >
                  {SHAKHTAR.name} · {SHAKHTAR.cards.length}
                </button>
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
                  <div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(auto-fill, 200px)' }}>
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
                    <div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(auto-fill, 200px)' }}>
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
