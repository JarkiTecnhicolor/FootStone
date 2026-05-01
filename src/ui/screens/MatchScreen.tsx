import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion, useAnimationControls } from 'motion/react'
import { Card } from '../components/Card'
import { KeeperCard } from '../components/KeeperCard'
import { Gallery } from '../components/Gallery'
import { ConfettiBurst } from '../components/ConfettiBurst'
import { DraftScreen } from './DraftScreen'
import { BetweenMatchScreen } from './BetweenMatchScreen'
import { SeasonCompleteScreen } from './SeasonCompleteScreen'
import { isSeasonOver } from '../../game/season/state'
import { useMatchStore } from '../../store/matchStore'
import { canAfford } from '../../game/rules/cost'
import { currentHalf, decideMatchResult, isBlockedInExtraTime, isExtraTime } from '../../game/match'
import { calculateAtk, validAttackTargetIndices } from '../../game/rules/combat'
import { isInvulnerable } from '../../game/perks/dispatch'
import {
  isMuted,
  playGoalMine,
  playGoalOpp,
  playSave,
  playHalftime,
  playExtraTime,
  playKick,
  playCardPlace,
  setMuted,
} from '../lib/sfx'
import type { Card as CardData, MatchState } from '../../game/types'

function PhasePill({ match }: { match: MatchState }) {
  if (match.gameOver) {
    const result = decideMatchResult(match)
    const text =
      result === 'win'
        ? `Перемога ${match.myScore}:${match.oppScore}`
        : result === 'loss'
          ? `Поразка ${match.myScore}:${match.oppScore}`
          : `Нічия ${match.myScore}:${match.oppScore}`
    const cls =
      result === 'win'
        ? 'bg-green-100 text-green-800 border-green-200'
        : result === 'loss'
          ? 'bg-red-100 text-red-800 border-red-200'
          : 'bg-stone-100 text-stone-700 border-stone-200'
    return (
      <div className={`rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${cls}`}>{text}</div>
    )
  }
  const extra = isExtraTime(match)
  const half = currentHalf(match)
  const halfPrefix = `${half === 1 ? '1-й' : '2-й'} тайм`
  const text = match.pendingSniper
    ? '🎯 Обери ціль (Sniper)'
    : match.pendingTauntGrant
      ? '🛡 Обери захисника, кому передати ПІДСТРАХОВКА'
      : match.pendingInstantGrant
        ? '⚡ Обери форварда, кому надати АТАКА ПЕРШИМ ТЕМПОМ'
        : match.phase === 'opponent'
      ? extra
        ? `${halfPrefix} · ⏳ Доданий час · опонент…`
        : `${halfPrefix} · Хід опонента…`
      : extra
        ? `${halfPrefix} · ⏳ Доданий час · твій хід`
        : `${halfPrefix} · Твій хід ${match.turn}`
  const cls = match.pendingSniper
    ? 'bg-red-100 text-red-800 border-red-200'
    : match.pendingTauntGrant
      ? 'bg-blue-100 text-blue-800 border-blue-300 ring-2 ring-blue-300'
      : match.pendingInstantGrant
        ? 'bg-amber-100 text-amber-900 border-amber-300 ring-2 ring-amber-300'
        : extra
          ? 'bg-amber-100 text-amber-900 border-amber-200'
          : match.phase === 'opponent'
            ? 'bg-stone-100 text-stone-600 border-stone-200'
            : 'bg-blue-100 text-blue-800 border-blue-200'
  return (
    <motion.div
      key={text}
      initial={{ opacity: 0, y: -3 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18 }}
      className={`rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${cls}`}
    >
      {text}
    </motion.div>
  )
}

function StatPill({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex items-baseline gap-1.5">
      <span className="text-[9px] uppercase tracking-wider text-stone-500">{label}</span>
      <span className="text-sm font-semibold tabular-nums text-stone-900">{value}</span>
    </div>
  )
}

function ScorePill({ match }: { match: MatchState }) {
  const oppLabel = match.oppName || 'Опонент'
  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] font-medium uppercase tracking-wider text-stone-700">Гравець</span>
      <div className="relative inline-flex items-baseline rounded-md bg-stone-100 px-2 py-0.5 font-semibold tabular-nums">
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.span
            key={`my-${match.myScore}`}
            initial={{ y: 6, scale: 1.4, color: '#16a34a' }}
            animate={{ y: 0, scale: 1, color: '#1c1917' }}
            exit={{ y: -8, opacity: 0 }}
            transition={{ duration: 0.32, ease: 'easeOut' }}
            className="text-sm"
          >
            {match.myScore}
          </motion.span>
        </AnimatePresence>
        <span className="px-0.5 text-stone-400">:</span>
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.span
            key={`opp-${match.oppScore}`}
            initial={{ y: 6, scale: 1.4, color: '#dc2626' }}
            animate={{ y: 0, scale: 1, color: '#1c1917' }}
            exit={{ y: -8, opacity: 0 }}
            transition={{ duration: 0.32, ease: 'easeOut' }}
            className="text-sm"
          >
            {match.oppScore}
          </motion.span>
        </AnimatePresence>
      </div>
      <span className="text-[10px] font-medium uppercase tracking-wider text-stone-700">{oppLabel}</span>
    </div>
  )
}

