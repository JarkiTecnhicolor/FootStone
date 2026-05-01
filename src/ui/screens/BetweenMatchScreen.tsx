import { motion, AnimatePresence } from 'motion/react'
import type { Card as CardData } from '../../game/types'
import type { SeasonState, SeasonMatchPlan, SeasonMatchResult } from '../../game/season/types'
import { nextMatchPlan } from '../../game/season/state'
import {
  MAX_DECK_SIZE,
  MIN_DECK_SIZE,
  priceOf,
  releasePriceOf,
} from '../../game/draft/pricing'
import { Card } from '../components/Card'
import { KeeperCard } from '../components/KeeperCard'

interface Props {
  season: SeasonState
  onProceed: () => void
  onBuy: (cardId: string) => void
  onRelease: (cardId: string) => void
  onReroll: () => void
  onAbort: () => void
}

const REROLL_FEE = 10

function MatchPlanRow({
  plan,
  result,
  isCurrent,
}: {
  plan: SeasonMatchPlan
  result?: SeasonMatchResult
  isCurrent: boolean
}) {
  const status = result
    ? result.outcome === 'win'
      ? '✅'
      : result.outcome === 'draw'
        ? '➖'
        : '❌'
    : isCurrent
      ? '▶'
      : '·'
  const cls = result
    ? result.outcome === 'win'
      ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
      : result.outcome === 'draw'
        ? 'bg-stone-50 border-stone-200 text-stone-700'
        : 'bg-rose-50 border-rose-200 text-rose-900'
    : isCurrent
      ? 'bg-blue-50 border-blue-300 ring-2 ring-blue-200 text-blue-900'
      : 'bg-stone-50 border-stone-200 text-stone-500'
  return (
    <div className={`flex items-center gap-2 rounded-md border px-2 py-1.5 ${cls}`}>
      <span className="w-5 text-center text-base">{status}</span>
      <span className="w-5 text-[10px] text-stone-500 tabular-nums">{plan.idx + 1}.</span>
      <span className="flex-1 text-[12px] font-medium">{plan.oppName}</span>
      {result ? (
        <span className="text-[12px] font-semibold tabular-nums">
          {result.myScore}:{result.oppScore}
          <span className="ml-2 text-emerald-700">+{result.reward}M</span>
        </span>
      ) : plan.oppBudget ? (
        <span className="text-[10px] text-stone-500 tabular-nums">бюджет {plan.oppBudget}M</span>
      ) : null}
    </div>
  )
}

