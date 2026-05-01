import type { DefenderCard, ForwardCard, Keeper, MidfielderCard } from '../types'
import type { PerkCondition } from '../perks/types'
import { unwindHpBuffsFromRemoved } from '../perks/dispatch'

export type AtkBuffOrigin = 'aura' | 'self'

export interface AtkBuff {
  source: string
  amount: number
  origin: AtkBuffOrigin
}

export interface AtkCalculation {
  baseAtk: number
  buffs: AtkBuff[]
  finalAtk: number
}

interface ConditionContext {
  attackerMids: MidfielderCard[]
  enemyDefenders: DefenderCard[]
  attackerJokerArmed?: boolean
}

function matchesCondition(cond: PerkCondition | undefined, ctx: ConditionContext): boolean {
  if (!cond) return true
  switch (cond.kind) {
    case 'mid_present':
      return ctx.attackerMids.length > 0
    case 'enemy_def_hp_eq':
      return ctx.enemyDefenders.some(d => d.hp === cond.hp)
    case 'playmaker_present':
      return ctx.attackerMids.some(m =>
        m.perks.some(p => p.trigger === 'aura' && p.effect.kind === 'draw_bonus'),
      )
    case 'last_in_hand':
      return ctx.attackerJokerArmed === true
  }
}

export function calculateAtk(
  attacker: ForwardCard,
  attackerMids: MidfielderCard[],
  enemyDefenders: DefenderCard[],
  attackerFwdCount?: number,
  attackerFwds?: readonly ForwardCard[],
): AtkCalculation {
  let atk = attacker.atk
  const buffs: AtkBuff[] = []
  const ctx: ConditionContext = {
    attackerMids,
    enemyDefenders,
    attackerJokerArmed: attacker.jokerArmed,
  }

  for (const mid of attackerMids) {
    for (const perk of mid.perks) {
      if (perk.trigger !== 'aura') continue
      if (perk.effect.kind !== 'atk_buff') continue
      if (perk.effect.scope !== 'all_my_fwds') continue
      if (!matchesCondition(perk.effect.condition, ctx)) continue
      atk += perk.effect.amount
      buffs.push({ source: mid.name, amount: perk.effect.amount, origin: 'aura' })
    }
  }

  if (attackerFwds) {
    for (const fwd of attackerFwds) {
      if (fwd.id === attacker.id) continue
      for (const perk of fwd.perks) {
        if (perk.trigger !== 'aura') continue
        if (perk.effect.kind !== 'atk_buff') continue
        if (perk.effect.scope !== 'other_fwds') continue
        if (!matchesCondition(perk.effect.condition, ctx)) continue
        atk += perk.effect.amount
        buffs.push({ source: fwd.name, amount: perk.effect.amount, origin: 'aura' })
      }
    }
  }

  for (const perk of attacker.perks) {
    if (perk.trigger !== 'self_modifier') continue
    if (perk.effect.kind !== 'atk_buff') continue
    if (perk.effect.scope !== 'self') continue
    if (!matchesCondition(perk.effect.condition, ctx)) continue
    atk += perk.effect.amount
    buffs.push({ source: attacker.name, amount: perk.effect.amount, origin: 'self' })
  }

  if (attackerFwdCount !== undefined) {
    for (const def of enemyDefenders) {
      for (const perk of def.perks) {
        if (perk.trigger !== 'aura') continue
        if (perk.effect.kind !== 'intimidate') continue
        if (attackerFwdCount < perk.effect.threshold) continue
        atk -= perk.effect.amount
        buffs.push({ source: def.name, amount: -perk.effect.amount, origin: 'aura' })
      }
    }
  }

  return { baseAtk: attacker.atk, buffs, finalAtk: Math.max(0, atk) }
}

export function hasBypass(card: ForwardCard): boolean {
  return card.perks.some(
    p => p.trigger === 'self_modifier' && p.effect.kind === 'bypass_keeper',
  )
}

export function hasInstantAttack(card: ForwardCard): boolean {
  return card.perks.some(
    p => p.trigger === 'self_modifier' && p.effect.kind === 'instant_attack',
  )
}

