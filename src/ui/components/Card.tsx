import { useEffect, useState } from 'react'
import { motion } from 'motion/react'
import type { Card as CardData, Rarity } from '../../game/types'
import type { Perk } from '../../game/perks/types'
import { avatarUrl } from '../lib/avatar'
import { fetchWikiPhoto, getCachedWikiPhoto } from '../lib/wiki-photo'
import { REAL_PLAYERS, displayName, surname } from '../../data/player-real-names'
import { FlagImg } from './FlagImg'

function parsePerkLabel(label: string): { name?: string; desc: string } {
  const colonIdx = label.indexOf(':')
  const dashIdx = label.indexOf('—')
  let sepIdx = -1
  if (colonIdx >= 0 && dashIdx >= 0) sepIdx = Math.min(colonIdx, dashIdx)
  else if (colonIdx >= 0) sepIdx = colonIdx
  else if (dashIdx >= 0) sepIdx = dashIdx
  if (sepIdx < 0) return { desc: label }
  const before = label.slice(0, sepIdx).trim()
  const after = label.slice(sepIdx + 1).trim()
  if (!before) return { desc: after || label }
  const lettersOnly = before.replace(/[^А-ЯЇІЄҐA-Zа-яїієґa-z]/g, '')
  if (lettersOnly.length === 0) return { desc: label }
  const upper = (before.match(/[А-ЯЇІЄҐA-Z]/g) ?? []).length
  if (upper / lettersOnly.length < 0.6) return { desc: label }
  return { name: before, desc: after }
}

function isSimpleAtkToFwds(perk: Perk): boolean {
  return (
    perk.effect.kind === 'atk_buff' &&
    perk.effect.scope === 'all_my_fwds' &&
    !perk.effect.condition &&
    !parsePerkLabel(perk.label).name
  )
}

function isSimpleHpToDefs(perk: Perk): boolean {
  return (
    perk.effect.kind === 'hp_buff' &&
    perk.effect.scope === 'other_defs' &&
    !perk.effect.condition &&
    !parsePerkLabel(perk.label).name
  )
}

function tagFor(perk: Perk): { label: string; full: string } {
  const full = perk.label
  if (perk.effect.kind === 'keeper_save_reducer') {
    return { label: `−${perk.effect.amount} SAVE`, full }
  }
  if (isSimpleAtkToFwds(perk) && perk.effect.kind === 'atk_buff') {
    return { label: `+${perk.effect.amount} ATK`, full }
  }
  if (isSimpleHpToDefs(perk) && perk.effect.kind === 'hp_buff') {
    return { label: `+${perk.effect.amount} DEF`, full }
  }
  const parsed = parsePerkLabel(full)
  if (parsed.name) return { label: parsed.name, full }
  const firstWords = full.split(/\s+/).slice(0, 2).join(' ')
  return { label: firstWords, full }
}

function PerkTag({ perk }: { perk: Perk }) {
  const { label, full } = tagFor(perk)
  return (
    <span
      title={full}
      className="rounded bg-black/15 px-1.5 py-[2px] text-[9px] font-bold uppercase tracking-wide leading-none"
    >
      {label}
    </span>
  )
}

function PerkLine({ perk }: { perk: Perk }) {
  const parsed = parsePerkLabel(perk.label)
  if (!parsed.name) {
    return <div className="text-[10px] leading-tight opacity-85">{parsed.desc}</div>
  }
  return (
    <div className="leading-tight">
      <span className="text-[9px] font-bold uppercase tracking-wide">{parsed.name}</span>
      {parsed.desc && (
        <>
          <span className="text-[10px] opacity-85">: </span>
          <span className="text-[10px] opacity-85">{parsed.desc}</span>
        </>
      )}
    </div>
  )
}

interface Props {
  card: CardData
  showCost?: boolean
  affordable?: boolean
  ready?: boolean
  targetable?: boolean
  dimmed?: boolean
  onClick?: () => void
  layoutId?: string
  effectiveAtk?: number
  footer?: React.ReactNode
}

interface RaritySkin {
  box: string
  cost: string
  avatarBorder: string
  glow: string
  label: string
}

const RARITY_SKINS: Record<Rarity, RaritySkin> = {
  bronze: {
    box: 'bg-orange-100 border-orange-800 text-orange-950',
    cost: 'bg-orange-800 text-white',
    avatarBorder: 'border-orange-800',
    glow: '',
    label: 'Бронза',
  },
  silver: {
    box: 'bg-slate-200 border-slate-500 text-slate-900',
    cost: 'bg-slate-600 text-white',
    avatarBorder: 'border-slate-500',
    glow: '',
    label: 'Срібло',
  },
  gold: {
    box: 'border-yellow-600 text-yellow-950 bg-gradient-to-br from-yellow-100 via-amber-100 to-yellow-200',
    cost: 'bg-yellow-600 text-white',
    avatarBorder: 'border-yellow-600',
    glow: 'shadow-[0_0_14px_rgba(234,179,8,0.65)]',
    label: 'Золото',
  },
  legend: {
    box: 'border-purple-500 text-purple-950 bg-gradient-to-br from-purple-100 via-fuchsia-50 to-purple-100',
    cost: 'bg-purple-600 text-white',
    avatarBorder: 'border-purple-500',
    glow: 'shadow-[0_0_14px_rgba(168,85,247,0.55)]',
    label: 'Легенда',
  },
}

