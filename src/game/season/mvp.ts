import type { Card, MatchState, Role } from '../types'

export interface MvpCoefficients {
  fwd: {
    goal: number
    damage: number
    teamGoal: number
    sniper: number
    hatTrickBonus: number
  }
  def: {
    absorb: number
    survived: number
    sniper: number
  }
  mid: {
    teamGoal: number
    oppGoalPenalty: number
    sniper: number
  }
}

export const DEFAULT_COEF: MvpCoefficients = {
  fwd: {
    goal: 16,
    damage: 2,
    teamGoal: 4,
    sniper: 15,
    hatTrickBonus: 15,
  },
  def: {
    absorb: 12,
    survived: 38,
    sniper: 15,
  },
  mid: {
    teamGoal: 32,
    oppGoalPenalty: 4,
    sniper: 15,
  },
}

export interface MvpCandidate {
  cardId: string
  cardName: string
  role: Role
  score: number
  breakdown: Record<string, number>
}

export interface MvpResult {
  cardId: string
  cardName: string
  role: Role
  score: number
  breakdown: Record<string, number>
}

function cardLookup(seasonCards: readonly Card[]): Map<string, Card> {
  const m = new Map<string, Card>()
  for (const c of seasonCards) m.set(c.id, c)
  return m
}

function uniqueIdsAcross(...records: Record<string, number>[]): Set<string> {
  const set = new Set<string>()
  for (const rec of records) for (const id of Object.keys(rec)) set.add(id)
  return set
}

export function computeMvp(
  match: MatchState,
  seasonCards: readonly Card[],
  coef: MvpCoefficients = DEFAULT_COEF,
): MvpResult | null {
  const lookup = cardLookup(seasonCards)
  const candidates: MvpCandidate[] = []
  const ids = uniqueIdsAcross(
    match.goalsByFwd,
    match.damageDealtByFwd,
    match.damageAbsorbedByDef,
    match.teamGoalsWhileAlive,
    match.oppGoalsWhileAlive,
    match.sniperKillsByCard,
  )

  for (const id of ids) {
    const card = lookup.get(id)
    if (!card) continue
    const role = card.role
    if (role === 'fwd') {
      const goals = match.goalsByFwd[id] ?? 0
      const dmg = match.damageDealtByFwd[id] ?? 0
      const teamGoals = match.teamGoalsWhileAlive[id] ?? 0
      const snipers = match.sniperKillsByCard[id] ?? 0
      const hatTrick = goals >= 3 ? coef.fwd.hatTrickBonus : 0
      const score =
        goals * coef.fwd.goal +
        dmg * coef.fwd.damage +
        teamGoals * coef.fwd.teamGoal +
        snipers * coef.fwd.sniper +
        hatTrick
      const breakdown: Record<string, number> = {
        Гол: goals * coef.fwd.goal,
        'Damage завданий': dmg * coef.fwd.damage,
        'Голи з ним на полі': teamGoals * coef.fwd.teamGoal,
      }
      if (snipers > 0) breakdown['Sniper kill'] = snipers * coef.fwd.sniper
      if (hatTrick > 0) breakdown['Хет-трик'] = hatTrick
      candidates.push({ cardId: id, cardName: card.name, role, score, breakdown })
    } else if (role === 'def') {
      const absorb = match.damageAbsorbedByDef[id] ?? 0
      const aliveAtEnd = match.myDefenders.some(d => d.id === id)
      const survived = aliveAtEnd ? coef.def.survived : 0
      const snipers = match.sniperKillsByCard[id] ?? 0
      const score = absorb * coef.def.absorb + survived + snipers * coef.def.sniper
      const breakdown: Record<string, number> = {
        'Damage абсорбовано': absorb * coef.def.absorb,
      }
      if (survived > 0) breakdown['Вижив'] = survived
      if (snipers > 0) breakdown['Sniper kill'] = snipers * coef.def.sniper
      candidates.push({ cardId: id, cardName: card.name, role, score, breakdown })
    } else if (role === 'mid') {
      const teamGoals = match.teamGoalsWhileAlive[id] ?? 0
      const oppGoals = match.oppGoalsWhileAlive[id] ?? 0
      const snipers = match.sniperKillsByCard[id] ?? 0
      const score =
        teamGoals * coef.mid.teamGoal -
        oppGoals * coef.mid.oppGoalPenalty +
        snipers * coef.mid.sniper
      const breakdown: Record<string, number> = {
        'Голи з ним на полі': teamGoals * coef.mid.teamGoal,
      }
      if (oppGoals > 0) breakdown['Пропущені (з ним)'] = -oppGoals * coef.mid.oppGoalPenalty
      if (snipers > 0) breakdown['Sniper kill'] = snipers * coef.mid.sniper
      candidates.push({ cardId: id, cardName: card.name, role, score, breakdown })
    }
  }

  if (candidates.length === 0) return null
  candidates.sort((a, b) => b.score - a.score)
  const top = candidates[0]
  if (top.score <= 0) return null
  return {
    cardId: top.cardId,
    cardName: top.cardName,
    role: top.role,
    score: top.score,
    breakdown: top.breakdown,
  }
}

export type MvpReward =
  | { kind: 'upgrade'; stat: 'atk' | 'hp' | 'stamina' }
  | { kind: 'money'; amount: number }

export const UPGRADE_PROBABILITY = 0.4
export const MONEY_BONUS = 25

export function rollMvpReward(role: Role, random: () => number = Math.random): MvpReward {
  if (random() < UPGRADE_PROBABILITY) {
    const stat = role === 'fwd' ? 'atk' : role === 'def' ? 'hp' : 'stamina'
    return { kind: 'upgrade', stat }
  }
  return { kind: 'money', amount: MONEY_BONUS }
}
