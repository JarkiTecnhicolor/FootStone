import { motion } from 'motion/react'
import type { Card as CardData, Keeper } from '../../game/types'
import type { DraftState, DraftStep } from '../../game/draft/types'
import {
  MAX_DECK_SIZE,
  MIN_DECK_SIZE,
  keeperPriceOf,
  priceOf,
} from '../../game/draft/pricing'
import { Card } from '../components/Card'
import { KeeperCard } from '../components/KeeperCard'

interface Props {
  state: DraftState
  onPickCard: (cardId: string) => void
  onPickKeeper: (keeperId: string) => void
  onSkip: () => void
  onFinishBench: () => void
  onStartMatch: () => void
  onAbort: () => void
}

const STEP_TITLE: Record<DraftStep, string> = {
  'star-legend': 'Зірка команди',
  keeper: 'Воротар',
  def: 'Захисник',
  mid: 'Півзахисник',
  fwd: 'Нападник',
  gold: 'Підсилення',
  bench: 'Трансфери на лаву',
  done: 'Команда готова',
}

const STEP_DIALOG: Record<DraftStep, string> = {
  'star-legend':
    '"Огого, дивись хто прийшов! На носі новий сезон, а в тебе ще нема команди. Діставай свої мільйони — будемо це виправляти. Команда без зірки — як борщ без сметани. Я тут пошукав, оці троє вже наполовину готові підписати — тільки бюджет покажи:"',
  keeper:
    '"Тепер воротар. Без нього і Modruk не врятує. Ось хлопці, поки ще без зіркового статусу, але роботящі:"',
  def:
    '"Тепер захист. Без нього навіть Cryspyano опонента не наб\'є нам менше за п\'ять — а ми так не граємо."',
  mid:
    '"Серце команди. Хто буде роздавати — Modruk, Pedrri, чи робочий хлопець за копійки?"',
  fwd:
    '"Голи самі не заб\'ються. Ось хто береться за справу:"',
  gold:
    '"Так, добре. Закріпимо чемпіонські амбіції — оці хлопці вже досягли не всього у своїх клубах, шукають змін:"',
  bench:
    '"Те, що залишилось на ринку — підсилення лави. Бери стільки, скільки гроші дозволяють і скільки голова витримає:"',
  done:
    '"От тепер це команда! За новий сезон, кеп. І не клич мене знову у середу — у мене теща."',
}

function PriceTag({ value, affordable }: { value: number; affordable: boolean }) {
  return (
    <div
      className={`mt-1 rounded px-1.5 py-0.5 text-center text-[11px] font-semibold tabular-nums ${
        affordable ? 'bg-emerald-100 text-emerald-900' : 'bg-rose-100 text-rose-900'
      }`}
    >
      {value} M
    </div>
  )
}

function CardOption({
  card,
  affordable,
  onClick,
}: {
  card: CardData
  affordable: boolean
  onClick?: () => void
}) {
  return (
    <div className="flex flex-col items-center">
      <Card card={card} size="lg" showCost />
      <PriceTag value={priceOf(card)} affordable={affordable} />
      <button
        onClick={onClick}
        disabled={!affordable}
        className="mt-1 w-[180px] rounded-md bg-stone-900 px-3 py-1.5 text-xs font-medium text-white shadow-sm transition hover:bg-stone-800 disabled:cursor-not-allowed disabled:bg-stone-300"
      >
        Підписати
      </button>
    </div>
  )
}

function KeeperOption({
  keeper,
  affordable,
  onClick,
}: {
  keeper: Keeper
  affordable: boolean
  onClick?: () => void
}) {
  return (
    <div className="flex flex-col items-center">
      <KeeperCard keeper={keeper} size="lg" />
      <PriceTag value={keeperPriceOf(keeper)} affordable={affordable} />
      <button
        onClick={onClick}
        disabled={!affordable}
        className="mt-1 w-[180px] rounded-md bg-stone-900 px-3 py-1.5 text-xs font-medium text-white shadow-sm transition hover:bg-stone-800 disabled:cursor-not-allowed disabled:bg-stone-300"
      >
        Підписати
      </button>
    </div>
  )
}

function PickedRoster({ state }: { state: DraftState }) {
  if (state.cards.length === 0 && !state.keeper) return null
  return (
    <div className="rounded-lg border border-stone-200 bg-white px-3 py-2 shadow-sm">
      <div className="mb-1.5 flex items-baseline justify-between">
        <span className="text-[10px] font-medium uppercase tracking-wider text-stone-600">
          Підписано · {state.cards.length} {state.keeper ? '+ 1 GK' : ''}
        </span>
        <span className="text-[10px] text-stone-400">
          {state.cards.length}/{MAX_DECK_SIZE}, мін {MIN_DECK_SIZE}
        </span>
      </div>
      <div className="flex flex-wrap items-stretch gap-1.5">
        {state.keeper && (
          <KeeperCard
            keeper={state.keeper}
            stretch
            footer={
              <div className="rounded bg-black/10 px-2 py-0.5 text-center text-[10px] font-semibold tabular-nums">
                💰 {keeperPriceOf(state.keeper)} M
              </div>
            }
          />
        )}
        {state.cards.map((c, i) => (
          <Card
            key={`${c.id}-picked-${i}`}
            card={c}
            showCost
            stretch
            footer={
              <div className="rounded bg-black/10 px-2 py-0.5 text-center text-[10px] font-semibold tabular-nums">
                💰 {priceOf(c)} M
              </div>
            }
          />
        ))}
      </div>
    </div>
  )
}