const FALLBACK_SKIN: RaritySkin = {
  box: 'bg-stone-50 border-stone-400 text-stone-900',
  cost: 'bg-stone-500 text-white',
  avatarBorder: 'border-stone-400',
  glow: '',
  label: '',
}

const ROLE_BADGE: Record<CardData['role'], string> = {
  def: 'bg-blue-700 text-white',
  mid: 'bg-amber-700 text-white',
  fwd: 'bg-red-700 text-white',
}

const ROLE_LABEL: Record<CardData['role'], string> = { def: 'DEF', mid: 'MID', fwd: 'FWD' }

function upgradeCountFor(card: CardData, stat: 'atk' | 'hp' | 'stamina'): number {
  return (card.upgrades ?? [])
    .filter(u => u.stat === stat)
    .reduce((s, u) => s + u.amount, 0)
}

function statText(
  card: CardData,
  effectiveAtk?: number,
): {
  primary: string
  status?: '⏳' | '⚡'
  tone: 'normal' | 'buffed' | 'debuffed'
  upgradedCount: number
} {
  if (card.role === 'def') {
    const base = card.baseMaxHp ?? card.maxHp
    const tone = card.maxHp > base ? 'buffed' : card.maxHp < base ? 'debuffed' : 'normal'
    return {
      primary: `${card.hp}/${card.maxHp} DEF`,
      tone,
      upgradedCount: upgradeCountFor(card, 'hp'),
    }
  }
  if (card.role === 'mid') {
    return {
      primary: `${card.stamina}/${card.maxStamina} STM`,
      tone: 'normal',
      upgradedCount: upgradeCountFor(card, 'stamina'),
    }
  }
  const baseAtk = card.atk
  const eff = effectiveAtk ?? baseAtk
  const tone = eff > baseAtk ? 'buffed' : eff < baseAtk ? 'debuffed' : 'normal'
  const result: {
    primary: string
    status?: '⏳' | '⚡'
    tone: 'normal' | 'buffed' | 'debuffed'
    upgradedCount: number
  } = {
    primary: `${eff} ATK`,
    tone,
    upgradedCount: upgradeCountFor(card, 'atk'),
  }
  if (card.status === 'attacking_next') result.status = '⏳'
  else if (card.status === 'ready_to_attack') result.status = '⚡'
  return result
}

const TONE_COLOR: Record<'normal' | 'buffed' | 'debuffed', string> = {
  normal: '',
  buffed: 'text-emerald-700 font-bold',
  debuffed: 'text-red-700 font-bold',
}