function formatTurnLabel(turn: number): string {
  if (turn === 6) return '1-ий ЕКСТРА'
  if (turn >= 12) return '2-ий ЕКСТРА'
  if (turn <= 5) return `1-ий ${turn}/5`
  return `2-ий ${turn - 6}/5`
}

function ControlStrip({ match }: { match: MatchState }) {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-lg border border-stone-200 bg-white px-3 py-2 shadow-sm">
      <StatPill label="Тайм" value={formatTurnLabel(Math.min(match.turn, match.maxTurn))} />
      <div className="h-4 w-px bg-stone-200" />
      <StatPill label="Дії" value={`${match.actions}/${match.maxActions}`} />
      <div className="h-4 w-px bg-stone-200" />
      <ScorePill match={match} />
      <div className="ml-auto">
        <PhasePill match={match} />
      </div>
    </div>
  )
}


function Zone({
  label,
  children,
  emptyHint,
}: {
  label: string
  emptyHint: string
  children: React.ReactNode
}) {
  const cardCount = Array.isArray(children) ? children.length : children ? 1 : 0
  return (
    <div className="rounded-md border border-white/15 bg-white/10 px-2 py-1.5 backdrop-blur-[1px]">
      <div className="mb-1 text-[9px] font-medium uppercase tracking-wider text-white/75">
        {label}
      </div>
      <div className="flex min-h-[64px] flex-wrap items-center gap-2">
        <AnimatePresence mode="popLayout">{children}</AnimatePresence>
        {cardCount === 0 && (
          <span className="text-[10px] italic text-white/55">{emptyHint}</span>
        )}
      </div>
    </div>
  )
}

function Pitch({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="relative overflow-hidden rounded-xl shadow-md"
      style={{
        background:
          'linear-gradient(180deg, #14532d 0%, #166534 25%, #15803d 50%, #166534 75%, #14532d 100%)',
      }}
    >
      <motion.div
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            'repeating-linear-gradient(180deg, transparent 0 86px, rgba(0,0,0,0.10) 86px 172px)',
        }}
        animate={{ opacity: [0.85, 1, 0.85] }}
        transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
      />
      <div className="pointer-events-none absolute inset-2 rounded-md border-2 border-white/30" />

      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-2 z-0 -translate-x-1/2"
        style={{ width: '55%', maxWidth: 360 }}
      >
        <div
          className="rounded-b-md border-2 border-t-0 border-white/30"
          style={{ height: 110 }}
        />
        <div
          className="absolute left-1/2 top-0 -translate-x-1/2 rounded-b-md border-2 border-t-0 border-white/30"
          style={{ width: '50%', maxWidth: 180, height: 36 }}
        />
        <div
          className="absolute left-1/2 -translate-x-1/2 rounded-full bg-white/60 shadow"
          style={{ width: 6, height: 6, top: 80 }}
        />
      </div>

      <div
        aria-hidden
        className="pointer-events-none absolute bottom-2 left-1/2 z-0 -translate-x-1/2"
        style={{ width: '55%', maxWidth: 360 }}
      >
        <div
          className="rounded-t-md border-2 border-b-0 border-white/30"
          style={{ height: 110 }}
        />
        <div
          className="absolute bottom-0 left-1/2 -translate-x-1/2 rounded-t-md border-2 border-b-0 border-white/30"
          style={{ width: '50%', maxWidth: 180, height: 36 }}
        />
        <div
          className="absolute left-1/2 -translate-x-1/2 rounded-full bg-white/60 shadow"
          style={{ width: 6, height: 6, bottom: 80 }}
        />
      </div>

      <div className="relative space-y-1.5 p-3">{children}</div>
    </div>
  )
}

function GoalOverlay({
  message,
  variant,
}: {
  message: string
  variant: 'goal-mine' | 'goal-opp' | 'save'
}) {
  const cls =
    variant === 'goal-mine'
      ? 'from-green-500 to-emerald-600 text-white'
      : variant === 'goal-opp'
        ? 'from-red-500 to-red-700 text-white'
        : 'from-stone-500 to-stone-700 text-white'
  return (
    <motion.div
      className="pointer-events-none absolute inset-0 z-40 flex items-center justify-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
    >
      <motion.div
        className={`bg-gradient-to-br ${cls} rounded-2xl px-10 py-5 text-3xl font-bold shadow-2xl`}
        initial={{ scale: 0.3, rotate: -8, y: -20 }}
        animate={{ scale: [0.3, 1.25, 1], rotate: [-8, 4, 0], y: 0 }}
        exit={{ scale: 0.7, opacity: 0, y: 20 }}
        transition={{ duration: 0.45 }}
      >
        {message}
      </motion.div>
    </motion.div>
  )
}

