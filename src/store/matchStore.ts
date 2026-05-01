import { create } from 'zustand'
import type { MatchState, OpponentDeck } from '../game/types'
import { hasBypass, type AttackTarget } from '../game/rules/combat'
import type { SniperTargetSelection } from '../game/perks/dispatch'
import {
  makeFreshMatch,
  playPlayerCard,
  resolvePendingSniper,
  attackWithForward,
  activateMorph,
  nextPlayerAutoAttack,
  finalizePlayerTurn,
  startOpponentTurn,
  resolveOneOpponentForward,
  tryOppMorph,
  advanceTurn,
} from '../game/match'
import { pickAndPlaceOneOppCard } from '../game/ai/simple'
import { PLAYER_DECK } from '../game/cards/player-deck'
import { PLAYER_KEEPERS } from '../game/keepers/player-keepers'
import { SHAKHTAR } from '../game/cards/opponents/shakhtar'
import { makeRandomOpponent } from '../game/cards/opponents/random'

const delay = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms))

interface Store {
  match: MatchState | null
  targetingFwdId: string | null
  undoStack: MatchState[]
  turnStartSnapshot: MatchState | null

  startMatch: (opp?: OpponentDeck) => void
  startQuickMatch: (kind: 'shakhtar' | 'random') => void
  resetMatch: () => void
  playCard: (handIdx: number) => void
  beginFwdTargeting: (fwdId: string) => void
  selectAttackTarget: (target: AttackTarget) => void
  cancelTargeting: () => void
  selectSniperTarget: (target: SniperTargetSelection) => void
  activateCardPerk: (cardId: string) => void
  undo: () => void
  resetTurn: () => void
  endTurn: () => Promise<void>
}

function pushUndo(stack: MatchState[], state: MatchState): MatchState[] {
  const next = [...stack, state]
  if (next.length > 30) next.shift()
  return next
}

export const useMatchStore = create<Store>((set, get) => ({
  match: null,
  targetingFwdId: null,
  undoStack: [],
  turnStartSnapshot: null,

  startMatch: (opp = SHAKHTAR) => {
    const fresh = makeFreshMatch(PLAYER_DECK, PLAYER_KEEPERS, opp)
    set({ match: fresh, targetingFwdId: null, undoStack: [], turnStartSnapshot: fresh })
  },
  startQuickMatch: (kind) => {
    const opp =
      kind === 'random' ? makeRandomOpponent(PLAYER_DECK, PLAYER_KEEPERS) : SHAKHTAR
    const fresh = makeFreshMatch(PLAYER_DECK, PLAYER_KEEPERS, opp)
    set({ match: fresh, targetingFwdId: null, undoStack: [], turnStartSnapshot: fresh })
  },
  resetMatch: () =>
    set({ match: null, targetingFwdId: null, undoStack: [], turnStartSnapshot: null }),

  playCard: (handIdx) => {
    const { match, undoStack } = get()
    if (!match) return
    const r = playPlayerCard(match, handIdx)
    if (r.ok) {
      set({ match: r.state, targetingFwdId: null, undoStack: pushUndo(undoStack, match) })
    }
  },

  beginFwdTargeting: (fwdId) => {
    const { match, undoStack } = get()
    if (!match || match.phase !== 'player' || match.pendingSniper) return
    const fwd = match.myFwds.find(f => f.id === fwdId)
    if (!fwd || fwd.status !== 'ready_to_attack') return
    if (hasBypass(fwd) || match.oppDefenders.length === 0) {
      const r = attackWithForward(match, fwdId, { kind: 'keeper' })
      if (r.ok) {
        set({ match: r.state, targetingFwdId: null, undoStack: pushUndo(undoStack, match) })
      }
      return
    }
    set({ targetingFwdId: fwdId })
  },

  selectAttackTarget: (target) => {
    const { match, targetingFwdId, undoStack } = get()
    if (!match || !targetingFwdId) return
    const r = attackWithForward(match, targetingFwdId, target)
    if (r.ok) {
      set({ match: r.state, targetingFwdId: null, undoStack: pushUndo(undoStack, match) })
    }
  },

  cancelTargeting: () => {
    const { match, targetingFwdId } = get()
    if (match?.pendingSniper) {
      get().undo()
      return
    }
    if (targetingFwdId) set({ targetingFwdId: null })
  },

  selectSniperTarget: (target) => {
    const { match, undoStack } = get()
    if (!match) return
    const r = resolvePendingSniper(match, target)
    if (r.ok) {
      set({ match: r.state, undoStack: pushUndo(undoStack, match) })
    }
  },

  activateCardPerk: (cardId) => {
    const { match, undoStack } = get()
    if (!match) return
    const r = activateMorph(match, cardId)
    if (r.ok) {
      set({ match: r.state, undoStack: pushUndo(undoStack, match), targetingFwdId: null })
    }
  },

  undo: () => {
    const { undoStack } = get()
    if (undoStack.length === 0) return
    const previous = undoStack[undoStack.length - 1]
    set({
      match: previous,
      undoStack: undoStack.slice(0, -1),
      targetingFwdId: null,
    })
  },

  resetTurn: () => {
    const { turnStartSnapshot } = get()
    if (!turnStartSnapshot) return
    set({ match: turnStartSnapshot, undoStack: [], targetingFwdId: null })
  },

  endTurn: async () => {
    let { match } = get()
    if (!match || match.phase !== 'player' || match.pendingSniper || match.gameOver) return

    set({ targetingFwdId: null, undoStack: [], turnStartSnapshot: null })

    for (let i = 0; i < 10; i++) {
      const r = nextPlayerAutoAttack(match)
      if (r.done) break
      match = r.state
      set({ match })
      await delay(650)
    }

    match = finalizePlayerTurn(match)
    set({ match })
    await delay(400)

    match = startOpponentTurn(match)
    set({ match })
    await delay(350)

    let oppActions = match.maxActions
    for (let i = 0; i < 20; i++) {
      const r = pickAndPlaceOneOppCard(match, oppActions)
      if (r.done) break
      match = r.state
      oppActions = r.remainingActions
      set({ match })
      await delay(700)
    }

    const morphed = tryOppMorph(match)
    if (morphed !== match) {
      match = morphed
      set({ match })
      await delay(500)
    }

    if (match.oppFwds.some(f => f.status === 'ready_to_attack')) {
      await delay(300)
    }

    for (let i = 0; i < 10; i++) {
      const r = resolveOneOpponentForward(match)
      if (r.done) break
      match = r.state
      set({ match })
      await delay(750)
    }

    await delay(300)
    match = advanceTurn(match)
    set({ match, turnStartSnapshot: match.gameOver ? null : match })
  },
}))