export function BetweenMatchScreen({
  season,
  onProceed,
  onBuy,
  onRelease,
  onReroll,
  onAbort,
}: Props) {
  const upcoming = nextMatchPlan(season)

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-sm font-semibold text-stone-900">
          FootStone <span className="text-stone-400">/ Сезон</span>
        </div>
        <button
          onClick={onAbort}
          className="rounded-md border border-stone-300 bg-stone-50 px-2.5 py-1 text-xs hover:bg-stone-100"
        >
          ✕ Завершити сезон
        </button>
      </div>

      <div className="rounded-lg border border-stone-200 bg-white px-3 py-2 shadow-sm">
        <div className="mb-2 flex items-baseline justify-between">
          <span className="text-[10px] font-medium uppercase tracking-wider text-stone-600">
            Календар сезону
          </span>
          <span className="text-[10px] text-stone-400">
            {season.results.length} / {season.plan.length} зіграно
          </span>
        </div>
        <div className="space-y-1">
          {season.plan.map(p => (
            <MatchPlanRow
              key={p.idx}
              plan={p}
              result={season.results.find(r => r.idx === p.idx)}
              isCurrent={p.idx === season.results.length}
            />
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between rounded-lg border border-stone-200 bg-white px-3 py-2 shadow-sm">
        <div className="flex items-baseline gap-1.5">
          <span className="text-[9px] uppercase tracking-wider text-stone-500">Каса</span>
          <motion.span
            key={season.money}
            initial={{ scale: 1.3, color: '#16a34a' }}
            animate={{ scale: 1, color: '#1c1917' }}
            transition={{ duration: 0.3 }}
            className="text-base font-bold tabular-nums"
          >
            {season.money} M
          </motion.span>
        </div>
        <div className="text-[10px] text-stone-500">
          Склад {season.cards.length}/{MAX_DECK_SIZE} (мін {MIN_DECK_SIZE})
        </div>
      </div>

      {upcoming && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 shadow-sm">
          <div className="mb-1 text-[10px] font-bold uppercase tracking-wider text-blue-900">
            ⚽ Наступний матч
          </div>
          <div className="text-sm font-semibold text-blue-950">
            {upcoming.idx + 1}. {upcoming.oppName}
            {upcoming.oppBudget && (
              <span className="ml-2 text-[11px] font-normal text-blue-700">
                (бюджет суперника {upcoming.oppBudget}M)
              </span>
            )}
          </div>
        </div>
      )}

      <div className="rounded-lg border border-stone-200 bg-gradient-to-b from-stone-50 to-white p-3 shadow-sm">
        <div className="mb-2 flex items-baseline justify-between">
          <span className="text-[10px] font-medium uppercase tracking-wider text-stone-600">
            Трансферний ринок
          </span>
          <button
            onClick={onReroll}
            disabled={season.money < REROLL_FEE}
            className="rounded-md border border-stone-300 bg-white px-2 py-0.5 text-[10px] text-stone-700 transition hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            ↺ Освіжити ({REROLL_FEE}M)
          </button>
        </div>
        {season.shop.length === 0 ? (
          <div className="text-[10px] italic text-stone-400">пул вичерпано</div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {season.shop.map(c => {
              const price = priceOf(c)
              const affordable = price <= season.money && season.cards.length < MAX_DECK_SIZE
              return (
                <ShopCardOption
                  key={c.id}
                  card={c}
                  price={price}
                  affordable={affordable}
                  onClick={() => onBuy(c.id)}
                />
              )
            })}
          </div>
        )}
      </div>

      <div className="rounded-lg border border-stone-200 bg-white p-3 shadow-sm">
        <div className="mb-2 flex items-baseline justify-between">
          <span className="text-[10px] font-medium uppercase tracking-wider text-stone-600">
            Твій склад · {season.cards.length} + 1 GK
          </span>
          <span className="text-[10px] text-stone-400">клік на 🗑 щоб розірвати контракт</span>
        </div>
        <div className="flex flex-wrap gap-2">
          <KeeperCard keeper={season.keeper} />
          <AnimatePresence mode="popLayout">
            {season.cards.map((c, i) => (
              <RosterCard
                key={`${c.id}-${i}`}
                card={c}
                releasePrice={releasePriceOf(c)}
                canRelease={
                  season.cards.length > MIN_DECK_SIZE &&
                  releasePriceOf(c) <= season.money
                }
                onRelease={() => onRelease(c.id)}
              />
            ))}
          </AnimatePresence>
        </div>
      </div>

      <button
        onClick={onProceed}
        className="w-full rounded-md bg-emerald-700 px-3 py-3 text-sm font-medium text-white shadow-sm transition hover:bg-emerald-800"
      >
        Грати наступний матч →
      </button>
    </div>
  )
}

function ShopCardOption({
  card,
  price,
  affordable,
  onClick,
}: {
  card: CardData
  price: number
  affordable: boolean
  onClick: () => void
}) {
  return (
    <div className="flex flex-col items-center">
      <Card card={card} showCost />
      <div
        className={`mt-1 rounded px-1.5 py-0.5 text-center text-[10px] font-semibold tabular-nums ${
          affordable ? 'bg-emerald-100 text-emerald-900' : 'bg-rose-100 text-rose-900'
        }`}
      >
        {price} M
      </div>
      <button
        onClick={onClick}
        disabled={!affordable}
        className="mt-1 w-[150px] rounded-md bg-stone-900 px-2 py-1 text-[11px] text-white shadow-sm hover:bg-stone-800 disabled:cursor-not-allowed disabled:bg-stone-300"
      >
        Підписати
      </button>
    </div>
  )
}

function RosterCard({
  card,
  releasePrice,
  canRelease,
  onRelease,
}: {
  card: CardData
  releasePrice: number
  canRelease: boolean
  onRelease: () => void
}) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.85 }}
      className="relative flex flex-col items-center"
    >
      <Card card={card} />
      <button
        onClick={onRelease}
        disabled={!canRelease}
        title={
          canRelease
            ? `Розірвати контракт — ${releasePrice}M`
            : `Потрібно мін ${8} карт у складі або більше грошей (${releasePrice}M)`
        }
        className="mt-1 w-[150px] rounded-md border border-rose-300 bg-rose-50 px-2 py-1 text-[10px] text-rose-900 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-40"
      >
        🗑 Розірвати ({releasePrice}M)
      </button>
    </motion.div>
  )
}