function ExtraTimeOverlay({ half }: { half: 1 | 2 }) {
  return (
    <motion.div
      className="pointer-events-none absolute inset-0 z-50 flex items-center justify-center bg-amber-900/80 backdrop-blur-sm"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
    >
      <motion.div
        className="text-center"
        initial={{ y: -60, scale: 0.6 }}
        animate={{ y: 0, scale: 1 }}
        exit={{ y: 60, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 200, damping: 18 }}
      >
        <div className="text-6xl mb-2">⏱️</div>
        <div className="text-4xl font-bold text-white tracking-wide">Почався доданий час!</div>
        <div className="mt-2 text-sm text-amber-100">
          {half === 1 ? '1-й тайм' : '2-й тайм'} · нові форварди не виставити
        </div>
      </motion.div>
    </motion.div>
  )
}

function SniperStrike({ side }: { side: 'player' | 'opp' }) {
  // side = the SIDE BEING SNIPED. Show crosses over the targeted half of pitch.
  const top = side === 'player' ? '70%' : '20%'
  return (
    <motion.div
      className="pointer-events-none absolute left-1/2 z-30 flex -translate-x-1/2 gap-3"
      style={{ top, filter: 'drop-shadow(0_0_12px_rgba(220,38,38,0.9))' }}
      initial={{ scale: 0.3, rotate: -25, opacity: 0 }}
      animate={{ scale: 1.4, rotate: 0, opacity: 1 }}
      exit={{ scale: 0.7, opacity: 0, rotate: 15 }}
      transition={{ duration: 0.45, ease: 'backOut' }}
    >
      <span className="text-5xl">✖</span>
      <span className="text-5xl">✖</span>
    </motion.div>
  )
}

function BallStrike({ side, outcome }: { side: 'player' | 'opp'; outcome: 'goal' | 'save' | 'hit' }) {
  const fromY = side === 'player' ? '80%' : '20%'
  const toY = side === 'player' ? '8%' : '92%'
  const tint =
    outcome === 'goal'
      ? 'drop-shadow(0_0_12px_rgba(34,197,94,0.9))'
      : outcome === 'save'
        ? 'drop-shadow(0_0_10px_rgba(220,38,38,0.7))'
        : 'drop-shadow(0_0_8px_rgba(255,255,255,0.6))'
  return (
    <motion.div
      className="pointer-events-none absolute left-1/2 z-30 -translate-x-1/2 text-4xl"
      initial={{ top: fromY, scale: 0.6, opacity: 0, rotate: 0 }}
      animate={{
        top: toY,
        scale: outcome === 'goal' ? 1.5 : 1.1,
        opacity: 1,
        rotate: side === 'player' ? 720 : -720,
      }}
      exit={{ opacity: 0, scale: 0.4 }}
      transition={{ duration: 0.55, ease: 'easeOut' }}
      style={{ filter: tint }}
    >
      ⚽
    </motion.div>
  )
}

function HalftimeOverlay() {
  return (
    <motion.div
      className="pointer-events-none absolute inset-0 z-50 flex items-center justify-center bg-emerald-900/80 backdrop-blur-sm"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
    >
      <motion.div
        className="text-center"
        initial={{ y: -60, scale: 0.6 }}
        animate={{ y: 0, scale: 1 }}
        exit={{ y: 60, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 200, damping: 18 }}
      >
        <div className="text-6xl mb-2">🟡</div>
        <div className="text-4xl font-bold text-white tracking-wide">ПЕРЕРВА</div>
        <div className="mt-2 text-sm text-emerald-200">+2 карти обом командам</div>
      </motion.div>
    </motion.div>
  )
}

function CenterLine() {
  return (
    <div className="relative flex items-center justify-center py-1">
      <div className="absolute inset-x-0 h-0.5 bg-white/40" />
      <div className="relative flex h-14 w-14 items-center justify-center rounded-full border-2 border-white/40 bg-emerald-700/30">
        <div className="h-1.5 w-1.5 rounded-full bg-white/80" />
      </div>
    </div>
  )
}

function DraftWrapper({ onOpenGallery }: { onOpenGallery: () => void }) {
  const draft = useMatchStore(s => s.draft)
  const season = useMatchStore(s => s.season)
  const draftPickCard = useMatchStore(s => s.draftPickCard)
  const draftPickKeeper = useMatchStore(s => s.draftPickKeeper)
  const draftSkip = useMatchStore(s => s.draftSkip)
  const draftFinishBench = useMatchStore(s => s.draftFinishBench)
  const draftAbort = useMatchStore(s => s.draftAbort)
  const startSeasonFromDraft = useMatchStore(s => s.startSeasonFromDraft)
  const proceedToNextMatch = useMatchStore(s => s.proceedToNextMatch)
  const buyShopCard = useMatchStore(s => s.buyShopCard)
  const releaseSeasonCard = useMatchStore(s => s.releaseSeasonCard)
  const rerollShop = useMatchStore(s => s.rerollShop)
  const abortSeason = useMatchStore(s => s.abortSeason)
  const resetMatch = useMatchStore(s => s.resetMatch)

  if (draft) {
    return (
      <DraftScreen
        state={draft}
        onPickCard={draftPickCard}
        onPickKeeper={draftPickKeeper}
        onSkip={draftSkip}
        onFinishBench={draftFinishBench}
        onStartMatch={startSeasonFromDraft}
        onAbort={draftAbort}
      />
    )
  }
  if (season) {
    if (isSeasonOver(season)) {
      return <SeasonCompleteScreen season={season} onRestart={resetMatch} />
    }
    return (
      <BetweenMatchScreen
        season={season}
        onProceed={proceedToNextMatch}
        onBuy={buyShopCard}
        onRelease={releaseSeasonCard}
        onReroll={rerollShop}
        onAbort={abortSeason}
      />
    )
  }
  return <MatchSetup onOpenGallery={onOpenGallery} />
}

