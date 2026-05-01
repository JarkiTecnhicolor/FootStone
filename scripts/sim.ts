import { runSimulation } from '../src/game/sim/simulate'
import type { PlayerAi } from '../src/game/sim/simulate'
import { PLAYER_DECK } from '../src/game/cards/player-deck'
import { SHAKHTAR } from '../src/game/cards/opponents/shakhtar'

const N = parseInt(process.argv[2] ?? '1000', 10)
const ai: PlayerAi = process.env.SMART === '1' ? 'smart' : 'dumb'
console.log(`Running ${N} matches: PLAYER_DECK (${ai}) vs ${SHAKHTAR.name}...`)
const start = Date.now()
const result = runSimulation(PLAYER_DECK, SHAKHTAR, N, ai)
const elapsed = Date.now() - start

const pct = (n: number) => `${((n / N) * 100).toFixed(1)}%`

console.log(`Done in ${elapsed}ms (${(elapsed / N).toFixed(2)}ms/match)`)
console.log()
console.log(`Wins:   ${result.wins.toString().padStart(5)} (${pct(result.wins)})`)
console.log(`Losses: ${result.losses.toString().padStart(5)} (${pct(result.losses)})`)
console.log(`Draws:  ${result.draws.toString().padStart(5)} (${pct(result.draws)})`)
console.log()
console.log(`Avg score: ${result.avgMyScore.toFixed(2)} : ${result.avgOppScore.toFixed(2)}`)
console.log()

const dist = (label: string, d: Record<number, number>) => {
  const max = Math.max(...Object.keys(d).map(Number))
  console.log(`${label} score distribution:`)
  for (let i = 0; i <= max; i++) {
    const n = d[i] || 0
    const bar = '█'.repeat(Math.round((n / N) * 50))
    console.log(`  ${i}: ${n.toString().padStart(5)} ${bar}`)
  }
}
dist('Player', result.myScoreDistribution)
console.log()
dist('Opponent', result.oppScoreDistribution)
