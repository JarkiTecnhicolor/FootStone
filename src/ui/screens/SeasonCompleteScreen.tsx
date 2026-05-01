import { motion } from 'motion/react'
import type { SeasonState } from '../../game/season/types'

interface Props {
  season: SeasonState
  onRestart: () => void
}

export function SeasonCompleteScreen({ season, onRestart }: Props) {
  const wins = season.results.filter(r => r.outcome === 'win').length
  const draws = season.results.filter(r => r.outcome === 'draw').length
  const losses = season.results.filter(r => r.outcome === 'loss').length
  const goals = season.results.reduce((s, r) => s + r.myScore, 0)
  const conceded = season.results.reduce((s, r) => s + r.oppScore, 0)
  const points = wins * 3 + draws

  const verdict =
    wins === season.plan.length
      ? '🏆 ІДЕАЛЬНИЙ СЕЗОН'
      : wins >= 3
        ? '🥇 ЧЕМПІОНИ'
        : wins >= 2
          ? '🥈 ЗАЛИК'
          : wins >= 1
            ? '🥉 ВНІЧИЮ З ДОЛЕЮ'
            : '💀 КАТАСТРОФА'

  const verdictColor =
    wins === season.plan.length
      ? 'text-amber-600'
      : wins >= 3
        ? 'text-emerald-700'
        : wins >= 2
          ? 'text-blue-700'
          : wins >= 1
            ? 'text-stone-700'
            : 'text-rose-700'

  return (
    <div className="space-y-3">
      <div className="text-sm font-semibold text-stone-900">
        FootStone <span className="text-stone-400">/ Кінець сезону</span>
      </div>

      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 18 }}
        className="rounded-lg border border-stone-300 bg-gradient-to-br from-amber-50 via-yellow-50 to-amber-100 p-5 text-center shadow-md"
      >
        <div className={`text-2xl font-bold tracking-wide ${verdictColor}`}>{verdict}</div>
        <div className="mt-2 text-sm text-stone-700">
          {wins}П · {draws}Н · {losses}П · {points} очок
        </div>
        <div className="mt-1 text-xs text-stone-500">
          Голи: {goals} забито, {conceded} пропущено · Каса: {season.money}M
        </div>
      </motion.div>

      <div className="rounded-lg border border-stone-200 bg-white px-3 py-2 shadow-sm">
        <div className="mb-1.5 text-[10px] font-medium uppercase tracking-wider text-stone-600">
          Результати матчів
        </div>
        <div className="space-y-1">
          {season.results.map(r => {
            const cls =
              r.outcome === 'win'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                : r.outcome === 'draw'
                  ? 'bg-stone-50 border-stone-200 text-stone-700'
                  : 'bg-rose-50 border-rose-200 text-rose-900'
            const badges = [
              r.breakdown.cleanSheet > 0 && '🚪',
              r.breakdown.hatTrick > 0 && '⚽⚽⚽',
              r.breakdown.blowout > 0 && '💥',
            ].filter(Boolean)
            return (
              <div
                key={r.idx}
                className={`flex items-center gap-2 rounded-md border px-2 py-1.5 ${cls}`}
              >
                <span className="w-5 text-center">
                  {r.outcome === 'win' ? '✅' : r.outcome === 'draw' ? '➖' : '❌'}
                </span>
                <span className="w-5 text-[10px] text-stone-500 tabular-nums">
                  {r.idx + 1}.
                </span>
                <span className="flex-1 text-[12px] font-medium">{r.oppName}</span>
                {badges.length > 0 && (
                  <span className="text-[10px]">{badges.join(' ')}</span>
                )}
                <span className="text-[12px] font-semibold tabular-nums">
                  {r.myScore}:{r.oppScore}
                  <span className="ml-2 text-emerald-700">+{r.reward}M</span>
                </span>
              </div>
            )
          })}
        </div>
      </div>

      <button
        onClick={onRestart}
        className="w-full rounded-md bg-stone-900 px-3 py-3 text-sm font-medium text-white shadow-sm transition hover:bg-stone-800"
      >
        🔄 Новий забіг
      </button>
    </div>
  )
}