function MatchSetup({ onOpenGallery }: { onOpenGallery: () => void }) {
  const startQuickMatch = useMatchStore(s => s.startQuickMatch)
  const startDraft = useMatchStore(s => s.startDraft)
  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-base font-medium">FootStone</div>
          <div className="text-xs text-stone-500">Football Card Roguelike</div>
        </div>
        <button
          onClick={onOpenGallery}
          className="rounded-md border border-stone-300 bg-stone-50 px-3 py-1.5 text-xs hover:bg-stone-100"
        >
          🎴 Галерея
        </button>
      </div>

      <div className="rounded-lg border border-emerald-300 bg-gradient-to-br from-emerald-50 to-emerald-100 p-3 shadow-sm">
        <div className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-emerald-950">
          🏆 Новий забіг
        </div>
        <div className="mb-2 text-[11px] leading-snug text-emerald-900/85">
          Збираєш команду з нуля з обмеженим бюджетом. Через драфт-флоу обираєш зірку, воротаря,
          по позиціям і лаву. Потім граєш сезон.
        </div>
        <button
          onClick={startDraft}
          className="w-full rounded-md bg-emerald-700 px-3 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-emerald-800"
        >
          Розпочати драфт →
        </button>
      </div>

      <div className="rounded-lg border border-stone-300 bg-stone-50 p-3">
        <div className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-stone-900">
          ⚡ Швидкий матч (повна колекція)
        </div>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => startQuickMatch('shakhtar')}
            className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-left text-xs hover:bg-amber-100"
          >
            <div className="font-medium text-amber-950">vs Шахтар</div>
            <div className="mt-0.5 text-[10px] text-amber-800/80 leading-snug">
              Unique: Steppanenko (+2 атаки), Mudruk (+2 vs HP1), Rapunskiy (підкат фарварда)
            </div>
          </button>
          <button
            onClick={() => startQuickMatch('random')}
            className="rounded-md border border-purple-300 bg-purple-50 px-3 py-2 text-left text-xs hover:bg-purple-100"
          >
            <div className="font-medium text-purple-950">vs Випадкова</div>
            <div className="mt-0.5 text-[10px] text-purple-800/80 leading-snug">
              Команда з 12 рандомних карт твоєї колекції + випадковий воротар
            </div>
          </button>
        </div>
      </div>
    </div>
  )
}

