import type { Perk } from './perks/types'

export type Role = 'def' | 'mid' | 'fwd'
export type Side = 'player' | 'opp'
export type Phase = 'player' | 'opponent' | 'resolving'
export type ForwardStatus = 'attacking_next' | 'ready_to_attack'
export type Rarity = 'bronze' | 'silver' | 'gold' | 'legend'

export interface BaseCard {
  id: string
  name: string
  role: Role
  cost: number
  perks: Perk[]
  unique?: boolean
  rarity?: Rarity
  price?: number
}

export interface AppliedHpBuff {
  sourceId: string
  amount: number
}

export interface DefenderCard extends BaseCard {
  role: 'def'
  hp: number
  maxHp: number
  baseMaxHp?: number
  appliedHpBuffs?: AppliedHpBuff[]
}

export interface MidfielderCard extends BaseCard {
  role: 'mid'
  stamina: number
  maxStamina: number
  turnPlaced?: number
}

export interface ForwardCard extends BaseCard {
  role: 'fwd'
  atk: number
  status?: ForwardStatus
  jokerArmed?: boolean
  morphedFrom?: {
    hp: number
    maxHp: number
    perks: Perk[]
  }
}

export type Card = DefenderCard | MidfielderCard | ForwardCard

export type KeeperAbility =
  | { kind: 'random_save'; chance: number }
  | { kind: 'strip_buffs' }

export interface Keeper {
  id: string
  name: string
  save: number
  rarity?: Rarity
  abilities: KeeperAbility[]
  label?: string
  price?: number
}

export interface OpponentDeck {
  id: string
  name: string
  cards: Card[]
  keepers: Keeper[]
}

export interface MatchState {
  turn: number
  maxTurn: number
  actions: number
  maxActions: number

  oppName: string
  myKeeper: Keeper
  oppKeeper: Keeper

  myScore: number
  oppScore: number

  myDefenders: DefenderCard[]
  myMids: MidfielderCard[]
  myFwds: ForwardCard[]
  oppDefenders: DefenderCard[]
  oppMids: MidfielderCard[]
  oppFwds: ForwardCard[]

  hand: Card[]
  deck: Card[]
  discard: Card[]
  oppHand: Card[]
  oppDeck: Card[]
  oppDiscard: Card[]

  log: string[]
  gameOver: boolean
  phase: Phase
  firstTurn: boolean
  pendingSniper: PendingSniper | null
  pendingTauntGrant: PendingTauntGrant | null
  pendingDyingCaptainPlayer?: number
  pendingDyingCaptainOpp?: number
}

export interface PendingSniper {
  sourceId: string
}

export interface PendingTauntGrant {
  sourceId: string
}
