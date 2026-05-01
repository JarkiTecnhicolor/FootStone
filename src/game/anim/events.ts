export type AnimEventKind =
  | 'attack'
  | 'sniper_kill'
  | 'placement_buff'
  | 'dying_captain'

export interface AttackAnimEvent {
  kind: 'attack'
  side: 'player' | 'opp'
  sourceId: string
  targetCardId?: string
  targetKeeperId?: string
  finalAtk: number
  damage: number
  defenderRemoved: boolean
  reachedKeeper: boolean
  save: boolean
  goal: boolean
  buffsStripped: number
  bypass: boolean
}

export interface SniperKillAnimEvent {
  kind: 'sniper_kill'
  side: 'player' | 'opp'
  sourceId: string
  targetId: string
}

export interface PlacementBuffAnimEvent {
  kind: 'placement_buff'
  side: 'player' | 'opp'
  sourceId: string
  targetIds: string[]
  amount: number
  reason: 'captain' | 'self' | 'synergy'
}

export interface DyingCaptainAnimEvent {
  kind: 'dying_captain'
  side: 'player' | 'opp'
  sourceCardId: string
  summonedId: string
}

export type AnimEvent =
  | AttackAnimEvent
  | SniperKillAnimEvent
  | PlacementBuffAnimEvent
  | DyingCaptainAnimEvent
