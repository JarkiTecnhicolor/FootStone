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
import type { Card, MatchState, OpponentDeck } from '../src/game/types'

interface RoleCount {
  def: number
  mid: number
  fwd: number
}

function rollupByRole(cards: readonly Card[]): RoleCount {
  return {
    def: cards.filter(c => c.role === 'def').length,
    mid: cards.filter(c => c.role === 'mid').length,
    fwd: cards.filter(c => c.role === 'fwd').length,
  }
}

function placedByRole(state: MatchState, side: 'me' | 'opp'): RoleCount {
  const onField =
    side === 'me'
      ? { def: state.myDefenders.length, mid: state.myMids.length, fwd: state.myFwds.length }
      : { def: state.oppDefenders.length, mid: state.oppMids.length, fwd: state.oppFwds.length }
  const disc = side === 'me' ? rollupByRole(state.discard) : rollupByRole(state.oppDiscard)
  return {
    def: onField.def + disc.def,
    mid: onField.mid + disc.mid,
    fwd: onField.fwd + disc.fwd,
  }
}

function sumValues(rec: Record<string, number>): number {
  let s = 0
  for (const k in rec) s += rec[k]
  return s
}

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
  myPlaced: RoleCount
  oppPlaced: RoleCount
  mySniperKills: number
  oppSniperKills: number
  myDamage: number
  totalTurns: number
}

const stats: OppStats[] = opponents.map(o => ({
  name: o.name,
  cost: deckCost(o),
  wins: 0,
  losses: 0,
  draws: 0,
  totalMy: 0,
  totalOpp: 0,
  myPlaced: { def: 0, mid: 0, fwd: 0 },
  oppPlaced: { def: 0, mid: 0, fwd: 0 },
  mySniperKills: 0,
  oppSniperKills: 0,
  myDamage: 0,
  totalTurns: 0,
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
    const s = stats[i]
    if (outcome === 'win') s.wins++
    else if (outcome === 'loss') s.losses++
    else s.draws++
    s.totalMy += final.myScore
    s.totalOpp += final.oppScore
    const myP = placedByRole(final, 'me')
    const oppP = placedByRole(final, 'opp')
    s.myPlaced.def += myP.def
    s.myPlaced.mid += myP.mid
    s.myPlaced.fwd += myP.fwd
    s.oppPlaced.def += oppP.def
    s.oppPlaced.mid += oppP.mid
    s.oppPlaced.fwd += oppP.fwd
    s.myDamage += sumValues(final.damageDealtByFwd)
    s.totalTurns += final.turn
    // sniperKillsByCard tracks BOTH sides; we have only ids of source. Distinguish by checking
    // whether each id belongs to player roster or opp roster.
    const playerIds = new Set<string>([...team.cards.map(c => c.id), team.keeper.id])
    for (const id in final.sniperKillsByCard) {
      const v = final.sniperKillsByCard[id]
      if (playerIds.has(id)) s.mySniperKills += v
      else s.oppSniperKills += v
    }
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

console.log('Виставлено карт за матч (середнє, гравець | опонент):')
const tHeader = `${pad('Суперник', nameW)}    DEF        MID        FWD       Σ        Snipers (us|opp)   Турни`
console.log(tHeader)
console.log('-'.repeat(tHeader.length))
for (const s of stats) {
  const myDef = s.myPlaced.def / ROSTERS
  const myMid = s.myPlaced.mid / ROSTERS
  const myFwd = s.myPlaced.fwd / ROSTERS
  const oppDef = s.oppPlaced.def / ROSTERS
  const oppMid = s.oppPlaced.mid / ROSTERS
  const oppFwd = s.oppPlaced.fwd / ROSTERS
  const myTotal = myDef + myMid + myFwd
  const oppTotal = oppDef + oppMid + oppFwd
  const mySn = s.mySniperKills / ROSTERS
  const oppSn = s.oppSniperKills / ROSTERS
  const turns = s.totalTurns / ROSTERS
  console.log(
    `${pad(s.name, nameW)}  ${myDef.toFixed(2)}|${oppDef.toFixed(2)}  ${myMid.toFixed(2)}|${oppMid.toFixed(2)}  ${myFwd.toFixed(2)}|${oppFwd.toFixed(2)}  ${myTotal.toFixed(1)}|${oppTotal.toFixed(1)}    ${mySn.toFixed(2)}|${oppSn.toFixed(2)}        ${turns.toFixed(1)}`,
  )
}
console.log()

console.log('Ренкінг за winrate (важче внизу):')
const ranked = [...stats].sort((a, b) => b.wins - a.wins)
ranked.forEach((s, idx) => {
  const winRate = (s.wins / ROSTERS) * 100
  const bar = '█'.repeat(Math.round(winRate / 2))
  console.log(`  ${idx + 1}. ${pad(s.name, nameW)}  ${winRate.toFixed(1).padStart(5)}%  ${bar}`)
})
console.log()
console.log(`(W/L/D — у відсотках; "Гол:Проп" — середнє за гру; "Δ" — гольова різниця)`)
console.log(`(DEF/MID/FWD — кількість виставлених карт за матч; "Турни" — скільки тривав матч)`)

// Convince linter
void pct