export function Card({
  card,
  showCost = false,
  affordable = true,
  ready = false,
  targetable = false,
  dimmed = false,
  onClick,
  layoutId,
  effectiveAtk,
  footer,
}: Props) {
  const skin: RaritySkin = card.rarity ? RARITY_SKINS[card.rarity] : FALLBACK_SKIN

  const outline = ''
  const targetOpacity = !affordable ? 0.45 : dimmed ? 0.5 : 1
  const cursor = onClick ? 'cursor-pointer' : 'cursor-default'

  const widthClass = 'w-[150px]'
  const avatarSize = 44
  const stat = statText(card, effectiveAtk)
  const statColor = TONE_COLOR[stat.tone]
  const isForwardDef = card.role === 'def' && card.perks.some(
    p => p.trigger === 'aura' && p.effect.kind === 'forward_defender',
  )
  const isInvuln = card.perks.some(p => p.effect.kind === 'invulnerable')

  const realName = REAL_PLAYERS[card.id]
  const [photoUrl, setPhotoUrl] = useState<string | null>(() => {
    if (!realName) return null
    const cached = getCachedWikiPhoto(realName)
    return cached === undefined ? null : cached
  })
  const [photoFailed, setPhotoFailed] = useState(false)

  useEffect(() => {
    if (!realName) return
    if (photoUrl) return
    let cancelled = false
    fetchWikiPhoto(realName).then(url => {
      if (!cancelled && url) setPhotoUrl(url)
    })
    return () => {
      cancelled = true
    }
  }, [realName, photoUrl])

  const useWikiPhoto = !!(photoUrl && !photoFailed)
  const finalAvatarSrc = useWikiPhoto ? photoUrl : avatarUrl(card)

  return (
    <motion.div
      layout
      layoutId={layoutId}
      initial={{ opacity: 0, scale: 0.85, y: -8 }}
      animate={{ opacity: targetOpacity, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.85, transition: { duration: 0.22 } }}
      transition={{ type: 'spring', stiffness: 260, damping: 30, mass: 0.9 }}
      whileTap={onClick ? { scale: 0.96 } : undefined}
      onClick={onClick}
      title={skin.label || undefined}
      data-card-id={card.id}
      className={`relative ${widthClass} min-h-[170px] rounded-lg border ${skin.box} ${outline} ${cursor} flex h-full flex-col select-none p-2 shadow-sm ${skin.glow}`}
    >
      {ready && (
        <motion.div
          aria-hidden
          className="pointer-events-none absolute -inset-0.5 rounded-lg"
          animate={{
            boxShadow: [
              '0 0 0 2px rgba(34,197,94,0.95)',
              '0 0 0 8px rgba(34,197,94,0)',
              '0 0 0 2px rgba(34,197,94,0.95)',
            ],
          }}
          transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
        />
      )}
      {targetable && (
        <motion.div
          aria-hidden
          className="pointer-events-none absolute -inset-0.5 rounded-lg"
          animate={{
            boxShadow: [
              '0 0 0 2px rgba(220,38,38,0.95)',
              '0 0 0 6px rgba(220,38,38,0.2)',
              '0 0 0 2px rgba(220,38,38,0.95)',
            ],
          }}
          transition={{ duration: 1, repeat: Infinity, ease: 'easeInOut' }}
        />
      )}
      {!ready && !targetable && card.perks.some(p => p.trigger === 'aura') && (
        <motion.div
          aria-hidden
          className="pointer-events-none absolute -inset-0.5 rounded-lg"
          animate={{
            boxShadow: [
              '0 0 0 0 rgba(234,179,8,0)',
              '0 0 12px 1px rgba(234,179,8,0.30)',
              '0 0 0 0 rgba(234,179,8,0)',
            ],
          }}
          transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut' }}
        />
      )}
      {showCost && card.cost > 0 && (
        <div
          className={`absolute -right-1.5 -top-1.5 flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-semibold shadow ${skin.cost}`}
        >
          {card.cost}
        </div>
      )}
      {isForwardDef && (
        <div
          title="ВИСУНУТИЙ ЗАХИСНИК"
          className="absolute -left-1.5 -top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-stone-800 text-[14px] shadow ring-2 ring-white/60"
        >
          🛡
        </div>
      )}
      {isInvuln && (
        <div
          title="НЕВРАЗЛИВИЙ"
          className="absolute -left-1.5 -top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-yellow-400 to-amber-600 text-[14px] shadow ring-2 ring-white/80"
        >
          ✨
        </div>
      )}

      <div className="flex items-start gap-2">
        <img
          src={finalAvatarSrc}
          alt=""
          width={avatarSize}
          height={avatarSize}
          loading="lazy"
          onError={() => setPhotoFailed(true)}
          className={`flex-shrink-0 rounded-md border object-cover ${skin.avatarBorder} bg-white`}
          style={{
            width: avatarSize,
            height: avatarSize,
            objectPosition: useWikiPhoto ? 'center 20%' : 'center',
          }}
        />
        <div className="min-w-0 flex-1">
          <div
            className="truncate font-medium leading-tight text-[12px]"
            title={displayName(card.id, card.name)}
          >
            {surname(card.id, card.name)}
          </div>
          <div className="mt-0.5 flex items-baseline gap-1">
            <span
              className={`font-medium text-[13px] ${statColor} ${
                stat.upgradedCount > 0 && stat.tone === 'normal' ? 'text-amber-600' : ''
              }`}
            >
              {stat.primary}
              {stat.upgradedCount > 0 && (
                <span className="ml-0.5 text-amber-500" title={`Підвищено ${stat.upgradedCount}× (Гравець матчу)`}>
                  {'★'.repeat(stat.upgradedCount)}
                </span>
              )}
            </span>
            {stat.status && <span className="text-sm leading-none">{stat.status}</span>}
          </div>
          <div className="mt-1 flex items-center gap-1">
            <span className={`rounded px-1 text-[9px] font-medium ${ROLE_BADGE[card.role]}`}>
              {ROLE_LABEL[card.role]}
            </span>
          </div>
        </div>
      </div>

      {card.perks.length > 0 && (() => {
        const isTagged = (p: Perk) =>
          !!parsePerkLabel(p.label).name ||
          isSimpleAtkToFwds(p) ||
          isSimpleHpToDefs(p)
        const descs = card.perks.filter(p => !isTagged(p))
        const namedPerks = card.perks.filter(isTagged)
        return (
          <div className="mt-1.5 space-y-1 border-t border-current/15 pt-1.5">
            {descs.length > 0 && (
              <div className="space-y-0.5">
                {descs.map((p, i) => <PerkLine key={`b${i}`} perk={p} />)}
              </div>
            )}
            {namedPerks.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {namedPerks.map((p, i) => <PerkTag key={`p${i}`} perk={p} />)}
              </div>
            )}
          </div>
        )
      })()}
      <div
        className={`mt-auto flex flex-col gap-1.5 pt-1.5 ${
          card.perks.length === 0 ? 'border-t border-current/15' : ''
        }`}
      >
        <div className="flex items-center justify-end">
          <FlagImg cardId={card.id} />
        </div>
        {footer && <div>{footer}</div>}
      </div>
    </motion.div>
  )
}
