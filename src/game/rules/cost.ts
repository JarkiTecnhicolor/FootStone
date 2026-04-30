import type { Card } from '../types'

export function canAfford(actions: number, card: Card): boolean {
  return actions >= card.cost
}

export function payCost(actions: number, card: Card): number {
  return actions - card.cost
}
