import { motion } from 'motion/react'
import type { Role } from '../../game/types'
import type { SeasonState } from '../../game/season/types'
import { isSeasonChampion } from '../../game/season/state'

interface Props {
  season: SeasonState
  onRestart: () => void
}

interface AggregatedCardStat {
  cardId: string
  cardName: string
  role: Role
  mvpCount: number
  totalScore: number
}

function aggregateMvpStats(season: SeasonState): AggregatedCardStat[] {
  const byCard = new Map<string, AggregatedCardStat>()
  for (const r of season.results) {
    if (!r.mvp) continue
    const existing = byCard.get(r.mvp.cardId)
    if (existing) {
      existing.mvpCount += 1
      existing.totalScore += r.mvp.score
    } else {
      byCard.set(r.mvp.cardId, {
        cardId: r.mvp.cardId,
        cardName: r.mvp.cardName,
        role: r.mvp.role,
        mvpCount: 1,
        totalScore: r.mvp.score,
      })
    }
  }
  return Array.from(byCard.values()).sort((a, b) => b.totalScore - a.totalScore)
}

function bestByRole(stats: AggregatedCardStat[], role: Role): AggregatedCardStat | null {
  return stats.find(s => s.role === role) ?? null
}

export function SeasonCompleteScreen({ season, onRestart }: Props) {
  const wins = season.results.filter(r => r.outcome === 'win').length
  const draws = season.results.filter(r => r.outcome === 'draw').length
  const losses = season.results.filter(r => r.outcome === 'loss').length
  const goals = season.results.reduce((s, r) => s + r.myScore, 0)
  const conceded = season.results.reduce((s, r) => s + r.oppScore, 0)
  const isChampion = isSeasonChampion(season)
  const isEliminated = season.eliminated

  const aggregated = aggregateMvpStats(season)
  const bestFwd = bestByRole(aggregated, 'fwd')
  const bestMid = bestByRole(aggregated, 'mid')
  const bestDef = bestByRole(aggregated, 'def')
  const bestOverall = aggregated[0] ?? null

  return (
    <div className="space-y-3">
      <div className="text-sm font-semibold text-stone-900">
        FootStone <span className="text-stone-400">/ Кінець сезону</span>
      </div>

      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 18 }}
        className={`rounded-lg border p-5 text-center shadow-md ${
          isChampion
            ? 'border-amber-400 bg-gradient-to-br from-amber-50 via-yellow-50 to-amber-100'
            : 'border-stone-300 bg-gradient-to-br from-stone-100 to-stone-200'
        }`}
      >
        {isChampion ? (
          <>
            <div className="text-3xl font-bold tracking-wide text-amber-600">
              🏆 ВІТАЄМО! ВИ ЧЕМПІОН
            </div>
            <div className="mt-2 text-sm text-amber-900">
              Виграно всі {season.plan.length} матчів сезону
            </div>
          </>
        ) : isEliminated ? (
          <>
            <div className="text-2xl font-bold tracking-wide text-rose-700">
              💀 НА ЖАЛЬ, ВИ ВИЛЕТІЛИ
            </div>
            <div className="mt-2 text-sm text-stone-700">
              Турнір зупинено після поразки. Спробуйте знову!
            </div>
          </>
        ) : (
          <>
            <div className="text-2xl font-bold tracking-wide text-stone-700">
              ⚖️ Турнір завершено
            </div>
            <div className="mt-2 text-sm text-stone-600">
              {wins}П · {draws}Н · {losses}П
            </div>
          </>
        )}
      </motion.div>

      <div className="rounded-lg border border-stone-200 bg-white px-3 py-2 shadow-sm">
        <div className="mb-2 text-[10px] font-medium uppercase tracking-wider text-stone-600">
          📊 Статистика сезону
        </div>
        <div className="grid grid-cols-2 gap-2 text-[12px]">
          <div className="rounded bg-stone-50 px-2 py-1.5">
            <div className="text-[9px] uppercase tracking-wider text-stone-500">Голи</div>
            <div className="text-base font-semibold tabular-nums">
              <span className="text-emerald-700">{goals}</span>
              <span className="mx-1 text-stone-400">—</span>
              <span className="text-rose-700">{conceded}</span>
            </div>
          </div>
          <div className="rounded bg-stone-50 px-2 py-1.5">
            <div className="text-[9px] uppercase tracking-wider text-stone-500">Каса</div>
            <div className="text-base font-semibold tabular-nums">{season.money} M</div>
          </div>
        </div>
      </div>

      {(bestFwd || bestMid || bestDef) && (
        <div className="rounded-lg border border-stone-200 bg-white px-3 py-2 shadow-sm">
          <div className="mb-2 text-[10px] font-medium uppercase tracking-wider text-stone-600">
            🏅 Найкращі гравці сезону
          </div>
          <div className="space-y-1">
            <BestRoleRow icon="⚽" label="Найкращий форвард" stat={bestFwd} />
            <BestRoleRow icon="⚖️" label="Найкращий півзахисник" stat={bestMid} />
            <BestRoleRow icon="🛡" label="Найкращий захисник" stat={bestDef} />
          </div>
        </div>
      )}

      {bestOverall && (
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 220, damping: 18, delay: 0.3 }}
          className="rounded-lg border border-amber-300 bg-gradient-to-br from-amber-50 to-yellow-100 p-3 text-center shadow-md"
        >
          <div className="text-[10px] font-bold uppercase tracking-wider text-amber-900">
            ⭐ Гравець сезону
          </div>
          <div className="mt-1 text-lg font-bold text-amber-950">{bestOverall.cardName}</div>
          <div className="text-[11px] text-amber-800">
            {bestOverall.mvpCount}× MVP · сум. score {bestOverall.totalScore.toFixed(0)}
          </div>
        </motion.div>
      )}

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
              r.mvp && '🌟',
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

function BestRoleRow({
  icon,
  label,
  stat,
}: {
  icon: string
  label: string
  stat: AggregatedCardStat | null
}) {
  return (
    <div className="flex items-center gap-2 rounded bg-stone-50 px-2 py-1.5 text-[12px]">
      <span className="text-base">{icon}</span>
      <span className="flex-1 text-stone-700">{label}:</span>
      {stat ? (
        <span className="font-semibold text-stone-900">
          {stat.cardName}
          <span className="ml-2 text-[10px] font-normal text-stone-500 tabular-nums">
            ({stat.mvpCount}× MVP, {stat.totalScore.toFixed(0)} pts)
          </span>
        </span>
      ) : (
        <span className="text-stone-400 italic">не визначено</span>
      )}
    </div>
  )
}
