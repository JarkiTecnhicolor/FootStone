import type { Card, DefenderCard, ForwardCard, MidfielderCard } from '../types'
import type { PerkCondition } from './types'

export function isInvulnerable(card: Card): boolean {
  return card.perks.some(p => p.effect.kind === 'invulnerable')
}

export interface FieldSnapshot {
  ownDefenders: readonly DefenderCard[]
  ownMids: readonly MidfielderCard[]
  ownFwds: readonly ForwardCard[]
  enemyDefenders: readonly DefenderCard[]
  enemyMids: readonly MidfielderCard[]
  enemyFwds: readonly ForwardCard[]
}

export interface PlacementResult {
  card: Card
  ownDefenders: DefenderCard[]
  enemyDefenders: DefenderCard[]
  enemyMids: MidfielderCard[]
  enemyFwds: ForwardCard[]
  enemyDiscard: Card[]
  log: string[]
  pendingSniperChoice: boolean
  pendingTauntGrantChoice: boolean
}

export function unwindHpBuffsFromRemoved(
  removedDef: DefenderCard,
  remainingDefs: readonly DefenderCard[],
): DefenderCard[] {
  const isSource = removedDef.perks.some(
    p =>
      p.trigger === 'on_place' &&
      p.effect.kind === 'hp_buff' &&
      p.effect.scope === 'other_defs',
  )
  if (!isSource) return remainingDefs.slice()
  return remainingDefs.map(d => {
    const buffs = d.appliedHpBuffs ?? []
    const fromSource = buffs.filter(b => b.sourceId === removedDef.id)
    if (fromSource.length === 0) return d
    const reduction = fromSource.reduce((s, b) => s + b.amount, 0)
    const base = d.baseMaxHp ?? d.maxHp
    const newMaxHp = Math.max(base, d.maxHp - reduction)
    const newHp = Math.min(d.hp, newMaxHp)
    return {
      ...d,
      hp: newHp,
      maxHp: newMaxHp,
      appliedHpBuffs: buffs.filter(b => b.sourceId !== removedDef.id),
    }
  })
}

function matchesCondition(cond: PerkCondition | undefined, field: FieldSnapshot): boolean {
  if (!cond) return true
  switch (cond.kind) {
    case 'mid_present':
      return field.ownMids.length > 0
    case 'enemy_def_hp_eq':
      return field.enemyDefenders.some(d => d.hp === cond.hp)
    case 'playmaker_present':
      return field.ownMids.some(m =>
        m.perks.some(p => p.trigger === 'aura' && p.effect.kind === 'draw_bonus'),
      )
    case 'last_in_hand':
      return false
  }
}