export function MatchScreen() {
  const match = useMatchStore(s => s.match)
  const targetingFwdId = useMatchStore(s => s.targetingFwdId)
  const undoStackLength = useMatchStore(s => s.undoStack.length)
  const playCard = useMatchStore(s => s.playCard)
  const beginFwdTargeting = useMatchStore(s => s.beginFwdTargeting)
  const selectAttackTarget = useMatchStore(s => s.selectAttackTarget)
  const cancelTargeting = useMatchStore(s => s.cancelTargeting)
  const selectSniperTarget = useMatchStore(s => s.selectSniperTarget)
  const selectTauntGrantTarget = useMatchStore(s => s.selectTauntGrantTarget)
  const selectInstantGrantTarget = useMatchStore(s => s.selectInstantGrantTarget)
  const activateCardPerk = useMatchStore(s => s.activateCardPerk)
  const undo = useMatchStore(s => s.undo)
  const resetTurn = useMatchStore(s => s.resetTurn)
  const endTurn = useMatchStore(s => s.endTurn)
  const resetMatch = useMatchStore(s => s.resetMatch)
  const finalizeMatchResult = useMatchStore(s => s.finalizeMatchResult)
  const season = useMatchStore(s => s.season)

  const [galleryOpen, setGalleryOpen] = useState(false)
  const [muted, setMutedState] = useState(() => isMuted())
  const [confettiKey, setConfettiKey] = useState(0)
  const pitchShakeControls = useAnimationControls()
  const [overlay, setOverlay] = useState<
    | { kind: 'goal-mine' | 'goal-opp' | 'save'; message: string }
    | { kind: 'halftime' }
    | { kind: 'extra-time'; half: 1 | 2 }
    | null
  >(null)
  const logRef = useRef<HTMLDivElement>(null)
  const prevScores = useRef({ my: 0, opp: 0 })
  const prevTurn = useRef(0)
  const overlayTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const ballTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const prevFwdCount = useRef({ my: 0, opp: 0 })
  const prevMidCount = useRef({ my: 0, opp: 0 })
  const prevDefCount = useRef({ my: 0, opp: 0 })
  const prevScoresForBall = useRef({ my: 0, opp: 0 })
  const prevPendingSniper = useRef(false)
  const [ballEvent, setBallEvent] = useState<{
    kind: 'ball' | 'sniper'
    side: 'player' | 'opp'
    outcome?: 'goal' | 'save' | 'hit'
    nonce: number
  } | null>(null)
  const ballNonceRef = useRef(0)

  const fireBall = (side: 'player' | 'opp', outcome: 'goal' | 'save' | 'hit') => {
    if (ballTimerRef.current) clearTimeout(ballTimerRef.current)
    ballNonceRef.current += 1
    setBallEvent({ kind: 'ball', side, outcome, nonce: ballNonceRef.current })
    ballTimerRef.current = setTimeout(() => {
      setBallEvent(null)
      ballTimerRef.current = null
    }, 700)
  }

  const fireSniper = (sideSniped: 'player' | 'opp') => {
    if (ballTimerRef.current) clearTimeout(ballTimerRef.current)
    ballNonceRef.current += 1
    setBallEvent({ kind: 'sniper', side: sideSniped, nonce: ballNonceRef.current })
    ballTimerRef.current = setTimeout(() => {
      setBallEvent(null)
      ballTimerRef.current = null
    }, 750)
  }

  const flashOverlay = (
    next:
      | { kind: 'goal-mine' | 'goal-opp' | 'save'; message: string }
      | { kind: 'halftime' }
      | { kind: 'extra-time'; half: 1 | 2 },
    durationMs: number,
  ) => {
    if (overlayTimerRef.current) clearTimeout(overlayTimerRef.current)
    setOverlay(next)
    overlayTimerRef.current = setTimeout(() => {
      setOverlay(null)
      overlayTimerRef.current = null
    }, durationMs)
  }

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight
  }, [match?.log.length])

  useEffect(() => {
    if (!match) {
      prevScores.current = { my: 0, opp: 0 }
      prevTurn.current = 0
      prevFwdCount.current = { my: 0, opp: 0 }
      prevDefCount.current = { my: 0, opp: 0 }
      prevScoresForBall.current = { my: 0, opp: 0 }
      return
    }
    if (match.myScore > prevScores.current.my) {
      flashOverlay({ kind: 'goal-mine', message: '⚽ ГОЛ!' }, 1400)
      playGoalMine()
      setConfettiKey(k => k + 1)
      prevScores.current = { my: match.myScore, opp: match.oppScore }
      return
    }
    if (match.oppScore > prevScores.current.opp) {
      flashOverlay({ kind: 'goal-opp', message: 'ОПОНЕНТ ЗАБИВ' }, 1400)
      playGoalOpp()
      pitchShakeControls.start({
        x: [0, -10, 10, -8, 8, -4, 4, 0],
        transition: { duration: 0.55, ease: 'easeInOut' },
      })
      prevScores.current = { my: match.myScore, opp: match.oppScore }
      return
    }
    prevScores.current = { my: match.myScore, opp: match.oppScore }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [match?.myScore, match?.oppScore])

  useEffect(() => {
    if (!match) return
    const myFwds = match.myFwds.length
    const oppFwds = match.oppFwds.length
    const myDefs = match.myDefenders.length
    const oppDefs = match.oppDefenders.length
    const myMids = match.myMids.length
    const oppMids = match.oppMids.length
    const myScoreUp = match.myScore > prevScoresForBall.current.my
    const oppScoreUp = match.oppScore > prevScoresForBall.current.opp
    const placementHappened =
      myDefs > prevDefCount.current.my ||
      oppDefs > prevDefCount.current.opp ||
      myMids > prevMidCount.current.my ||
      oppMids > prevMidCount.current.opp ||
      myFwds > prevFwdCount.current.my ||
      oppFwds > prevFwdCount.current.opp
    const sniperResolved = !match.pendingSniper && prevPendingSniper.current

    const myCardLoss =
      myFwds < prevFwdCount.current.my ||
      myMids < prevMidCount.current.my ||
      myDefs < prevDefCount.current.my
    const oppCardLoss =
      oppFwds < prevFwdCount.current.opp ||
      oppMids < prevMidCount.current.opp ||
      oppDefs < prevDefCount.current.opp

    if ((placementHappened || sniperResolved) && (myCardLoss || oppCardLoss)) {
      // Sniper takedown — display crosses on side that lost the card
      if (myCardLoss) fireSniper('player')
      else if (oppCardLoss) fireSniper('opp')
    } else if (myFwds < prevFwdCount.current.my) {
      const outcome: 'goal' | 'save' | 'hit' = myScoreUp
        ? 'goal'
        : oppDefs < prevDefCount.current.opp
          ? 'hit'
          : 'save'
      fireBall('player', outcome)
      playKick()
      if (outcome === 'save') setTimeout(playSave, 350)
    } else if (oppFwds < prevFwdCount.current.opp) {
      const outcome: 'goal' | 'save' | 'hit' = oppScoreUp
        ? 'goal'
        : myDefs < prevDefCount.current.my
          ? 'hit'
          : 'save'
      fireBall('opp', outcome)
      playKick()
      if (outcome === 'save') setTimeout(playSave, 350)
    }

    prevFwdCount.current = { my: myFwds, opp: oppFwds }
    prevMidCount.current = { my: myMids, opp: oppMids }
    prevDefCount.current = { my: myDefs, opp: oppDefs }
    prevScoresForBall.current = { my: match.myScore, opp: match.oppScore }
    prevPendingSniper.current = !!match.pendingSniper
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    match?.myFwds.length,
    match?.oppFwds.length,
    match?.myMids.length,
    match?.oppMids.length,
    match?.myDefenders.length,
    match?.oppDefenders.length,
    match?.pendingSniper,
  ])

  useEffect(() => {
    if (!match) return
    if (prevTurn.current === 6 && match.turn === 7) {
      flashOverlay({ kind: 'halftime' }, 2200)
      playHalftime()
      prevTurn.current = match.turn
      return
    }
    if (prevTurn.current === 5 && match.turn === 6) {
      flashOverlay({ kind: 'extra-time', half: 1 }, 2000)
      playExtraTime()
      prevTurn.current = match.turn
      return
    }
    if (prevTurn.current === 11 && match.turn === 12) {
      flashOverlay({ kind: 'extra-time', half: 2 }, 2000)
      playExtraTime()
      prevTurn.current = match.turn
      return
    }
    prevTurn.current = match.turn
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [match?.turn])

  if (!match) {
    return (
      <>
        <DraftWrapper onOpenGallery={() => setGalleryOpen(true)} />
        <Gallery open={galleryOpen} onClose={() => setGalleryOpen(false)} />
      </>
    )
  }

  const isPlayerPhase = match.phase === 'player' && !match.gameOver
  const isTauntGrantMode =
    !!match.pendingTauntGrant &&
    (match.myDefenders.some(d => d.id === match.pendingTauntGrant!.sourceId) ||
      match.myMids.some(m => m.id === match.pendingTauntGrant!.sourceId))
  const isInstantGrantMode =
    !!match.pendingInstantGrant &&
    (match.myDefenders.some(d => d.id === match.pendingInstantGrant!.sourceId) ||
      match.myMids.some(m => m.id === match.pendingInstantGrant!.sourceId) ||
      match.myFwds.some(f => f.id === match.pendingInstantGrant!.sourceId))
  const canInteract =
    isPlayerPhase && !match.pendingSniper && !isTauntGrantMode && !isInstantGrantMode
  const isSniperMode = !!match.pendingSniper
  const isAttackTargeting = !!targetingFwdId

  const handPlay = (card: CardData, idx: number): (() => void) | undefined => {
    if (!canInteract) return undefined
    if (isAttackTargeting) return undefined
    if (!canAfford(match.actions, card)) return undefined
    if (isBlockedInExtraTime(card, match)) return undefined
    return () => {
      playCardPlace()
      playCard(idx)
    }
  }

  const isCardPlayable = (card: CardData): boolean =>
    canAfford(match.actions, card) && !isBlockedInExtraTime(card, match)

  const validDefTargets = validAttackTargetIndices(match.oppDefenders)
  const oppDefClick = (idx: number): (() => void) | undefined => {
    if (isSniperMode) {
      if (isInvulnerable(match.oppDefenders[idx])) return undefined
      return () => selectSniperTarget({ kind: 'def', idx })
    }
    if (isAttackTargeting) {
      if (!validDefTargets.includes(idx)) return undefined
      return () => selectAttackTarget({ kind: 'defender', idx })
    }
    return undefined
  }
  const oppMidClick = (idx: number): (() => void) | undefined => {
    if (!isSniperMode) return undefined
    if (isInvulnerable(match.oppMids[idx])) return undefined
    return () => selectSniperTarget({ kind: 'mid', idx })
  }
  const oppFwdClick = (idx: number): (() => void) | undefined => {
    if (!isSniperMode) return undefined
    if (isInvulnerable(match.oppFwds[idx])) return undefined
    return () => selectSniperTarget({ kind: 'fwd', idx })
  }

  const myFwdClick = (fwdId: string): (() => void) | undefined => {
    if (isInstantGrantMode) {
      const f = match.myFwds.find(x => x.id === fwdId)
      const alreadyInstant = f?.perks.some(
        p => p.trigger === 'self_modifier' && p.effect.kind === 'instant_attack',
      )
      if (alreadyInstant) return undefined
      return () => selectInstantGrantTarget(fwdId)
    }
    if (!canInteract) return undefined
    return () => {
      if (targetingFwdId === fwdId) cancelTargeting()
      else beginFwdTargeting(fwdId)
    }
  }

  const isCardTargetable = (zone: 'oppDef' | 'oppMid' | 'oppFwd'): boolean => {
    if (isSniperMode) return true
    if (isAttackTargeting && zone === 'oppDef') return true
    return false
  }

  const handDimmed = isAttackTargeting || isSniperMode

  return (
    <div className="relative space-y-2">
      <AnimatePresence>
        {overlay?.kind === 'goal-mine' && (
          <GoalOverlay key="goal-mine" message={overlay.message} variant="goal-mine" />
        )}
        {overlay?.kind === 'goal-opp' && (
          <GoalOverlay key="goal-opp" message={overlay.message} variant="goal-opp" />
        )}
        {overlay?.kind === 'save' && (
          <GoalOverlay key="save" message={overlay.message} variant="save" />
        )}
        {overlay?.kind === 'halftime' && <HalftimeOverlay key="halftime" />}
        {overlay?.kind === 'extra-time' && (
          <ExtraTimeOverlay key={`et-${overlay.half}`} half={overlay.half} />
        )}
      </AnimatePresence>

      <div className="flex items-center justify-between gap-2">
        <div className="text-sm font-medium text-stone-900">
          FootStone <span className="text-stone-400">/ vs {match.oppName}</span>
        </div>
        <div className="flex gap-1.5">
          <button
            onClick={() => {
              const next = !muted
              setMuted(next)
              setMutedState(next)
            }}
            title={muted ? 'Увімкнути звук' : 'Вимкнути звук'}
            aria-label={muted ? 'Увімкнути звук' : 'Вимкнути звук'}
            className="rounded-md border border-stone-300 bg-stone-50 px-2.5 py-1 text-xs hover:bg-stone-100"
          >
            {muted ? '🔇' : '🔊'}
          </button>
          <button
            onClick={() => setGalleryOpen(true)}
            className="rounded-md border border-stone-300 bg-stone-50 px-2.5 py-1 text-xs hover:bg-stone-100"
          >
            🎴 Галерея
          </button>
        </div>
      </div>

      <motion.div animate={pitchShakeControls}>
      <Pitch>
        <AnimatePresence>
          {ballEvent && ballEvent.kind === 'ball' && ballEvent.outcome && (
            <BallStrike
              key={ballEvent.nonce}
              side={ballEvent.side}
              outcome={ballEvent.outcome}
            />
          )}
          {ballEvent && ballEvent.kind === 'sniper' && (
            <SniperStrike key={ballEvent.nonce} side={ballEvent.side} />
          )}
          {confettiKey > 0 && <ConfettiBurst key={`confetti-${confettiKey}`} />}
        </AnimatePresence>
        <div className="relative flex justify-center items-end">
          <KeeperCard
            keeper={match.oppKeeper}
            highlighted={isAttackTargeting && match.oppDefenders.length === 0}
            onClick={
              isAttackTargeting && match.oppDefenders.length === 0
                ? () => selectAttackTarget({ kind: 'keeper' })
                : undefined
            }
          />
          <div className="absolute left-[calc(50%+80px)] bottom-1 text-[10px] text-white/85 leading-tight">
            рука {match.oppHand.length}
            <br />
            дека {match.oppDeck.length}
          </div>
        </div>

        <Zone label="Захист опонента" emptyHint="порожньо — атаки прямо у воротаря">
          {match.oppDefenders.map((c, i) => (
            <Card
              key={c.id}
              card={c}
              targetable={isCardTargetable('oppDef') && (isSniperMode || validDefTargets.includes(i))}
              onClick={oppDefClick(i)}
            />
          ))}
        </Zone>

        <Zone label="Півзахист опонента" emptyHint="порожньо">
          {match.oppMids.map((c, i) => (
            <Card
              key={c.id}
              card={c}
              targetable={isCardTargetable('oppMid')}
              onClick={oppMidClick(i)}
            />
          ))}
        </Zone>

        <Zone label="Атакувальна зона опонента" emptyHint="порожньо">
          {match.oppFwds.map((c, i) => (
            <Card
              key={c.id}
              card={c}
              effectiveAtk={calculateAtk(c, match.oppMids, match.myDefenders, match.oppFwds.length).finalAtk}
              targetable={isCardTargetable('oppFwd')}
              onClick={oppFwdClick(i)}
            />
          ))}
        </Zone>

        <CenterLine />

        <Zone
          label="Твоя атакувальна зона · клік на ⚡-форварда щоб атакувати"
          emptyHint="порожньо"
        >
          {match.myFwds.map(c => {
            const isInstantGrantTarget =
              isInstantGrantMode &&
              !c.perks.some(
                p => p.trigger === 'self_modifier' && p.effect.kind === 'instant_attack',
              )
            return (
            <Card
              key={c.id}
              card={c}
              effectiveAtk={calculateAtk(c, match.myMids, match.oppDefenders, match.myFwds.length).finalAtk}
              ready={c.status === 'ready_to_attack' && targetingFwdId !== c.id}
              targetable={targetingFwdId === c.id || isInstantGrantTarget}
              dimmed={isAttackTargeting && targetingFwdId !== c.id}
              onClick={myFwdClick(c.id)}
            />
            )
          })}
        </Zone>

        <Zone label="Твій півзахист" emptyHint="порожньо">
          {match.myMids.map(c => (
            <Card key={c.id} card={c} dimmed={isAttackTargeting || isSniperMode} />
          ))}
        </Zone>

        <Zone label="Твій захист" emptyHint="порожньо">
          {match.myDefenders.map(c => {
            const hasActive = c.perks.some(p => p.trigger === 'active')
            const isTauntGrantTarget =
              isTauntGrantMode &&
              c.id !== match.pendingTauntGrant?.sourceId &&
              !c.perks.some(p => p.trigger === 'aura' && p.effect.kind === 'forward_defender')
            return (
              <Card
                key={c.id}
                card={c}
                dimmed={isAttackTargeting || isSniperMode}
                targetable={isTauntGrantTarget}
                onClick={
                  isTauntGrantTarget
                    ? () => selectTauntGrantTarget(c.id)
                    : hasActive && canInteract
                      ? () => activateCardPerk(c.id)
                      : undefined
                }
              />
            )
          })}
        </Zone>

        <div className="flex justify-center">
          <KeeperCard keeper={match.myKeeper} />
        </div>
      </Pitch>
      </motion.div>

      <ControlStrip match={match} />

      <div className="rounded-lg border border-stone-200 bg-gradient-to-b from-stone-50 to-white p-3 shadow-sm">
        <div className="mb-2 flex items-baseline justify-between">
          <div className="text-[10px] font-medium uppercase tracking-wider text-stone-600">
            Твоя рука
          </div>
          <div className="text-[10px] text-stone-400">
            клік для розіграшу · дека {match.deck.length}
          </div>
        </div>
        {match.hand.length === 0 ? (
          <div className="text-[10px] italic text-stone-400">рука порожня</div>
        ) : (
          <div className="flex flex-wrap gap-2">
            <AnimatePresence mode="popLayout">
              {match.hand.map((c, i) => (
                <Card
                  key={`${c.id}-hand-${i}`}
                  card={c}
                  showCost
                  affordable={isCardPlayable(c)}
                  dimmed={handDimmed}
                  onClick={handPlay(c, i)}
                />
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      <div className="flex gap-1.5">
        {!match.gameOver && (
          <>
            <button
              onClick={undo}
              disabled={!canInteract || undoStackLength === 0}
              title="Відмінити останню дію"
              aria-label="Відмінити"
              className="flex h-9 w-9 items-center justify-center rounded-md border border-stone-300 bg-white text-stone-700 transition hover:bg-stone-50 hover:border-stone-400 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M9 14 4 9l5-5" />
                <path d="M4 9h11a5 5 0 0 1 5 5v0a5 5 0 0 1-5 5H8" />
              </svg>
            </button>
            <button
              onClick={resetTurn}
              disabled={!canInteract || undoStackLength === 0}
              title="Скинути хід"
              aria-label="Скинути хід"
              className="flex h-9 w-9 items-center justify-center rounded-md border border-stone-300 bg-white text-stone-700 transition hover:bg-stone-50 hover:border-stone-400 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M3 12a9 9 0 1 0 3-6.7" />
                <path d="M3 4v5h5" />
              </svg>
            </button>
            {(isAttackTargeting || isSniperMode) && (
              <button
                onClick={cancelTargeting}
                className="rounded-md border border-stone-300 bg-white px-3 py-2 text-xs text-stone-700 transition hover:bg-stone-50"
              >
                Скасувати
              </button>
            )}
            <button
              onClick={() => {
                window.scrollTo({ top: 0, behavior: 'smooth' })
                endTurn()
              }}
              disabled={!canInteract}
              className="flex-1 rounded-md bg-stone-900 px-3 py-2 text-xs font-medium text-white shadow-sm transition hover:bg-stone-800 disabled:cursor-not-allowed disabled:bg-stone-400 disabled:shadow-none"
            >
              Завершити хід →
            </button>
          </>
        )}
        {match.gameOver && season && (
          <button
            onClick={finalizeMatchResult}
            className="flex-1 rounded-md bg-emerald-700 px-3 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-emerald-800"
          >
            До трансферного ринку →
          </button>
        )}
        {match.gameOver && !season && (
          <button
            onClick={resetMatch}
            className="flex-1 rounded-md bg-stone-900 px-3 py-2 text-xs font-medium text-white shadow-sm transition hover:bg-stone-800"
          >
            Новий матч
          </button>
        )}
      </div>

      <div
        ref={logRef}
        className="max-h-64 overflow-y-auto rounded-md bg-stone-100 p-2 text-[11px] text-stone-600"
      >
        {match.log.map((m, i) => (
          <div key={i}>{m}</div>
        ))}
      </div>

      <Gallery open={galleryOpen} onClose={() => setGalleryOpen(false)} />
    </div>
  )
}
