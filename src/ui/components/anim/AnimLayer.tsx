import { useEffect, useRef, useState, type RefObject } from 'react'
import { useMatchStore } from '../../../store/matchStore'
import { displayName } from '../../../data/player-real-names'
import type {
  AnimEvent,
  AttackAnimEvent,
  SniperKillAnimEvent,
} from '../../../game/anim/events'
import type { MatchState } from '../../../game/types'
import { Floater, type FloaterTone } from './Floater'
import { AttackArc } from './AttackArc'
import { CardImpact, type ImpactTone } from './CardImpact'
import { Killfeed, type KillfeedItem, type KillfeedTone } from './Killfeed'
import { getCardRect, type RelRect } from './layer'

interface Props {
  pitchRef: RefObject<HTMLDivElement | null>
  match: MatchState
}

type LiveFloater = { id: number; kind: 'floater'; rect: RelRect; text: string; tone: FloaterTone; size: 'sm' | 'lg'; offsetY: number }
type LiveArc = { id: number; kind: 'arc'; from: RelRect; to: RelRect; tone: 'attack' | 'sniper' }
type LiveImpact = { id: number; kind: 'impact'; rect: RelRect; tone: ImpactTone }
type LiveItem = LiveFloater | LiveArc | LiveImpact
type LiveSpec =
  | Omit<LiveFloater, 'id'>
  | Omit<LiveArc, 'id'>
  | Omit<LiveImpact, 'id'>

const ARC_TTL = 600
const IMPACT_TTL = 700
const FLOATER_TTL = 1100
const KILLFEED_TTL = 3500
const KILLFEED_MAX = 3

function nameForCard(match: MatchState, id: string | undefined): string | undefined {
  if (!id) return undefined
  if (match.myKeeper.id === id) return displayName(id, match.myKeeper.name)
  if (match.oppKeeper.id === id) return displayName(id, match.oppKeeper.name)
  for (const arr of [match.myDefenders, match.myMids, match.myFwds, match.oppDefenders, match.oppMids, match.oppFwds, match.discard, match.oppDiscard]) {
    const c = arr.find(x => x.id === id)
    if (c) return displayName(c.id, c.name)
  }
  return undefined
}

function formatAttackKillfeed(match: MatchState, event: AttackAnimEvent): { text: string; tone: KillfeedTone } {
  const src = nameForCard(match, event.sourceId) ?? '?'
  const sideMark = event.side === 'player' ? '' : '⚠ '
  if (event.goal) return { text: `${sideMark}⚽ ${src} забиває!`, tone: 'goal' }
  if (event.save) return { text: `${sideMark}🧤 ${src}: сейв`, tone: 'save' }
  if (event.defenderRemoved) {
    const tgt = nameForCard(match, event.targetCardId) ?? 'захисник'
    return { text: `${sideMark}${src} пробиває ${tgt}`, tone: 'attack' }
  }
  if (event.damage > 0) {
    const tgt = nameForCard(match, event.targetCardId) ?? 'захисник'
    return { text: `${sideMark}${src} → ${tgt} (-${event.damage})`, tone: 'attack' }
  }
  return { text: `${sideMark}${src} б'є на ${event.finalAtk}`, tone: 'attack' }
}

function formatSniperKillfeed(match: MatchState, event: SniperKillAnimEvent): { text: string; tone: KillfeedTone } {
  const src = nameForCard(match, event.sourceId) ?? '?'
  const tgt = nameForCard(match, event.targetId) ?? '?'
  return { text: `🎯 ${src} знесе ${tgt}!`, tone: 'sniper' }
}