export function DraftScreen({
  state,
  onPickCard,
  onPickKeeper,
  onSkip,
  onFinishBench,
  onStartMatch,
  onAbort,
}: Props) {
  const isStarLegend = state.step === 'star-legend'
  const canSkip =
    state.step !== 'keeper' && state.step !== 'bench' && state.step !== 'done' && !isStarLegend
  const canFinishBench = state.step === 'bench' && state.cards.length >= MIN_DECK_SIZE
  const isDeckFull = state.cards.length >= MAX_DECK_SIZE

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-sm font-semibold text-stone-900">
          FootStone <span className="text-stone-400">/ Драфт</span>
        </div>
        <button
          onClick={onAbort}
          className="rounded-md border border-stone-300 bg-stone-50 px-2.5 py-1 text-xs hover:bg-stone-100"
        >
          ✕ Вийти
        </button>
      </div>

      <div className="flex items-center justify-between rounded-lg border border-stone-200 bg-white px-3 py-2 shadow-sm">
        <div className="flex items-baseline gap-1.5">
          <span className="text-[9px] uppercase tracking-wider text-stone-500">Етап</span>
          <span className="text-sm font-semibold text-stone-900">{STEP_TITLE[state.step]}</span>
        </div>
        <div className="flex items-baseline gap-1.5">
          <span className="text-[9px] uppercase tracking-wider text-stone-500">Бюджет</span>
          <motion.span
            key={state.budget}
            initial={{ scale: 1.3, color: '#16a34a' }}
            animate={{ scale: 1, color: '#1c1917' }}
            transition={{ duration: 0.3 }}
            className="text-base font-bold tabular-nums"
          >
            {state.budget} M
          </motion.span>
        </div>
      </div>

      <PickedRoster state={state} />

      <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-[12px] leading-relaxed text-amber-950 shadow-sm">
        <div className="mb-1 text-[10px] font-bold uppercase tracking-wider text-amber-900">
          🤵 Агент
        </div>
        {STEP_DIALOG[state.step]}
      </div>

      {state.step === 'keeper' && (
        <div className="flex flex-wrap justify-center gap-3">
          {state.keeperOptions.map(k => (
            <KeeperOption
              key={k.id}
              keeper={k}
              affordable={keeperPriceOf(k) <= state.budget}
              onClick={() => onPickKeeper(k.id)}
            />
          ))}
        </div>
      )}

      {state.step !== 'keeper' && state.step !== 'done' && (
        <div className="flex flex-wrap justify-center gap-3">
          {state.cardOptions.map(c => (
            <CardOption
              key={c.id}
              card={c}
              affordable={!isDeckFull && priceOf(c) <= state.budget}
              onClick={() => onPickCard(c.id)}
            />
          ))}
          {state.cardOptions.length === 0 && (
            <div className="text-[12px] italic text-stone-500">пул вичерпано</div>
          )}
        </div>
      )}

      {state.step === 'done' && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-center">
          <div className="text-sm font-semibold text-emerald-900">Команда готова до сезону!</div>
          <div className="mt-1 text-[11px] text-emerald-700">
            {state.cards.length} карт + воротар, залишок бюджету {state.budget} M
          </div>
          <div className="mt-1 text-[10px] text-emerald-600">
            Попереду 5 матчів. Між матчами — трансферний ринок.
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-1.5">
        {canSkip && (
          <button
            onClick={onSkip}
            className="rounded-md border border-stone-300 bg-white px-3 py-2 text-xs text-stone-700 hover:bg-stone-50"
          >
            Пропустити цей крок
          </button>
        )}
        {state.step === 'bench' && (
          <>
            <button
              onClick={onFinishBench}
              disabled={!canFinishBench}
              title={
                canFinishBench
                  ? undefined
                  : `Потрібно мін. ${MIN_DECK_SIZE} карт у складі (зараз ${state.cards.length})`
              }
              className="rounded-md bg-stone-900 px-3 py-2 text-xs font-medium text-white shadow-sm hover:bg-stone-800 disabled:cursor-not-allowed disabled:bg-stone-300"
            >
              Завершити трансфери
            </button>
            <span className="text-[10px] text-stone-500">
              {state.cards.length < MIN_DECK_SIZE
                ? `Підпиши ще ${MIN_DECK_SIZE - state.cards.length} для старту сезону`
                : 'Можеш брати ще або завершувати'}
            </span>
          </>
        )}
        {state.step === 'done' && (
          <button
            onClick={onStartMatch}
            className="flex-1 rounded-md bg-emerald-700 px-3 py-3 text-sm font-medium text-white shadow-sm hover:bg-emerald-800"
          >
            Розпочати сезон →
          </button>
        )}
      </div>
    </div>
  )
}
