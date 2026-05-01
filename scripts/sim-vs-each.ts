import { autoDraft, simulateOne } from '../src/game/sim/simulate'
import type { PlayerAi } from '../src/game/sim/simulate'
import { decideMatchResult } from '../src/game/match'
import { PLAYER_DECK } from '../src/game/cards/player-deck'
import { PLAYER_KEEPERS } from '../src/game/keepers/player-keepers'
import { STARTING_BUDGET, priceOf, keeperPriceOf } from '../src/game/draft/pricing'
import { DYNAMO } from '../src/game/cards/opponents/dynamo'
import { SHAKHTAR } from '../src/game/cards/opponents/shakhtar'
import { BARCELONA } from '../src/game/cards/opponents/barcelona'
import { REAL } from '../src/game/cards/opponents/real'
import { WORLD_ALLSTAR } from '../src/game/cards/opponents/world'
import type { OpponentDeck } from '../src/game/types'

const ROSTERS = parseInt(process.argv[2] ?? '500', 10)
const ai: PlayerAi = process.env.SMART === '0' ? 'dumb' : 'smart'

const opponents: OpponentDeck[] = [DYNAMO, SHAKHTAR, BARCELONA, REAL, WORLD_ALLSTAR]

function deckCost(opp: OpponentDeck): number {
  const cards = opp.cards.reduce((s, c) => s + priceOf(c), 0)
  const keeper = opp.keepers.length > 0 ? keeperPriceOf(opp.keepers[0]) : 0
  return cards + keeper
}

interface OppStats {
  name: string
  cost: number
  wins: number
  losses: number
  draws: number
  totalMy: number
  totalOpp: number
}

const stats: OppStats[] = opponents.map(o => ({
  name: o.name,
  cost: deckCost(o),
  wins: 0,
  losses: 0,
  draws: 0,
  totalMy: 0,
  totalOpp: 0,
}))

console.log(`Тест: ${ROSTERS} ростерів × ${opponents.length} суперників = ${ROSTERS * opponents.length} матчів (${ai} AI)`)
console.log(`Кожен ростер драфтиться один раз і грає проти кожного суперника.`)
console.log()

const start = Date.now()
for (let r = 0; r < ROSTERS; r++) {
  const team = autoDraft(PLAYER_DECK, PLAYER_KEEPERS, STARTING_BUDGET)
  for (let i = 0; i < opponents.length; i++) {
    const final = simulateOne(team.cards, opponents[i], ai, [team.keeper])
    const outcome = decideMatchResult(final)
    if (outcome === 'win') stats[i].wins++
    else if (outcome === 'loss') stats[i].losses++
    else stats[i].draws++
    stats[i].totalMy += final.myScore
    stats[i].totalOpp += final.oppScore
  }
}
const elapsed = Date.now() - start
const pct = (n: number) => `${((n / ROSTERS) * 100).toFixed(1)}%`

console.log(`Готово за ${elapsed}ms (${(elapsed / (ROSTERS * opponents.length)).toFixed(2)}ms/матч)`)
console.log()

const nameW = Math.max(...stats.map(s => s.name.length))
const pad = (s: string, n: number) => s + ' '.repeat(Math.max(0, n - s.length))
const header = `${pad('Суперник', nameW)}  Cost   W%      L%      D%      Гол:Проп   Δ`
console.log(header)
console.log('-'.repeat(header.length))
for (const s of stats) {
  const winRate = (s.wins / ROSTERS) * 100
  const lossRate = (s.losses / ROSTERS) * 100
  const drawRate = (s.draws / ROSTERS) * 100
  const avgMy = s.totalMy / ROSTERS
  const avgOpp = s.totalOpp / ROSTERS
  const diff = avgMy - avgOpp
  console.log(
    `${pad(s.name, nameW)}  ${s.cost.toString().padStart(4)}M  ${winRate.toFixed(1).padStart(5)}%  ${lossRate.toFixed(1).padStart(5)}%  ${drawRate.toFixed(1).padStart(5)}%  ${avgMy.toFixed(2)}:${avgOpp.toFixed(2)}  ${diff >= 0 ? '+' : ''}${diff.toFixed(2)}`,
  )
}
console.log()

// Sortable rank by winrate
console.log('Ренкінг за winrate (важче внизу):')
const ranked = [...stats].sort((a, b) => b.wins - a.wins)
ranked.forEach((s, idx) => {
  const winRate = (s.wins / ROSTERS) * 100
  const bar = '█'.repeat(Math.round(winRate / 2))
  console.log(`  ${idx + 1}. ${pad(s.name, nameW)}  ${winRate.toFixed(1).padStart(5)}%  ${bar}`)
})
console.log()
console.log(`(W/L/D — у відсотках; "Гол:Проп" — середнє за гру; "Δ" — гольова різниця)`)

// Convince linter
void pct