export function AnimLayer({ pitchRef, match }: Props) {
  const animEvents = useMatchStore(s => s.animEvents)
  const consumeAnimEvent = useMatchStore(s => s.consumeAnimEvent)

  const [items, setItems] = useState<LiveItem[]>([])
  const [killfeed, setKillfeed] = useState<KillfeedItem[]>([])
  const [containerSize, setContainerSize] = useState({ w: 0, h: 0 })
  const itemIdRef = useRef(0)
  const seenIdsRef = useRef<Set<number>>(new Set())
  const timersRef = useRef<Set<ReturnType<typeof setTimeout>>>(new Set())

  // Track container size for arc viewBox
  useEffect(() => {
    const el = pitchRef.current
    if (!el) return
    const update = () => {
      const r = el.getBoundingClientRect()
      setContainerSize({ w: r.width, h: r.height })
    }
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [pitchRef])

  // Cleanup all timers on unmount
  useEffect(() => {
    return () => {
      for (const t of timersRef.current) clearTimeout(t)
      timersRef.current.clear()
    }
  }, [])

  useEffect(() => {
    const newOnes = animEvents.filter(qe => !seenIdsRef.current.has(qe.id))
    if (newOnes.length === 0) return

    const schedule = (fn: () => void, ms: number) => {
      const t = setTimeout(() => {
        timersRef.current.delete(t)
        fn()
      }, ms)
      timersRef.current.add(t)
    }

    const spawn = (item: LiveSpec, ttlMs: number) => {
      itemIdRef.current += 1
      const id = itemIdRef.current
      const live = { ...item, id } as LiveItem
      setItems(prev => [...prev, live])
      schedule(() => setItems(prev => prev.filter(i => i.id !== id)), ttlMs)
    }

    const pushKillfeed = (text: string, tone: KillfeedTone) => {
      itemIdRef.current += 1
      const id = itemIdRef.current
      setKillfeed(prev => [...prev, { id, text, tone }].slice(-KILLFEED_MAX))
      schedule(() => setKillfeed(prev => prev.filter(i => i.id !== id)), KILLFEED_TTL)
    }

    const processAttack = (event: AttackAnimEvent) => {
      const container = pitchRef.current
      if (!container) return
      const srcRect = getCardRect(container, event.sourceId)
      const targetId = event.targetCardId ?? event.targetKeeperId
      const tgtRect = getCardRect(container, targetId)

      if (srcRect && tgtRect) {
        spawn({ kind: 'arc', from: srcRect, to: tgtRect, tone: 'attack' }, ARC_TTL)
      }

      schedule(() => {
        const stillContainer = pitchRef.current
        if (!stillContainer) return
        const fresh = getCardRect(stillContainer, targetId) ?? tgtRect
        if (!fresh) return
        if (event.goal) {
          spawn({ kind: 'impact', rect: fresh, tone: 'damage' }, IMPACT_TTL)
          spawn({ kind: 'floater', rect: fresh, text: '⚽ ГОЛ', tone: 'goal', size: 'lg', offsetY: 0 }, FLOATER_TTL)
        } else if (event.save) {
          spawn({ kind: 'impact', rect: fresh, tone: 'save' }, IMPACT_TTL)
          spawn({ kind: 'floater', rect: fresh, text: '🧤 SAVE', tone: 'save', size: 'lg', offsetY: 0 }, FLOATER_TTL)
        } else if (event.damage > 0) {
          spawn({ kind: 'impact', rect: fresh, tone: 'damage' }, IMPACT_TTL)
          spawn({ kind: 'floater', rect: fresh, text: `−${event.damage}`, tone: 'damage', size: 'lg', offsetY: 0 }, FLOATER_TTL)
        }
        if (event.buffsStripped > 0) {
          spawn(
            { kind: 'floater', rect: fresh, text: `−${event.buffsStripped} aura`, tone: 'strip', size: 'sm', offsetY: 22 },
            FLOATER_TTL,
          )
        }
      }, 220)
    }

    const processSniper = (event: SniperKillAnimEvent) => {
      const container = pitchRef.current
      if (!container) return
      const srcRect = getCardRect(container, event.sourceId)
      const tgtRect = getCardRect(container, event.targetId)

      if (srcRect && tgtRect) {
        spawn({ kind: 'arc', from: srcRect, to: tgtRect, tone: 'sniper' }, ARC_TTL)
      }
      schedule(() => {
        const stillContainer = pitchRef.current
        if (!stillContainer) return
        const fresh = getCardRect(stillContainer, event.targetId) ?? tgtRect
        if (!fresh) return
        spawn({ kind: 'impact', rect: fresh, tone: 'sniper' }, IMPACT_TTL)
        spawn({ kind: 'floater', rect: fresh, text: '💀', tone: 'sniper', size: 'lg', offsetY: 0 }, FLOATER_TTL)
      }, 220)
    }

    const processEvent = (event: AnimEvent) => {
      switch (event.kind) {
        case 'attack': {
          processAttack(event)
          const kf = formatAttackKillfeed(match, event)
          pushKillfeed(kf.text, kf.tone)
          break
        }
        case 'sniper_kill': {
          processSniper(event)
          const kf = formatSniperKillfeed(match, event)
          pushKillfeed(kf.text, kf.tone)
          break
        }
        case 'placement_buff':
        case 'dying_captain':
          break
      }
    }

    for (const queued of newOnes) {
      seenIdsRef.current.add(queued.id)
      processEvent(queued.event)
      consumeAnimEvent(queued.id)
    }
  }, [animEvents, match, pitchRef, consumeAnimEvent])

  return (
    <div className="pointer-events-none absolute inset-0 z-20">
      <Killfeed items={killfeed} />
      {items.map(item => {
        if (item.kind === 'floater') {
          return (
            <Floater
              key={item.id}
              rect={item.rect}
              text={item.text}
              tone={item.tone}
              size={item.size}
              offsetY={item.offsetY}
            />
          )
        }
        if (item.kind === 'arc') {
          return (
            <AttackArc
              key={item.id}
              from={item.from}
              to={item.to}
              tone={item.tone}
              containerWidth={containerSize.w}
              containerHeight={containerSize.h}
            />
          )
        }
        return <CardImpact key={item.id} rect={item.rect} tone={item.tone} />
      })}
    </div>
  )
}