export function hasIsolation(card: ForwardCard): boolean {
  return card.perks.some(
    p => p.trigger === 'self_modifier' && p.effect.kind === 'isolation',
  )
}

export function isForwardDefender(d: DefenderCard): boolean {
  return d.perks.some(
    p => p.trigger === 'aura' && p.effect.kind === 'forward_defender',
  )
}

export function effectiveKeeperSave(keeper: Keeper, attacker: ForwardCard): number {
  let reduction = 0
  for (const p of attacker.perks) {
    if (p.trigger !== 'self_modifier') continue
    if (p.effect.kind !== 'keeper_save_reducer') continue
    reduction += p.effect.amount
  }
  return Math.max(0, keeper.save - reduction)
}

export function validAttackTargetIndices(defenders: readonly DefenderCard[]): number[] {
  if (defenders.length === 0) return []
  const taunts: number[] = []
  defenders.forEach((d, i) => {
    if (isForwardDefender(d)) taunts.push(i)
  })
  return taunts.length > 0 ? taunts : defenders.map((_, i) => i)
}

export function calculateDamageReduction(defenderMids: MidfielderCard[]): number {
  let reduction = 0
  for (const mid of defenderMids) {
    for (const perk of mid.perks) {
      if (perk.trigger === 'aura' && perk.effect.kind === 'damage_reducer') {
        reduction += perk.effect.amount
      }
    }
  }
  return reduction
}

export type AttackTarget =
  | { kind: 'defender'; idx: number }
  | { kind: 'keeper' }

export interface AttackInput {
  attacker: ForwardCard
  defenders: DefenderCard[]
  keeper: Keeper
  attackerMids: MidfielderCard[]
  defenderMids: MidfielderCard[]
  attackerFwdCount?: number
  attackerFwds?: readonly ForwardCard[]
  target: AttackTarget
  random?: () => number
}

export interface AttackResult {
  atk: AtkCalculation
  damageReduction: number
  damageDealt: number

  defenderHitIdx: number | null
  defenderRemoved: boolean
  newEnemyDefenders: DefenderCard[]

  reachedKeeper: boolean
  keeperDamage: number
  goal: boolean
  keeperSavedRandom: boolean
  buffsStripped: number

  bypass: boolean
}

function applyKeeperAbilities(
  keeperDamage: number,
  initialGoal: boolean,
  keeper: Keeper,
  buffs: AtkBuff[],
  random: () => number,
  effSave: number,
): { goal: boolean; keeperDamage: number; randomSave: boolean; buffsStripped: number } {
  let damage = keeperDamage
  let buffsStripped = 0

  if (keeper.abilities.some(a => a.kind === 'strip_buffs')) {
    const auraBuffs = buffs.filter(b => b.origin === 'aura')
    buffsStripped = auraBuffs.reduce((sum, b) => sum + b.amount, 0)
    damage = Math.max(0, damage - buffsStripped)
  }

  let goal = damage > effSave && initialGoal !== false

  let randomSave = false
  const rs = keeper.abilities.find(a => a.kind === 'random_save')
  if (goal && rs && rs.kind === 'random_save') {
    if (random() < rs.chance) {
      goal = false
      randomSave = true
    }
  }

  return { goal, keeperDamage: damage, randomSave, buffsStripped }
}