export function applyOnPlacePerks(card: Card, field: FieldSnapshot): PlacementResult {
  let resultCard: Card = card
  let ownDefenders: DefenderCard[] = field.ownDefenders.slice()
  let enemyDefenders: DefenderCard[] = field.enemyDefenders.slice()
  let enemyMids: MidfielderCard[] = field.enemyMids.slice()
  let enemyFwds: ForwardCard[] = field.enemyFwds.slice()
  const enemyDiscard: Card[] = []
  const log: string[] = []
  let pendingSniperChoice = false
  let pendingTauntGrantChoice = false

  if (resultCard.role === 'def') {
    const incomingBuffs: { sourceId: string; amount: number }[] = []
    for (const d of ownDefenders) {
      if (d.id === resultCard.id) continue
      for (const perk of d.perks) {
        if (
          perk.trigger === 'on_place' &&
          perk.effect.kind === 'hp_buff' &&
          perk.effect.scope === 'other_defs'
        ) {
          incomingBuffs.push({ sourceId: d.id, amount: perk.effect.amount })
        }
      }
    }
    if (incomingBuffs.length > 0) {
      const def: DefenderCard = resultCard
      const totalBonus = incomingBuffs.reduce((s, b) => s + b.amount, 0)
      resultCard = {
        ...def,
        hp: def.hp + totalBonus,
        maxHp: def.maxHp + totalBonus,
        appliedHpBuffs: [...(def.appliedHpBuffs ?? []), ...incomingBuffs],
      }
      ownDefenders = ownDefenders.map(d =>
        d.id === resultCard.id ? (resultCard as DefenderCard) : d,
      )
      log.push(`${card.name}: +${totalBonus} HP від капітана.`)
    }
  }

  for (const perk of card.perks) {
    if (perk.trigger !== 'on_place') continue

    if (perk.effect.kind === 'hp_buff') {
      if (perk.effect.scope === 'other_defs') {
        const amt = perk.effect.amount
        const recipients: string[] = []
        ownDefenders = ownDefenders.map(d => {
          if (d.id === resultCard.id) return d
          recipients.push(d.name)
          return {
            ...d,
            hp: d.hp + amt,
            maxHp: d.maxHp + amt,
            appliedHpBuffs: [
              ...(d.appliedHpBuffs ?? []),
              { sourceId: resultCard.id, amount: amt },
            ],
          }
        })
        if (recipients.length > 0) {
          log.push(
            `${resultCard.name}: +${amt} HP усім іншим захисникам (${recipients.join(', ')}).`,
          )
        }
      } else if (resultCard.role === 'def' && matchesCondition(perk.effect.condition, field)) {
        const def: DefenderCard = resultCard
        resultCard = {
          ...def,
          hp: def.hp + perk.effect.amount,
          maxHp: def.maxHp + perk.effect.amount,
        }
        ownDefenders = ownDefenders.map(d =>
          d.id === resultCard.id ? (resultCard as DefenderCard) : d,
        )
        log.push(`${card.name}: +${perk.effect.amount} HP від синергії.`)
      }
      continue
    }

    if (perk.effect.kind === 'sniper') {
      if (perk.effect.target === 'enemy_fwd_first') {
        const targetIdx = enemyFwds.findIndex(f => !isInvulnerable(f))
        if (targetIdx >= 0) {
          const target = enemyFwds[targetIdx]
          enemyFwds = enemyFwds.filter((_, i) => i !== targetIdx)
          enemyDiscard.push(target)
          log.push(`${card.name} знесе ${target.name}!`)
        } else if (enemyFwds.length > 0) {
          log.push(`${card.name}: ціль невразлива — перка пропадає.`)
        } else {
          log.push(`${card.name}: немає цілі.`)
        }
      } else if (perk.effect.target === 'any_enemy') {
        const hasTargets =
          enemyDefenders.some(c => !isInvulnerable(c)) ||
          enemyMids.some(c => !isInvulnerable(c)) ||
          enemyFwds.some(c => !isInvulnerable(c))
        if (hasTargets) {
          pendingSniperChoice = true
        } else {
          log.push(`${card.name}: немає вразливої цілі — перка пропадає.`)
        }
      }
      continue
    }

    if (perk.effect.kind === 'grant_taunt') {
      const eligible = ownDefenders.filter(
        d =>
          d.id !== resultCard.id &&
          !d.perks.some(
            p2 => p2.trigger === 'aura' && p2.effect.kind === 'forward_defender',
          ),
      )
      if (eligible.length > 0) {
        pendingTauntGrantChoice = true
      } else {
        log.push(`${card.name}: нема кому передати ПІДСТРАХОВКА.`)
      }
      continue
    }
  }

  return {
    card: resultCard,
    ownDefenders,
    enemyDefenders,
    enemyMids,
    enemyFwds,
    enemyDiscard,
    log,
    pendingSniperChoice,
    pendingTauntGrantChoice,
  }
}

export type SniperTargetSelection =
  | { kind: 'def'; idx: number }
  | { kind: 'mid'; idx: number }
  | { kind: 'fwd'; idx: number }

export interface SniperApplyResult {
  enemyDefenders: DefenderCard[]
  enemyMids: MidfielderCard[]
  enemyFwds: ForwardCard[]
  removed: Card
  log: string[]
}

export function applySniperChoice(
  source: Card,
  field: FieldSnapshot,
  target: SniperTargetSelection,
): SniperApplyResult {
  let enemyDefenders: DefenderCard[] = field.enemyDefenders.slice()
  let enemyMids: MidfielderCard[] = field.enemyMids.slice()
  let enemyFwds: ForwardCard[] = field.enemyFwds.slice()
  let removed: Card

  if (target.kind === 'def') {
    if (!enemyDefenders[target.idx]) throw new Error(`Sniper: bad def idx ${target.idx}`)
    if (isInvulnerable(enemyDefenders[target.idx])) throw new Error('Sniper: target invulnerable')
    removed = enemyDefenders[target.idx]
    enemyDefenders = enemyDefenders.filter((_, i) => i !== target.idx)
    enemyDefenders = unwindHpBuffsFromRemoved(removed, enemyDefenders)
  } else if (target.kind === 'mid') {
    if (!enemyMids[target.idx]) throw new Error(`Sniper: bad mid idx ${target.idx}`)
    if (isInvulnerable(enemyMids[target.idx])) throw new Error('Sniper: target invulnerable')
    removed = enemyMids[target.idx]
    enemyMids = enemyMids.filter((_, i) => i !== target.idx)
  } else {
    if (!enemyFwds[target.idx]) throw new Error(`Sniper: bad fwd idx ${target.idx}`)
    if (isInvulnerable(enemyFwds[target.idx])) throw new Error('Sniper: target invulnerable')
    removed = enemyFwds[target.idx]
    enemyFwds = enemyFwds.filter((_, i) => i !== target.idx)
  }

  return {
    enemyDefenders,
    enemyMids,
    enemyFwds,
    removed,
    log: [`${source.name} знесе ${removed.name}!`],
  }
}
