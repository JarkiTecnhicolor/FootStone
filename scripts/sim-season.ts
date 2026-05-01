import { simulateSeason } from '../src/game/sim/simulate'
import type { PlayerAi } from '../src/game/sim/simulate'
import { PLAYER_DECK } from '../src/game/cards/player-deck'

const N = parseInt(process.argv[2] ?? '500', 10)
const ai: PlayerAi = process.env.SMART === '0' ? 'dumb' : 'smart'

console.log(`Running ${N} full seasons (${ai} player) ...`)
const start = Date.now()

let champions = 0
const eliminatedAt: number[] = [0, 0, 0, 0, 0, 0]
let totalGoals = 0
let totalConceded = 0
let totalMoney = 0
let totalUpgrades = 0
const survivedHist: number[] = [0, 0, 0, 0, 0, 0]

for (let i = 0; i < N; i++) {
  const r = simulateSeason(PLAYER_DECK, undefined, ai)
  if (r.champion) champions++
  survivedHist[r.matchesSurvived] = (survivedHist[r.matchesSurvived] || 0) + 1
  if (!r.champion) {
    // Find first loss index
    const lossIdx = r.results.findIndex(res => res.outcome === 'loss')
    if (lossIdx >= 0) eliminatedAt[lossIdx] = (eliminatedAt[lossIdx] || 0) + 1
  }
  totalGoals += r.totalMyGoals
  totalConceded += r.totalOppGoals
  totalMoney += r.finalMoney
  totalUpgrades += r.upgradesEarned
}

const elapsed = Date.now() - start
const pct = (n: number) => `${((n / N) * 100).toFixed(1)}%`

console.log(`Done in ${elapsed}ms (${(elapsed / N).toFixed(1)}ms/season)`)
console.log()
console.log(`Champions: ${champions} (${pct(champions)})`)
console.log()
console.log('Eliminated at match:')
for (let i = 0; i < 5; i++) {
  if (eliminatedAt[i] > 0) {
    const bar = '█'.repeat(Math.round((eliminatedAt[i] / N) * 50))
    console.log(`  match ${i + 1}: ${eliminatedAt[i].toString().padStart(4)} (${pct(eliminatedAt[i])}) ${bar}`)
  }
}
console.log()
console.log('Matches survived (incl champions=5):')
for (let i = 0; i <= 5; i++) {
  if (survivedHist[i] > 0) {
    const bar = '█'.repeat(Math.round((survivedHist[i] / N) * 50))
    console.log(`  ${i}: ${survivedHist[i].toString().padStart(4)} (${pct(survivedHist[i])}) ${bar}`)
  }
}
console.log()
console.log(`Avg goals scored: ${(totalGoals / N).toFixed(2)}`)
console.log(`Avg goals conceded: ${(totalConceded / N).toFixed(2)}`)
console.log(`Avg final money: ${(totalMoney / N).toFixed(0)}M`)
console.log(`Avg upgrades earned: ${(totalUpgrades / N).toFixed(2)}`)