export function resolveAttack(input: AttackInput): AttackResult {
  const { attacker, defenders, keeper, attackerMids, defenderMids, target, attackerFwdCount, attackerFwds } = input
  const random = input.random ?? Math.random

  const atk = calculateAtk(attacker, attackerMids, defenders, attackerFwdCount, attackerFwds)
  const damageReduction = calculateDamageReduction(defenderMids)
  const effSave = effectiveKeeperSave(keeper, attacker)
  const damageDealt = Math.max(0, atk.finalAtk - damageReduction)

  if (hasBypass(attacker)) {
    const initialGoal = damageDealt > effSave
    const finalRes = applyKeeperAbilities(damageDealt, initialGoal, keeper, atk.buffs, random, effSave)
    return {
      atk,
      damageReduction,
      damageDealt,
      defenderHitIdx: null,
      defenderRemoved: false,
      newEnemyDefenders: defenders,
      reachedKeeper: true,
      keeperDamage: finalRes.keeperDamage,
      goal: finalRes.goal,
      keeperSavedRandom: finalRes.randomSave,
      buffsStripped: finalRes.buffsStripped,
      bypass: true,
    }
  }

  if (target.kind === 'defender') {
    const def = defenders[target.idx]
    if (!def) {
      throw new Error(`resolveAttack: defender index ${target.idx} out of bounds`)
    }

    if (damageDealt < def.hp) {
      const newDefenders = defenders.map((d, i) =>
        i === target.idx ? { ...d, hp: d.hp - damageDealt } : d,
      )
      return {
        atk,
        damageReduction,
        damageDealt,
        defenderHitIdx: target.idx,
        defenderRemoved: false,
        newEnemyDefenders: newDefenders,
        reachedKeeper: false,
        keeperDamage: 0,
        goal: false,
        keeperSavedRandom: false,
        buffsStripped: 0,
        bypass: false,
      }
    }

    const isolation = hasIsolation(attacker)

    let leftover: number
    let newDefenders: DefenderCard[]
    if (isolation) {
      leftover = damageDealt - def.hp
      newDefenders = defenders.filter((_, i) => i !== target.idx)
      newDefenders = unwindHpBuffsFromRemoved(def, newDefenders)
    } else {
      let remainingDmg = damageDealt
      const aliveSet = new Set(defenders.map((_, i) => i))
      const removed = new Set<number>()
      let partialHpUpdate: { idx: number; newHp: number } | null = null
      let currentIdx = target.idx

      while (remainingDmg > 0 && aliveSet.size > 0) {
        const d = defenders[currentIdx]
        if (remainingDmg < d.hp) {
          partialHpUpdate = { idx: currentIdx, newHp: d.hp - remainingDmg }
          remainingDmg = 0
          break
        }
        remainingDmg -= d.hp
        removed.add(currentIdx)
        aliveSet.delete(currentIdx)
        if (remainingDmg === 0 || aliveSet.size === 0) break

        const aliveArr = [...aliveSet]
        const taunts = aliveArr.filter(i => isForwardDefender(defenders[i]))
        const pool = taunts.length > 0 ? taunts : aliveArr
        currentIdx = pool[Math.floor(random() * pool.length)]
      }

      newDefenders = defenders
        .map((d, i) =>
          partialHpUpdate && partialHpUpdate.idx === i
            ? { ...d, hp: partialHpUpdate.newHp }
            : d,
        )
        .filter((_, i) => !removed.has(i))
      for (const i of removed) {
        newDefenders = unwindHpBuffsFromRemoved(defenders[i], newDefenders)
      }
      leftover = remainingDmg
    }

    if (leftover === 0) {
      return {
        atk,
        damageReduction,
        damageDealt,
        defenderHitIdx: target.idx,
        defenderRemoved: true,
        newEnemyDefenders: newDefenders,
        reachedKeeper: false,
        keeperDamage: 0,
        goal: false,
        keeperSavedRandom: false,
        buffsStripped: 0,
        bypass: false,
      }
    }

    const initialGoal = leftover > effSave
    const finalRes = applyKeeperAbilities(leftover, initialGoal, keeper, atk.buffs, random, effSave)
    return {
      atk,
      damageReduction,
      damageDealt,
      defenderHitIdx: target.idx,
      defenderRemoved: true,
      newEnemyDefenders: newDefenders,
      reachedKeeper: true,
      keeperDamage: finalRes.keeperDamage,
      goal: finalRes.goal,
      keeperSavedRandom: finalRes.randomSave,
      buffsStripped: finalRes.buffsStripped,
      bypass: false,
    }
  }

  const initialGoal = damageDealt > effSave
  const finalRes = applyKeeperAbilities(damageDealt, initialGoal, keeper, atk.buffs, random, effSave)
  return {
    atk,
    damageReduction,
    damageDealt,
    defenderHitIdx: null,
    defenderRemoved: false,
    newEnemyDefenders: defenders,
    reachedKeeper: true,
    keeperDamage: finalRes.keeperDamage,
    goal: finalRes.goal,
    keeperSavedRandom: finalRes.randomSave,
    buffsStripped: finalRes.buffsStripped,
    bypass: false,
  }
}
